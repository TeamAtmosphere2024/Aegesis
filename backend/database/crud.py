"""
database/crud.py
All database read / write operations for Aegesis.
Every function receives a SQLAlchemy Session as its first argument
so it stays fully testable and avoids global state.
"""
from datetime import datetime, timedelta
from typing import Optional, List

from sqlalchemy.orm import Session
from sqlalchemy import desc

from database.models import (
    Rider, Policy, GPSLog, ClaimLedger,
    DPDTHistory, WageHistory, TriggerEvent, DarkStore
)

# ──────────────────────────────────────────────────────────────────────────────
# DARK STORES
# ──────────────────────────────────────────────────────────────────────────────

def create_dark_store(db: Session, name: str, lat: float, lon: float, radius_km: float = 5.0, current_zone: str = "GREEN") -> DarkStore:
    ds = DarkStore(name=name, lat=lat, lon=lon, radius_km=radius_km, current_zone=current_zone)
    db.add(ds)
    db.commit()
    db.refresh(ds)
    return ds

def get_all_dark_stores(db: Session) -> List[DarkStore]:
    return db.query(DarkStore).filter(DarkStore.is_active == True).all()

def get_dark_store(db: Session, ds_id: int) -> Optional[DarkStore]:
    return db.query(DarkStore).filter(DarkStore.id == ds_id).first()

def update_dark_store_zone(db: Session, ds_id: int, new_zone: str) -> Optional[DarkStore]:
    ds = get_dark_store(db, ds_id)
    if ds:
        ds.current_zone = new_zone
        db.commit()
        db.refresh(ds)
    return ds


# ──────────────────────────────────────────────────────────────────────────────
# RIDERS
# ──────────────────────────────────────────────────────────────────────────────

def create_rider(db: Session, name: str, phone: str,
                 hub_name: str, zone_category: str, zone_risk: float,
                 lat: float, lon: float, dpdt: float = 100.0) -> Rider:
    rider = Rider(
        name=name, phone=phone, hub_name=hub_name,
        zone_category=zone_category, zone_risk=zone_risk,
        lat=lat, lon=lon, dpdt=dpdt,
        account_age_hours=0.0, ip_count=1
    )
    db.add(rider)
    db.commit()
    db.refresh(rider)
    return rider


def get_rider(db: Session, rider_id: int) -> Optional[Rider]:
    return db.query(Rider).filter(Rider.id == rider_id).first()


def get_rider_by_phone(db: Session, phone: str) -> Optional[Rider]:
    return db.query(Rider).filter(Rider.phone == phone).first()


def get_all_riders(db: Session) -> List[Rider]:
    return db.query(Rider).filter(Rider.is_active == True).all()


def update_rider_gps(db: Session, rider_id: int, lat: float, lon: float) -> Optional[Rider]:
    rider = get_rider(db, rider_id)
    if rider:
        rider.lat = lat
        rider.lon = lon
        db.commit()
        db.refresh(rider)
    return rider


def update_rider_dpdt(db: Session, rider_id: int, dpdt_pct: float) -> Optional[Rider]:
    rider = get_rider(db, rider_id)
    if rider:
        rider.dpdt = dpdt_pct
        db.commit()
        db.refresh(rider)
    return rider


def flag_rider(db: Session, rider_id: int) -> Optional[Rider]:
    rider = get_rider(db, rider_id)
    if rider:
        rider.is_flagged = True
        db.commit()
        db.refresh(rider)
    return rider


# ──────────────────────────────────────────────────────────────────────────────
# POLICIES
# ──────────────────────────────────────────────────────────────────────────────

