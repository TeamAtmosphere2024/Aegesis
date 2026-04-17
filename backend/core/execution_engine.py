"""
core/execution_engine.py
The central payout orchestrator for Aegesis.

Flow:
  1. Determine zone category for the trigger.
  2. For every active rider, run Model 2 (eligibility + payout).
  3. Run Model 3 (fraud check).
  4. Record claim in ledger.
  5. Return full result summary.
"""
import logging
from datetime import datetime

from sqlalchemy.orm import Session

from core.config import COVERAGE_MAP
from database import crud
from ml_pipelines.model_2_payout import calculate_payout
from ml_pipelines.model_3_fraud   import fraud_check

logger = logging.getLogger(__name__)


def process_trigger(db: Session, trigger_event_id: int) -> dict:
    """
    Execute the full payout pipeline for a stored trigger event.

    Parameters
    ----------
    db               : SQLAlchemy session
    trigger_event_id : PK from trigger_events table

    Returns
    -------
    dict with summary stats and per-rider results
    """
    event = crud.get_trigger_event(db, trigger_event_id)
    if event is None:
        raise ValueError(f"Trigger event {trigger_event_id} not found.")

    # --- DYNAMIC DARK STORE UPGRADES ---
    # Convert Dark Stores in the blast radius to ORANGE or RED
    try:
        from ml_pipelines.model_2_payout import haversine
        dark_stores = crud.get_all_dark_stores(db)
        for ds in dark_stores:
            dist = haversine(ds.lat, ds.lon, event.center_lat, event.center_lon)
            if dist <= event.radius_km:
                # Use the explicit zone from the trigger if provided, otherwise calculate from severity
                if event.zone_category and event.zone_category in ["RED", "ORANGE", "GREEN"]:
                    new_zone = event.zone_category
                else:
                    new_zone = "RED" if event.severity_multiplier >= 1.7 else "ORANGE"
                # Never downgrade a red zone during a trigger
                if ds.current_zone != "RED":
                    crud.update_dark_store_zone(db, ds.id, new_zone)
    except Exception as e:
        logger.error(f"Failed to dynamically update Dark Store zones: {e}")

    riders  = crud.get_all_riders(db)
    results = []
    total_paid   = 0.0
    affected_cnt = 0

    for rider in riders:
        if rider.lat is None or rider.lon is None:
            results.append({
                "rider_id": rider.id,
                "rider_name": rider.name,
                "status": "skipped",
                "reason": "No GPS data on file",
            })
            continue

        # ── Model 2: geo eligibility + payout amount ──────────────────────
        payout_result = calculate_payout(
            rider_lat        = rider.lat,
            rider_lon        = rider.lon,
            trigger_lat      = event.center_lat,
            trigger_lon      = event.center_lon,
            trigger_category = event.category,
            zone_category    = event.zone_category or rider.zone_category,
            wage             = _get_wage(db, rider),
            duration         = event.estimated_duration_hours,
            severity         = event.severity_multiplier,
        )

        if not payout_result["eligible"]:
            claim = crud.create_claim(
                db, rider.id, event.id,
                status="not_eligible",
                distance_km=payout_result["distance_km"],
                reason="Outside radius",
            )
            results.append({
                "rider_id":   rider.id,
                "rider_name": rider.name,
                "status":     "not_eligible",
                "distance_km": payout_result["distance_km"],
            })
            continue

        # ── Rider IS in range — update their zone immediately ─────────────
        new_zone = event.zone_category or "RED"
        try:
            crud.update_rider_zone(db, rider.id, new_zone)
            logger.info(f"Rider {rider.name} zone -> {new_zone}")
        except Exception as ze:
            logger.warning(f"Could not update rider zone: {ze}")

        # ── Model 3: fraud gate ────────────────────────────────────────────
        fraud_score, allowed = fraud_check(
            distance_km       = payout_result["distance_km"],
            account_age_hours = rider.account_age_hours,
            ip_count          = rider.ip_count,
            claims_last_10min = _recent_claims_count(db, rider.id, minutes=10),
            claims_last_1hr   = _recent_claims_count(db, rider.id, minutes=60),
            burst_flag        = 1 if rider.is_flagged else 0,
        )

        if not allowed:
            crud.flag_rider(db, rider.id)
            claim = crud.create_claim(
                db, rider.id, event.id,
                status="fraud_blocked",
                payout_amount=payout_result["payout_amount_inr"],
                coverage_pct=payout_result["coverage_pct"],
                fraud_score=fraud_score,
                distance_km=payout_result["distance_km"],
                reason=f"Anomaly score {fraud_score:.3f} ≥ threshold 0.99",
            )
            results.append({
                "rider_id":    rider.id,
                "rider_name":  rider.name,
                "status":      "fraud_blocked",
                "fraud_score": fraud_score,
                "payout_inr":  payout_result["payout_amount_inr"],
                "coverage_pct": payout_result["coverage_pct"],
            })
            continue

        # ── Approved — write to ledger ─────────────────────────────────────
        payout_amount = payout_result["payout_amount_inr"]
        coverage_pct  = payout_result["coverage_pct"]

        claim = crud.create_claim(
            db, rider.id, event.id,
            status        = "paid",
            payout_amount = payout_amount,
            fraud_score   = fraud_score,
            coverage_pct  = coverage_pct,
            distance_km   = payout_result["distance_km"],
            reason        = "Auto-approved by Aegesis Engine",
        )

        total_paid   += payout_amount
        affected_cnt += 1

        results.append({
            "rider_id":     rider.id,
            "rider_name":   rider.name,
            "status":       "paid",
            "payout_inr":   payout_amount,
            "coverage_pct": coverage_pct,
            "distance_km":  payout_result["distance_km"],
            "fraud_score":  fraud_score,
        })

    # Mark trigger as processed
    crud.mark_trigger_processed(db, trigger_event_id, affected_cnt, total_paid)

    return {
        "trigger_event_id":  trigger_event_id,
        "trigger_type":      event.trigger_type,
        "affected_riders":   affected_cnt,
        "total_payout_inr":  round(total_paid, 2),
        "processed_at":      datetime.utcnow().isoformat(),
        "results":           results,
    }


# ── Helpers ────────────────────────────────────────────────────────────────────

def _get_wage(db: Session, rider) -> float:
    now = datetime.utcnow()
    return crud.get_wage_for_slot(db, rider.id, now.weekday(), now.hour)


def _recent_claims_count(db: Session, rider_id: int, minutes: int) -> int:
    from datetime import timedelta
    from database.models import ClaimLedger
    cutoff = datetime.utcnow() - timedelta(minutes=minutes)
    return db.query(ClaimLedger).filter(
        ClaimLedger.rider_id == rider_id,
        ClaimLedger.created_at >= cutoff
    ).count()