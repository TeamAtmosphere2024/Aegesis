"""
core/stream_processor.py
Simulates Redis Streams event queues using FastAPI BackgroundTasks.
In production, replace the `dispatch_*` calls with Redis XADD / XREAD.
"""
import logging
from fastapi import BackgroundTasks

logger = logging.getLogger(__name__)


def dispatch_trigger_event(background_tasks: BackgroundTasks,
                           db_factory,
                           trigger_event_id: int) -> None:
    """
    Enqueue a trigger event for background processing.

    Parameters
    ----------
    background_tasks  : FastAPI BackgroundTasks injected from the route
    db_factory        : callable that returns a new Session (SessionLocal)
    trigger_event_id  : PK of the TriggerEvent row to process
    """
    background_tasks.add_task(
        _process_in_background, db_factory, trigger_event_id
    )
    logger.info("Enqueued trigger_event_id=%d for background processing", trigger_event_id)


def _process_in_background(db_factory, trigger_event_id: int) -> None:
    from core.execution_engine import process_trigger
    db = db_factory()
    try:
        summary = process_trigger(db, trigger_event_id)
        logger.info(
            "Trigger %d processed: %d riders affected, ₹%.2f paid",
            trigger_event_id,
            summary["affected_riders"],
            summary["total_payout_inr"],
        )
    except Exception as exc:
        logger.error("Background processing failed for event %d: %s",
                     trigger_event_id, exc)
    finally:
        db.close()
