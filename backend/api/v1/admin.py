from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database.session import get_db
from database import crud
from database.models import DarkStore, Rider, ClaimLedger, TriggerEvent
from pydantic import BaseModel
import csv
import io
import os
import razorpay
from dotenv import load_dotenv

load_dotenv()

# Initialize Razorpay
try:
    client = razorpay.Client(auth=(os.getenv("RAZORPAY_KEY_ID"), os.getenv("RAZORPAY_KEY_SECRET")))
except Exception as e:
    print(f"Razorpay Client Init Error: {e}")
    client = None

router = APIRouter(prefix="/api/v1/admin", tags=["Admin Control Panel"])

from math import radians, cos, sin, asin, sqrt

class ZoneUpdate(BaseModel):
    new_zone: str

class PayoutRequest(BaseModel):
    hub_name: str
    trigger_type: str
    rider_id: int = None
    duration: float = 3.0
    severity: float = 1.0

def haversine_distance(lat1, lon1, lat2, lon2):
    # Calculates the distance in km between two GPS points
    R = 6371 
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    return R * c

@router.get("/analytics/predictive")
def get_predictive_analytics(db: Session = Depends(get_db)):
    """GuideWire Analytics: Returns ML-driven forecasts for dark stores."""
    try:
        from ml_pipelines.guidewire_service import predict_dark_store_insights
        stores = db.query(DarkStore).all()
        if not stores:
            return []
        insights = predict_dark_store_insights(stores)
        return insights
    except Exception as e:
        import traceback
        error_log = traceback.format_exc()
        print(error_log)
        return [{"error": str(e), "trace": error_log}]

@router.get("/summary")
def get_admin_summary(db: Session = Depends(get_db)):
    """High-level system overview for the admin dashboard."""
    from sqlalchemy import func
    total_payouts = db.query(func.sum(ClaimLedger.payout_amount)).filter(ClaimLedger.status == "paid").scalar() or 0.0
    return {
        "riders_count": db.query(Rider).count(),
        "dark_stores_count": db.query(DarkStore).count(),
        "total_claims": db.query(ClaimLedger).count(),
        "active_triggers": db.query(TriggerEvent).filter(TriggerEvent.is_processed == False).count(),
        "total_payouts_inr": total_payouts
    }

def _to_json_safe(obj):
    """Convert SQLAlchemy object to dict and remove non-serializable Geometry fields."""
    return {c.name: getattr(obj, c.name) for c in obj.__table__.columns if c.name != 'geom'}

@router.get("/riders")
def get_all_riders_admin(db: Session = Depends(get_db)):
    riders = crud.get_all_riders(db)
    return [_to_json_safe(r) for r in riders]

@router.get("/riders/cities")
def get_rider_cities(db: Session = Depends(get_db)):
    """Return distinct list of cities from riders table."""
    rows = db.query(Rider.city).filter(Rider.city != None).distinct().all()
    cities = sorted([r[0] for r in rows if r[0]])
    return {"cities": cities}

@router.get("/riders/hubs")
def get_rider_hubs(db: Session = Depends(get_db)):
    """Return distinct list of hub names from riders table."""
    rows = db.query(Rider.hub_name).filter(Rider.hub_name != None).distinct().all()
    hubs = sorted([r[0] for r in rows if r[0]])
    return {"hubs": hubs}

@router.delete("/riders/{rider_id}")
def delete_rider(rider_id: int, db: Session = Depends(get_db)):
    rider = crud.get_rider(db, rider_id)
    if not rider:
        raise HTTPException(404, detail="Rider not found")
    db.delete(rider)
    db.commit()
    return {"status": "success", "message": f"Rider {rider_id} deleted"}

@router.get("/dark-stores")
def get_dark_stores(db: Session = Depends(get_db)):
    stores = db.query(DarkStore).all()
    return [_to_json_safe(s) for s in stores]

@router.get("/dark-stores/cities")
def get_dark_store_cities(db: Session = Depends(get_db)):
    """Return distinct list of cities from dark_stores table."""
    rows = db.query(DarkStore.city).filter(DarkStore.city != None).distinct().all()
    cities = sorted([r[0] for r in rows if r[0]])
    return {"cities": cities}

@router.put("/dark-stores/{ds_id}/zone")
def manual_zone_override(ds_id: int, payload: ZoneUpdate, db: Session = Depends(get_db)):
    """Manually force a dark store into a specific risk zone."""
    ds = crud.get_dark_store(db, ds_id)
    if not ds:
        raise HTTPException(404, detail="Dark Store not found")
    ds.current_zone = payload.new_zone.upper()
    db.commit()
    return {"status": "success", "hub": ds.name, "new_zone": ds.current_zone}


