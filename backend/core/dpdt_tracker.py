"""
core/dpdt_tracker.py
DPDT (Delivery Percentage During Triggers) weekly recalculation engine.

DPDT = (GPS pings during active trigger windows / total trigger windows) × 100
"""
import logging
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from database import crud

logger = logging.getLogger(__name__)


def recalculate_dpdt_for_rider(db: Session, rider_id: int) -> float:
    """
    Recalculate DPDT % for the current week.

    Uses GPSLog rows where during_trigger=True as the numerator and the total
    number of distinct trigger events that occurred this week as the denominator.

    Returns the new DPDT percentage (0.0 – 100.0).
    """
    # Count GPS pings inside trigger windows this week
    week_start  = _week_start()
    gps_logs    = crud.get_recent_gps(db, rider_id, limit=500)
    trigger_pings = [
        g for g in gps_logs
        if g.during_trigger and g.timestamp >= week_start
    ]

    # Total trigger windows (trigger events processed this week)
    from database.models import TriggerEvent
    total_triggers = db.query(TriggerEvent).filter(
        TriggerEvent.created_at >= week_start,
        TriggerEvent.is_processed == True
    ).count()

    if total_triggers == 0:
        # No triggers this week — rider keeps their previous DPDT
        rider = crud.get_rider(db, rider_id)
        return rider.dpdt if rider else 100.0

    deliveries = len(trigger_pings)
    dpdt_pct   = round(min((deliveries / total_triggers) * 100.0, 100.0), 2)

    # Persist the recalculated DPDT
    crud.update_rider_dpdt(db, rider_id, dpdt_pct)
    crud.record_dpdt(db, rider_id, week_start, dpdt_pct,
                     deliveries, total_triggers)

    logger.info("DPDT rider_id=%d  %d/%d pings → %.2f%%",
                rider_id, deliveries, total_triggers, dpdt_pct)
    return dpdt_pct


def recalculate_dpdt_all(db: Session) -> dict:
    """Recalculate DPDT for every active rider. Used by weekly background task."""
    riders  = crud.get_all_riders(db)
    results = {}
    for rider in riders:
        results[rider.id] = recalculate_dpdt_for_rider(db, rider.id)
    return results


def _week_start() -> datetime:
    """Returns midnight of last Monday in UTC."""
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return today - timedelta(days=today.weekday())
