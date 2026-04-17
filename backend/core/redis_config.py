import os
import redis
import logging
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL")
STREAM_NAME = "aegesis_payout_stream"

# Debug Trick for Render Logs
print(f"🔍 DEBUG: REDIS_URL is set to: {REDIS_URL}")

if not REDIS_URL:
    logger.error("❌ REDIS_URL not set in environment variables!")
    # In production, we want to know if this failed immediately
    REDIS_ENABLED = False
    redis_client = None
else:
    try:
        redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        # Ping to check connection
        redis_client.ping()
        logger.info("✅ Connected to Redis at %s", REDIS_URL)
        REDIS_ENABLED = True
    except Exception as e:
        logger.warning("⚠️ Redis connection failed at %s: %s", REDIS_URL, e)
        redis_client = None
        REDIS_ENABLED = False