# ─────────────────────────────────────────────────────
# CSV Upload: Bulk upsert Dark Stores
# Expected CSV headers (case-insensitive):
#   SR. No | Darkstore ID | Darkstore Name | City | Latitude | Longitude
# ─────────────────────────────────────────────────────
@router.post("/dark-stores/upload-csv")
async def upload_dark_stores_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a CSV file to bulk-insert or update Dark Stores.
    Upsert logic: if a row with the same 'Darkstore ID' exists, update it.
    Otherwise, insert a new row.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, detail="Only .csv files are accepted.")

    content = await file.read()
    text = content.decode("utf-8-sig")  # utf-8-sig handles BOM from Excel exports
    reader = csv.DictReader(io.StringIO(text))

    # Normalize headers: strip whitespace and convert to lowercase
    if reader.fieldnames is None:
        raise HTTPException(400, detail="CSV file is empty or has no headers.")

    header_map = {h.strip().lower(): h for h in reader.fieldnames}

    def get_col(row, *keys):
        """Try multiple key variants to find the column value."""
        for key in keys:
            for h_lower, h_orig in header_map.items():
                if key.lower() in h_lower:
                    val = row.get(h_orig, "").strip()
                    if val:
                        return val
        return None

    inserted = 0
    updated = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):  # start=2 because row 1 is header
        try:
            external_id = get_col(row, "darkstore id", "darkstore_id", "id")
            name = get_col(row, "darkstore name", "name")
            city = get_col(row, "city")
            lat_str = get_col(row, "latitude", "lat")
            lon_str = get_col(row, "longitude", "lon")

            if not name or not lat_str or not lon_str:
                skipped += 1
                errors.append(f"Row {i}: Missing required fields (name/lat/lon) — skipped.")
                continue

            lat = float(lat_str)
            lon = float(lon_str)

            # Upsert: look for existing record by external_id, then by name
            existing = None
            if external_id:
                existing = db.query(DarkStore).filter(DarkStore.external_id == external_id).first()
            if not existing:
                existing = db.query(DarkStore).filter(DarkStore.name == name).first()

            if existing:
                existing.name = name
                existing.city = city
                existing.lat = lat
                existing.lon = lon
                if external_id:
                    existing.external_id = external_id
                updated += 1
            else:
                new_store = DarkStore(
                    external_id=external_id,
                    name=name,
                    city=city,
                    lat=lat,
                    lon=lon,
                    current_zone="GREEN",
                    is_active=True,
                )
                db.add(new_store)
                inserted += 1

        except ValueError as ve:
            skipped += 1
            errors.append(f"Row {i}: Invalid number format — {ve}")
        except Exception as e:
            skipped += 1
            errors.append(f"Row {i}: Unexpected error — {e}")

    db.commit()

    return {
        "status": "success",
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:10],  # Return at most 10 errors
        "message": f"Processed CSV: {inserted} inserted, {updated} updated, {skipped} skipped."
    }

