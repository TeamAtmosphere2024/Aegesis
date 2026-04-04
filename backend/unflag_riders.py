import sys
from sqlalchemy.orm import Session
from database.session import SessionLocal
from database.models import Rider, ClaimLedger, TriggerEvent

def unflag_riders():
    db: Session = SessionLocal()
    try:
        # 1. Unflag all riders
        riders = db.query(Rider).all()
        for rider in riders:
            rider.is_flagged = False
            
        # 2. Delete all previous claims and triggers to reset the 10-minute burst counters
        db.query(ClaimLedger).delete()
        db.query(TriggerEvent).delete()
        
        db.commit()
        print("Successfully unflagged all riders and cleared burst claim history!")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    unflag_riders()
