"""
worker.py — Aegesis Persistent Payout Worker
Reads settlement tasks from Redis Streams and executes the Oracle Payout Engine.
Run with: python worker.py
"""
import time
import logging
from core.redis_config import redis_client, REDIS_ENABLED, STREAM_NAME
from core.stream_processor import _process_in_background
from database.session import SessionLocal

logging.basicConfig(level=logging.INFO, format="%(asctime)s  %(levelname)-8s  %(message)s")
logger = logging.getLogger("aegesis-worker")

def run_worker():
    if not REDIS_ENABLED:
        logger.error("❌ Redis is not enabled. Worker cannot start.")
        return

    logger.info("👷 Aegesis Worker started. Listening for payout events on stream: %s", STREAM_NAME)
    
    # Simple cursor to keep track of read position ('$' means only new messages)
    last_id = "0-0" # Start from beginning or use '$' for fresh pings only. 
                    # Using '$' for demo to avoid re-processing old events on restart.
    last_id = "$" 

    while True:
        try:
            # XREAD: Block for up to 5 seconds for new messages
            response = redis_client.xread({STREAM_NAME: last_id}, count=1, block=5000)
            
            if response:
                for stream, messages in response:
                    for msg_id, data in messages:
                        event_id = int(data.get("trigger_event_id"))
                        logger.info("⚙️  Processing event_id=%d (from Redis ID: %s)", event_id, msg_id)
                        
                        # Execute the core logic
                        _process_in_background(SessionLocal, event_id)
                        
                        # Update cursor
                        last_id = msg_id
            
        except Exception as e:
            logger.error("⚠️ Worker Error: %s. Retrying in 5s...", e)
            time.sleep(5)

if __name__ == "__main__":
    run_worker()
