"""
core/stream_processor.py
Handles event dispatching. Now integrated with Redis Streams for persistence,
with an automatic fallback to FastAPI BackgroundTasks if Redis is offline.
"""
import logging
from fastapi import BackgroundTasks
from core.redis_config import redis_client, REDIS_ENABLED, STREAM_NAME

logger = logging.getLogger(__name__)


def dispatch_trigger_event(background_tasks: BackgroundTasks,
                           db_factory,
                           trigger_event_id: int) -> None:
    """
    Enqueue a trigger event. Uses Redis Streams if available, otherwise BackgroundTasks.
    """
    if REDIS_ENABLED:
        try:
            # XADD: Append event to the stream
            event_data = {"trigger_event_id": str(trigger_event_id)}
            redis_client.xadd(STREAM_NAME, event_data)
            logger.info("🚀 Enqueued trigger_event_id=%d to Redis Stream: %s", trigger_event_id, STREAM_NAME)
            return
        except Exception as e:
            logger.error("❌ Redis XADD failed, falling back to background task: %s", e)

    # Fallback / Default
    background_tasks.add_task(
        _process_in_background, db_factory, trigger_event_id
    )
    logger.info("📥 Enqueued trigger_event_id=%d for in-memory processing", trigger_event_id)


def _process_in_background(db_factory, trigger_event_id: int) -> None:
    from core.execution_engine import process_trigger
    db = db_factory()
    try:
        summary = process_trigger(db, trigger_event_id)
        logger.info(
            "✅ Trigger %d processed: %d riders affected, ₹%.2f paid",
            trigger_event_id,
            summary["affected_riders"],
            summary["total_payout_inr"],
        )
    except Exception as exc:
        logger.error("🔥 Background processing failed for event %d: %s",
                     trigger_event_id, exc)
    finally:
        db.close()
