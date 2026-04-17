"""
api/v1/rider.py
Rider management endpoints — registration, GPS updates, DPDT recalculation.
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.session import get_db
from database import crud
from database.models import Rider
from core.dpdt_tracker import recalculate_dpdt_for_rider

router = APIRouter(prefix="/api/v1/riders", tags=["Riders"])


# ──────────────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────────────

from typing import Optional

class RiderCreate(BaseModel):
    name         : str   = Field(..., example="Arjun Kumar")
    phone        : str   = Field(..., example="9876543210")
    hub_name     : Optional[str] = Field(None, example="Zepto Hub - Koramangala")
    zone_category: Optional[str] = Field(None, example="ORANGE")   # Auto-detected if omitted
    zone_risk    : float = Field(0.55, ge=0.0, le=1.0)
    lat          : float = Field(..., example=12.9352)
    lon          : float = Field(..., example=77.6245)
    dpdt         : float = Field(100.0, ge=0.0, le=100.0)


class GPSUpdate(BaseModel):
    lat: float = Field(..., example=12.9351)
    lon: float = Field(..., example=77.6246)


class WageUpsert(BaseModel):
    day_of_week  : int   = Field(..., ge=0, le=6, example=4)   # 0=Mon
    hour_bucket  : int   = Field(..., ge=0, le=23, example=20)
    avg_wage_inr : float = Field(..., gt=0, example=150.0)


# ──────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED,
             summary="Register a new Q-Commerce rider")
def register_rider(payload: RiderCreate, db: Session = Depends(get_db)):
    """Onboard a new rider and create their profile in the DB."""
    if crud.get_rider_by_phone(db, payload.phone):
        raise HTTPException(400, detail="Phone number already registered")

    # Use Machine Learning Classification Model to dynamically map rider to closest Dark Store Hub
    from ml_pipelines.model_0_zone_mapper import predict_dark_store
    active_stores = crud.get_all_dark_stores(db)
    
    predicted_hub = predict_dark_store(payload.lat, payload.lon, active_stores)
    
    # Inherit dark store details or fallback
    if predicted_hub:
        detected_hub_name = predicted_hub.name
        detected_zone = predicted_hub.current_zone
    else:
        detected_hub_name = payload.hub_name or "Default Hub"
        # Fallback to Model 1's logic if no Dark Stores exist
        from ml_pipelines.model_1_premium import _classify_zone
        detected_zone = _classify_zone(
            historical_zone_risk_score=payload.zone_risk,
            combined_predictive_risk=0.0
        )

    rider = crud.create_rider(
        db,
        name          = payload.name,
        phone         = payload.phone,
        hub_name      = detected_hub_name,
        zone_category = detected_zone,
        zone_risk     = payload.zone_risk,
        lat           = payload.lat,
        lon           = payload.lon,
        dpdt          = payload.dpdt,
    )
    return {
        "id":           rider.id,
        "name":         rider.name,
        "phone":        rider.phone,
        "hub_name":     rider.hub_name,
        "zone_category":rider.zone_category,
        "zone_risk":    rider.zone_risk,
        "dpdt":         rider.dpdt,
        "lat":          rider.lat,
        "lon":          rider.lon,
        "created_at":   rider.created_at.isoformat(),
    }


@router.get("/closest-hub", summary="Preview closest dark store for a coordinate")
def get_closest_hub(lat: float, lon: float, db: Session = Depends(get_db)):
    from ml_pipelines.model_0_zone_mapper import predict_dark_store
    active_stores = crud.get_all_dark_stores(db)
    predicted_hub = predict_dark_store(lat, lon, active_stores)
    
    if not predicted_hub:
        return {"hub_name": "Unknown", "current_zone": "GREEN", "distance_km": None}
        
    from core.geospatial import haversine
    dist = haversine(lat, lon, predicted_hub.lat, predicted_hub.lon)
        
    return {
        "hub_name": predicted_hub.name,
        "current_zone": predicted_hub.current_zone,
        "lat": predicted_hub.lat,
        "lon": predicted_hub.lon,
        "distance_km": round(dist, 2)
    }


@router.get("/login/{phone}", summary="Search for a rider by phone number for login")
def login_lookup(phone: str, db: Session = Depends(get_db)):
    # Standardize phone number for lookup (strip non-digits)
    clean_phone = "".join(filter(str.isdigit, phone))
    last_10 = clean_phone[-10:] if len(clean_phone) >= 10 else clean_phone
    
    print(f"DEBUG: Login lookup for phone='{phone}' (Clean: '{clean_phone}', Last10: '{last_10}')")
    
    # Use a case-insensitive, fuzzy match for maximum reliability
    # This matches any phone number that contains the last 10 digits entered
    rider = db.query(Rider).filter(Rider.phone.like(f"%{last_10}")).first()
    
    if not rider:
        print(f"DEBUG: No rider found for {last_10}")
        return {"found": False}
        
    print(f"DEBUG: Found rider {rider.name} (ID: {rider.id})")
    return {"found": True, "rider": _rider_resp(rider)}


@router.get("/", summary="List all active riders")
def list_riders(db: Session = Depends(get_db)):
    riders = crud.get_all_riders(db)
    return [_rider_resp(r) for r in riders]


@router.get("/{rider_id}", summary="Get a single rider by ID")
def get_rider(rider_id: int, db: Session = Depends(get_db)):
    rider = crud.get_rider(db, rider_id)
    if not rider:
        raise HTTPException(404, detail="Rider not found")
        
    # FORCE REFRESH: Inherit nearest dark store's dynamic color
    if rider.lat and rider.lon:
        from ml_pipelines.model_0_zone_mapper import predict_dark_store
        active_stores = crud.get_all_dark_stores(db)
        hub = predict_dark_store(rider.lat, rider.lon, active_stores)
        if hub:
            rider.hub_name = hub.name
            rider.zone_category = hub.current_zone
            db.commit()

    return _rider_resp(rider)


@router.put("/{rider_id}/gps", summary="Update rider GPS location")
def update_gps(rider_id: int, payload: GPSUpdate, db: Session = Depends(get_db)):
    rider = crud.update_rider_gps(db, rider_id, payload.lat, payload.lon)
    if not rider:
        raise HTTPException(404, detail="Rider not found")
        
    # Dynamically re-classify the zone based on live location using ML Classifier
    from ml_pipelines.model_0_zone_mapper import predict_dark_store
    active_stores = crud.get_all_dark_stores(db)
    predicted_hub = predict_dark_store(payload.lat, payload.lon, active_stores)
    
    if predicted_hub:
        rider.hub_name = predicted_hub.name
        # Inherit dynamic zone color (could have been changed by a recent flood)
        rider.zone_category = predicted_hub.current_zone
        db.commit()
        
    # Also log the ping
    crud.log_gps(db, rider_id, payload.lat, payload.lon)
    return {
        "rider_id": rider_id,
        "lat": rider.lat,
        "lon": rider.lon,
        "hub_name": rider.hub_name,
        "zone_category": rider.zone_category,
        "status": "updated"
    }


@router.put("/{rider_id}/wage", summary="Upsert historical hourly wage for a time slot")
def upsert_wage(rider_id: int, payload: WageUpsert, db: Session = Depends(get_db)):
    if not crud.get_rider(db, rider_id):
        raise HTTPException(404, detail="Rider not found")
    entry = crud.upsert_wage(db, rider_id, payload.day_of_week,
                             payload.hour_bucket, payload.avg_wage_inr)
    return {
        "rider_id":     rider_id,
        "day_of_week":  entry.day_of_week,
        "hour_bucket":  entry.hour_bucket,
        "avg_wage_inr": entry.avg_wage_inr,
        "samples":      entry.sample_count,
    }


@router.post("/{rider_id}/recalculate-dpdt",
             summary="Manually trigger DPDT recalculation for a rider")
def recalculate_dpdt(rider_id: int, db: Session = Depends(get_db)):
    if not crud.get_rider(db, rider_id):
        raise HTTPException(404, detail="Rider not found")
    new_dpdt = recalculate_dpdt_for_rider(db, rider_id)
    return {"rider_id": rider_id, "dpdt_pct": new_dpdt}


@router.get("/{rider_id}/claims", summary="Get claim history for a rider")
def get_rider_claims(rider_id: int, db: Session = Depends(get_db)):
    if not crud.get_rider(db, rider_id):
        raise HTTPException(404, detail="Rider not found")
    claims = crud.get_claims_for_rider(db, rider_id)
    return [_claim_resp(c) for c in claims]


# ── Private helpers ─────────────────────────────────────────────────────────

def _rider_resp(r):
    try:
        return {
            "id":             int(r.id),
            "name":           str(r.name),
            "phone":          str(r.phone),
            "hub_name":       str(r.hub_name),
            "zone_category":  str(r.zone_category),
            "zone_risk":      float(r.zone_risk),
            "dpdt":           float(r.dpdt),
            "lat":            float(r.lat) if r.lat is not None else None,
            "lon":            float(r.lon) if r.lon is not None else None,
            "account_age_h":  float(r.account_age_hours),
            "is_active":      bool(r.is_active),
            "is_flagged":     bool(r.is_flagged),
            "created_at":     r.created_at.isoformat() if r.created_at else None,
        }
    except Exception as e:
        # Fallback to avoid 500 errors during login lookups
        return {"id": r.id, "name": r.name, "phone": r.phone, "error": str(e)}


def _claim_resp(c):
    return {
        "id":            c.id,
        "status":        c.status,
        "payout_inr":    c.payout_amount,
        "fraud_score":   c.fraud_score,
        "coverage_pct":  c.coverage_pct,
        "distance_km":   c.distance_km,
        "reason":        c.reason,
        "created_at":    c.created_at.isoformat() if c.created_at else None,
    }