def create_policy(db: Session, rider_id: int, weekly_premium: float,
                  zone_category: str) -> Policy:
    # Deactivate any existing active policy
    db.query(Policy).filter(
        Policy.rider_id == rider_id, Policy.is_active == True
    ).update({"is_active": False})
    db.commit()

    expires = datetime.utcnow() + timedelta(days=7)
    policy = Policy(
        rider_id=rider_id,
        weekly_premium=weekly_premium,
        zone_category=zone_category,
        is_active=True,
        expires_at=expires
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


def get_active_policy(db: Session, rider_id: int) -> Optional[Policy]:
    return db.query(Policy).filter(
        Policy.rider_id == rider_id,
        Policy.is_active == True
    ).first()


def get_policies_for_rider(db: Session, rider_id: int) -> List[Policy]:
    return db.query(Policy).filter(Policy.rider_id == rider_id)\
             .order_by(desc(Policy.created_at)).all()


# ──────────────────────────────────────────────────────────────────────────────
# GPS LOGS
# ──────────────────────────────────────────────────────────────────────────────

def log_gps(db: Session, rider_id: int, lat: float, lon: float,
            during_trigger: bool = False) -> GPSLog:
    entry = GPSLog(rider_id=rider_id, lat=lat, lon=lon,
                   during_trigger=during_trigger)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_recent_gps(db: Session, rider_id: int, limit: int = 10) -> List[GPSLog]:
    return db.query(GPSLog).filter(GPSLog.rider_id == rider_id)\
             .order_by(desc(GPSLog.timestamp)).limit(limit).all()


# ──────────────────────────────────────────────────────────────────────────────
# CLAIMS (LEDGER)
# ──────────────────────────────────────────────────────────────────────────────

def create_claim(db: Session, rider_id: int, trigger_event_id: int,
                 status: str, payout_amount: float = 0.0,
                 fraud_score: float = None, coverage_pct: float = None,
                 distance_km: float = None, reason: str = None) -> ClaimLedger:
    claim = ClaimLedger(
        rider_id=rider_id,
        trigger_event_id=trigger_event_id,
        status=status,
        payout_amount=payout_amount,
        fraud_score=fraud_score,
        coverage_pct=coverage_pct,
        distance_km=distance_km,
        reason=reason
    )
    db.add(claim)
    db.commit()
    db.refresh(claim)
    return claim


def get_claims_for_rider(db: Session, rider_id: int) -> List[ClaimLedger]:
    return db.query(ClaimLedger).filter(ClaimLedger.rider_id == rider_id)\
             .order_by(desc(ClaimLedger.created_at)).all()


def get_all_claims(db: Session, limit: int = 100) -> List[ClaimLedger]:
    return db.query(ClaimLedger).order_by(desc(ClaimLedger.created_at)).limit(limit).all()


# ──────────────────────────────────────────────────────────────────────────────
# DPDT HISTORY
# ──────────────────────────────────────────────────────────────────────────────

def record_dpdt(db: Session, rider_id: int, week_start: datetime,
                dpdt_pct: float, deliveries_during: int,
                total_windows: int) -> DPDTHistory:
    entry = DPDTHistory(
        rider_id=rider_id, week_start=week_start,
        dpdt_pct=dpdt_pct,
        deliveries_during_trigger=deliveries_during,
        total_trigger_windows=total_windows
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def get_dpdt_history(db: Session, rider_id: int) -> List[DPDTHistory]:
    return db.query(DPDTHistory).filter(DPDTHistory.rider_id == rider_id)\
             .order_by(desc(DPDTHistory.week_start)).all()


# ──────────────────────────────────────────────────────────────────────────────
# WAGE HISTORY
# ──────────────────────────────────────────────────────────────────────────────

def upsert_wage(db: Session, rider_id: int, day_of_week: int,
                hour_bucket: int, new_wage: float) -> WageHistory:
    entry = db.query(WageHistory).filter(
        WageHistory.rider_id == rider_id,
        WageHistory.day_of_week == day_of_week,
        WageHistory.hour_bucket == hour_bucket
    ).first()

    if entry:
        # Running average
        total = entry.avg_wage_inr * entry.sample_count + new_wage
        entry.sample_count += 1
        entry.avg_wage_inr = total / entry.sample_count
    else:
        entry = WageHistory(
            rider_id=rider_id, day_of_week=day_of_week,
            hour_bucket=hour_bucket, avg_wage_inr=new_wage
        )
        db.add(entry)

    db.commit()
    db.refresh(entry)
    return entry


def get_wage_for_slot(db: Session, rider_id: int,
                      day_of_week: int, hour_bucket: int) -> float:
    """Returns ₹/hr for the given rider + time slot. Falls back to ₹100."""
    entry = db.query(WageHistory).filter(
        WageHistory.rider_id == rider_id,
        WageHistory.day_of_week == day_of_week,
        WageHistory.hour_bucket == hour_bucket
    ).first()
    return entry.avg_wage_inr if entry else 100.0   # safe default


# ──────────────────────────────────────────────────────────────────────────────
# TRIGGER EVENTS
# ──────────────────────────────────────────────────────────────────────────────

def create_trigger_event(db: Session, source: str, trigger_type: str,
                         category: str, center_lat: float, center_lon: float,
                         radius_km: float, severity_multiplier: float,
                         estimated_duration_hours: float,
                         zone_category: str,
                         affected_pincode: str = None) -> TriggerEvent:
    event = TriggerEvent(
        source=source, trigger_type=trigger_type, category=category,
        center_lat=center_lat, center_lon=center_lon,
        radius_km=radius_km, severity_multiplier=severity_multiplier,
        estimated_duration_hours=estimated_duration_hours,
        zone_category=zone_category,
        affected_pincode=affected_pincode
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def mark_trigger_processed(db: Session, event_id: int,
                            rider_count: int, total_payout: float) -> Optional[TriggerEvent]:
    event = db.query(TriggerEvent).filter(TriggerEvent.id == event_id).first()
    if event:
        event.is_processed = True
        event.affected_rider_count = rider_count
        event.total_payout_inr = total_payout
        db.commit()
        db.refresh(event)
    return event


def get_all_trigger_events(db: Session, limit: int = 50) -> List[TriggerEvent]:
    return db.query(TriggerEvent).order_by(desc(TriggerEvent.created_at)).limit(limit).all()


def get_trigger_event(db: Session, event_id: int) -> Optional[TriggerEvent]:
    return db.query(TriggerEvent).filter(TriggerEvent.id == event_id).first()