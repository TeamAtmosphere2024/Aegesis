import json
from core.redis_config import redis_client
import logging

logger = logging.getLogger("aegesis.streaming")

class EventStreamer:
    @staticmethod
    def broadcast_event(channel: str, event_type: str, data: dict):
        payload = {
            "type": event_type,
            "data": data,
            "timestamp": str(redis_client.time()[0]) 
        }
        try:
            redis_client.publish(channel, json.dumps(payload))
            logger.info(f"📡 Broadcasted {event_type} to channel {channel}")
        except Exception as e:
            logger.error(f"❌ Failed to broadcast event: {str(e)}")

    @staticmethod
    def rider_status_update(rider_id: int, status: str, zone: str):
        EventStreamer.broadcast_event(
            channel="rider_updates",
            event_type="RIDER_STATUS_CHANGE",
            data={"rider_id": rider_id, "status": status, "zone": zone}
        )

streamer = EventStreamer()
