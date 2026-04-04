"""
api/v1/webhooks.py
Webhook endpoints — simulate the 4 external API triggers.

Endpoints:
  POST /api/v1/webhooks/imd-weather        → Cat A: Severe Rain / Flash Flood
  POST /api/v1/webhooks/imd-heat           → Cat A: Extreme Heat
  POST /api/v1/webhooks/news-disruption    → Cat B: Transport Strike / Protest
  POST /api/v1/webhooks/platform-status    → Cat B: Zepto/Blinkit App Suspension

Each endpoint:
  1. Validates and stores a TriggerEvent in SQLite.
  2. Dispatches background processing (Models 2 + 3 for all active riders).
  3. Returns immediately with the trigger event ID.

GET /api/v1/webhooks/events        → list recent trigger events
GET /api/v1/webhooks/events/{id}   → result of a specific event
"""
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.session import get_db, SessionLocal
from database import crud
from core.stream_processor import dispatch_trigger_event

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks / Triggers"])


# ──────────────────────────────────────────────────────
# Shared Pydantic schema
# ──────────────────────────────────────────────────────

class GeoFence(BaseModel):
    center_lat : float = Field(..., example=12.9121)
    center_long: float = Field(..., example=77.6446)
    radius_km  : float = Field(2.5, example=2.5)


class TriggerPayload(BaseModel):
    source                   : str
    trigger_type             : str
    category                 : str
    geo_fence                : GeoFence
    severity_multiplier      : float = Field(1.0, ge=0.5, le=3.0)
    estimated_duration_hours : float = Field(1.0, ge=0.1, le=24.0)
    zone_category            : Optional[str] = "RED"     # override zone for this event
    affected_pincode         : Optional[str] = None


# ──────────────────────────────────────────────────────
# Internal helper
# ──────────────────────────────────────────────────────

def _ingest_and_dispatch(payload: TriggerPayload,
                         background_tasks: BackgroundTasks,
                         db: Session,
                         category_override: str = None) -> dict:
    category = category_override or payload.category
    event = crud.create_trigger_event(
        db,
        source                   = payload.source,
        trigger_type             = payload.trigger_type,
        category                 = category,
        center_lat               = payload.geo_fence.center_lat,
        center_lon               = payload.geo_fence.center_long,
        radius_km                = payload.geo_fence.radius_km,
        severity_multiplier      = payload.severity_multiplier,
        estimated_duration_hours = payload.estimated_duration_hours,
        zone_category            = (payload.zone_category or "RED").upper(),
        affected_pincode         = payload.affected_pincode,
    )
    dispatch_trigger_event(background_tasks, SessionLocal, event.id)
    return {
        "trigger_event_id": event.id,
        "trigger_type":     event.trigger_type,
        "category":         event.category,
        "epicenter":        {"lat": event.center_lat, "lon": event.center_lon},
        "severity":         event.severity_multiplier,
        "duration_hours":   event.estimated_duration_hours,
        "zone_category":    event.zone_category,
        "status":           "queued_for_processing",
        "message":          "Trigger received. Background execution started for all active riders.",
    }


# ──────────────────────────────────────────────────────
# Webhook Routes — 4 Triggers
# ──────────────────────────────────────────────────────

@router.post("/imd-weather",
             summary="[CAT A] Simulate IMD Severe Rain / Flash Flood trigger")
def webhook_imd_weather(payload: TriggerPayload,
                        background_tasks: BackgroundTasks,
                        db: Session = Depends(get_db)):
    """
    Expected payload:
    {
      "source": "imd_weather_api",
      "trigger_type": "SEVERE_FLOOD",
      "category": "ENVIRONMENTAL",
      "geo_fence": { "center_lat": 12.9121, "center_long": 77.6446, "radius_km": 2.5 },
      "severity_multiplier": 1.0,
      "estimated_duration_hours": 3.5,
      "zone_category": "RED"
    }
    """
    return _ingest_and_dispatch(payload, background_tasks, db, "ENVIRONMENTAL")


@router.post("/imd-heat",
             summary="[CAT A] Simulate IMD Extreme Heatwave trigger (>45°C)")
def webhook_imd_heat(payload: TriggerPayload,
                     background_tasks: BackgroundTasks,
                     db: Session = Depends(get_db)):
    return _ingest_and_dispatch(payload, background_tasks, db, "ENVIRONMENTAL")


@router.post("/news-disruption",
             summary="[CAT B] Simulate News NLP strike / protest trigger")
def webhook_news_disruption(payload: TriggerPayload,
                            background_tasks: BackgroundTasks,
                            db: Session = Depends(get_db)):
    return _ingest_and_dispatch(payload, background_tasks, db, "SOCIOPOLITICAL")


@router.post("/platform-status",
             summary="[CAT B] Simulate Zepto / Blinkit App Suspension Oracle")
def webhook_platform_status(payload: TriggerPayload,
                             background_tasks: BackgroundTasks,
                             db: Session = Depends(get_db)):
    return _ingest_and_dispatch(payload, background_tasks, db, "APP_SUSPENSION_ORACLE")


# ──────────────────────────────────────────────────────
# Inspect trigger history & results
# ──────────────────────────────────────────────────────

@router.get("/events", summary="List recent trigger events and their outcomes")
def list_trigger_events(db: Session = Depends(get_db)):
    events = crud.get_all_trigger_events(db)
    return [_event_resp(e) for e in events]


@router.get("/events/{event_id}",
            summary="Get detailed result for a specific trigger event")
def get_trigger_event(event_id: int, db: Session = Depends(get_db)):
    event = crud.get_trigger_event(db, event_id)
    if not event:
        raise HTTPException(404, detail="Trigger event not found")
    return _event_resp(event)


# ── Helper ──────────────────────────────────────────────────────────────────

def _event_resp(e):
    return {
        "id":                      e.id,
        "source":                  e.source,
        "trigger_type":            e.trigger_type,
        "category":                e.category,
        "epicenter":               {"lat": e.center_lat, "lon": e.center_lon},
        "radius_km":               e.radius_km,
        "severity":                e.severity_multiplier,
        "duration_hours":          e.estimated_duration_hours,
        "zone_category":           e.zone_category,
        "affected_pincode":        e.affected_pincode,
        "is_processed":            e.is_processed,
        "affected_rider_count":    e.affected_rider_count,
        "total_payout_inr":        e.total_payout_inr,
        "created_at":              e.created_at.isoformat() if e.created_at else None,
    }