# ─────────────────────────────────────────────────────
# CSV Upload: Bulk upsert Riders
# ─────────────────────────────────────────────────────
@router.post("/riders/upload-csv")
async def upload_riders_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload a CSV file to bulk-insert or update Riders.
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(400, detail="Only .csv files are accepted.")

    content = await file.read()
    text = content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))

    if reader.fieldnames is None:
        raise HTTPException(400, detail="CSV file is empty or has no headers.")

    header_map = {h.strip().lower(): h for h in reader.fieldnames}

    def get_col(row, *keys):
        for key in keys:
            for h_lower, h_orig in header_map.items():
                if key.lower() == h_lower: # Exact match preferred
                    return row.get(h_orig, "").strip()
                if key.lower() in h_lower: # Fallback to partial
                    val = row.get(h_orig, "").strip()
                    if val: return val
        return None

    inserted = 0
    updated = 0
    skipped = 0
    errors = []

    for i, row in enumerate(reader, start=2):
        try:
            external_id = get_col(row, "rider id", "rider_id")
            name = get_col(row, "rider name", "name")
            phone = get_col(row, "phone")
            ds_ext_id = get_col(row, "darkstore id", "darkstore_id")
            hub_name = get_col(row, "darkstore name", "darkstore_name")
            city = get_col(row, "city")
            vehicle_type = get_col(row, "vehicle type", "vehicle_type")
            status = get_col(row, "status")
            exp_yrs = get_col(row, "exp (yrs)", "experience")
            avg_del = get_col(row, "avg del/day", "deliveries")
            rating = get_col(row, "rating")
            eph = get_col(row, "earnings_per_hour", "wage")
            acc_trig = get_col(row, "deliveries_accepted_triggers")
            tot_trig = get_col(row, "total_deliveries_trigger")
            dpdt = get_col(row, "dpdt_percent", "dpdt")

            if not phone:
                skipped += 1
                errors.append(f"Row {i}: Missing phone number — skipped.")
                continue
            
            # Clean phone and keep only last 10 digits
            phone = "".join(filter(str.isdigit, phone))
            if len(phone) > 10:
                phone = phone[-10:]

            existing = db.query(Rider).filter(Rider.phone == phone).first()
            if not existing and external_id:
                 existing = db.query(Rider).filter(Rider.external_id == external_id).first()

            if existing:
                if name: existing.name = name
                if city: existing.city = city
                if hub_name: existing.hub_name = hub_name
                if ds_ext_id: existing.darkstore_external_id = ds_ext_id
                if vehicle_type: existing.vehicle_type = vehicle_type
                if status: existing.rider_status = status
                if exp_yrs: existing.experience_years = float(exp_yrs)
                if avg_del: existing.avg_deliveries_per_day = float(avg_del)
                if rating: existing.rating = float(rating)
                if eph: existing.earnings_per_hour = float(eph)
                if acc_trig: existing.deliveries_accepted_triggers = int(acc_trig)
                if tot_trig: existing.total_deliveries_trigger = int(tot_trig)
                if dpdt: existing.dpdt = float(dpdt)
                if external_id: existing.external_id = external_id
                updated += 1
            else:
                new_rider = Rider(
                    external_id=external_id,
                    name=name or "Unknown",
                    phone=phone,
                    city=city,
                    hub_name=hub_name or "Unknown Hub",
                    darkstore_external_id=ds_ext_id,
                    vehicle_type=vehicle_type,
                    rider_status=status,
                    experience_years=float(exp_yrs) if exp_yrs else 0.0,
                    avg_deliveries_per_day=float(avg_del) if avg_del else 0.0,
                    rating=float(rating) if rating else 5.0,
                    earnings_per_hour=float(eph) if eph else 0.0,
                    deliveries_accepted_triggers=int(acc_trig) if acc_trig else 0,
                    total_deliveries_trigger=int(tot_trig) if tot_trig else 0,
                    dpdt=float(dpdt) if dpdt else 100.0,
                    zone_category="GREEN",
                )
                db.add(new_rider)
                inserted += 1

        except Exception as e:
            skipped += 1
            errors.append(f"Row {i}: Error — {e}")

    db.commit()

    return {
        "status": "success",
        "inserted": inserted,
        "updated": updated,
        "skipped": skipped,
        "errors": errors[:10],
        "message": f"Processed Rider CSV: {inserted} inserted, {updated} updated, {skipped} skipped."
    }

@router.post("/generate-payout-order")
async def generate_payout_order(request: PayoutRequest, db: Session = Depends(get_db)):
    """AI Model 2: Calculates precise payout based on wages, duration, severity, and zone coverage."""
    hub_name = request.hub_name
    trigger_type = request.trigger_type
    
    # 1. Selection: Are we calculating for a specific rider or a hub estimate?
    if request.rider_id:
        riders = [db.query(Rider).get(request.rider_id)]
    else:
        riders = db.query(Rider).filter(Rider.hub_name == hub_name).all()
    
    if not (riders and riders[0]):
        # Demo fallback
        return {
            "order_id": f"ord_demo_{datetime.now().timestamp()}",
            "amount": 500,
            "amount_per_rider": 500,
            "currency": "INR",
            "key": os.getenv("RAZORPAY_KEY_ID"),
            "rider_count": 1
        }

    # 2. Logic Constants from AI Model 2 Spec
    coverage_map = {"GREEN": 0.50, "ORANGE": 0.45, "RED": 0.35}
    
    # 3. Calculation Loop (Even if it's 1 rider)
    total_payout = 0
    payout_per_rider = 0
    
    for rider in riders:
        # Determine current zone coverage %
        # Logic: If trigger is global/active, we use hub zone.
        hub = db.query(DarkStore).filter(DarkStore.name == rider.hub_name).first()
        zone = hub.current_zone if hub else "RED"
        coverage_pct = coverage_map.get(zone.upper(), 0.35)

        # Formula: Base Income Loss = (wage * duration) * severity
        # Data: Use rider.earnings_per_hour (default 150)
        wage = getattr(rider, 'earnings_per_hour', 150) or 150
        base_loss = (wage * request.duration) * request.severity
        final_payout = float(base_loss) * coverage_pct
        
        total_payout += final_payout
        payout_per_rider = final_payout # Last one in loop for single rider req

    if not client:
        raise HTTPException(status_code=500, detail="Razorpay not configured")

    # 4. Create Razorpay Order
    order_data = {
        "amount": int(total_payout * 100), 
        "currency": "INR",
        "payment_capture": 1
    }
    
    try:
        order = client.order.create(data=order_data)
        return {
            "order_id": order['id'],
            "amount": total_payout,
            "amount_per_rider": round(payout_per_rider, 2),
            "currency": "INR",
            "key": os.getenv("RAZORPAY_KEY_ID"),
            "rider_count": len(riders)
        }
    except Exception as e:
        print(f"Razorpay Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
