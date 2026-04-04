import sys
from datetime import datetime, timedelta
import logging

from sqlalchemy.orm import Session
from database.session import SessionLocal
from database.models import Rider

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_riders():
    db: Session = SessionLocal()
    try:
        past_date = datetime.utcnow() - timedelta(days=10)
        
        riders = db.query(Rider).all()
        for rider in riders:
            # Force their creation date back 10 days
            rider.created_at = past_date
            
            # The column is called account_age_hours!
            rider.account_age_hours = 240.0 # 10 days
                
            logger.info(f"Updated {rider.name} ({rider.phone}) to be registered on {past_date}")
            
        db.commit()
        logger.info("Successfully updated all test riders to be 10 days old with account_age_hours = 240.0.")
    except Exception as e:
        logger.error(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    update_riders()
