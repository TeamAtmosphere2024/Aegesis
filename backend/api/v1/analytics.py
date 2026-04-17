from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.session import get_db
from database.models import ClaimLedger, Rider, TriggerEvent
from datetime import datetime, timedelta

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_dashboard_summary(db: Session = Depends(get_db)):
    total_claims = db.query(ClaimLedger).count()
    total_paid = db.query(func.sum(ClaimLedger.payout_amount)).filter(ClaimLedger.status == "paid").scalar() or 0.0
    active_riders = db.query(Rider).filter(Rider.is_active == True).count()
    
    return {
        "total_claims": total_claims,
        "total_payout_inr": total_paid,
        "active_riders": active_riders,
        "updated_at": datetime.utcnow()
    }
