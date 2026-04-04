"""
api/v1/premium.py
Dynamic insurance premium endpoints — Model 1.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.session import get_db
from database import crud
from ml_pipelines.model_1_premium import calculate_premium

router = APIRouter(prefix="/api/v1/premium", tags=["Premium"])


# ──────────────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────────────

class PremiumRequest(BaseModel):
    historical_zone_risk_score    : float = Field(..., ge=0.0, le=1.0, example=0.55)
    predictive_environmental_risk : float = Field(..., ge=0.0, le=1.0, example=0.65)
    predictive_sociopolitical_risk: float = Field(..., ge=0.0, le=1.0, example=0.30)
    dpdt_pct                      : float = Field(..., ge=0.0, le=100.0, example=80.0)


# ──────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────

@router.post("/calculate",
             summary="Calculate weekly premium from raw risk inputs (Model 1)")
def calculate_weekly_premium(payload: PremiumRequest):
    """
    Runs Model 1 (XGBoost + formula) to compute the weekly insurance premium.
    Does NOT require a rider to exist in the DB — useful for quote previews.
    """
    result = calculate_premium(
        historical_zone_risk_score     = payload.historical_zone_risk_score,
        predictive_environmental_risk  = payload.predictive_environmental_risk,
        predictive_sociopolitical_risk = payload.predictive_sociopolitical_risk,
        dpdt_pct                       = payload.dpdt_pct,
    )
    return result


@router.get("/{rider_id}",
            summary="Fetch the current weekly premium for a registered rider")
def get_rider_premium(rider_id: int,
                      env_risk: float = 0.5,
                      soc_risk: float = 0.3,
                      db: Session = Depends(get_db)):
    """
    Retrieves the rider's zone_risk and DPDT from the DB, then calls Model 1.

    Query params
    ------------
    env_risk : float — predictive environmental risk (mock IMD feed, default 0.5)
    soc_risk : float — predictive social risk       (mock NLP feed, default 0.3)
    """
    rider = crud.get_rider(db, rider_id)
    if not rider:
        raise HTTPException(404, detail="Rider not found")

    result = calculate_premium(
        historical_zone_risk_score     = rider.zone_risk,
        predictive_environmental_risk  = env_risk,
        predictive_sociopolitical_risk = soc_risk,
        dpdt_pct                       = rider.dpdt,
    )
    result["rider_id"]   = rider_id
    result["rider_name"] = rider.name
    return result