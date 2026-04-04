"""
api/v1/policies.py
Policy management endpoints — create / fetch rider policies.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from database.session import get_db
from database import crud
from ml_pipelines.model_1_premium import calculate_premium

router = APIRouter(prefix="/api/v1/policies", tags=["Policies"])


# ──────────────────────────────────────────────────────
# Pydantic schemas
# ──────────────────────────────────────────────────────

class PolicyCreate(BaseModel):
    rider_id                      : int
    predictive_environmental_risk : float = Field(0.5, ge=0.0, le=1.0)
    predictive_sociopolitical_risk: float = Field(0.3, ge=0.0, le=1.0)


# ──────────────────────────────────────────────────────
# Routes
# ──────────────────────────────────────────────────────

@router.post("/", status_code=status.HTTP_201_CREATED,
             summary="Create / renew insurance policy for a rider")
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db)):
    """
    Uses Model 1 to compute the current premium and writes a Policy row.
    Any existing active policy for the rider is deactivated first.
    """
    rider = crud.get_rider(db, payload.rider_id)
    if not rider:
        raise HTTPException(404, detail="Rider not found")

    premium_data = calculate_premium(
        historical_zone_risk_score     = rider.zone_risk,
        predictive_environmental_risk  = payload.predictive_environmental_risk,
        predictive_sociopolitical_risk = payload.predictive_sociopolitical_risk,
        dpdt_pct                       = rider.dpdt,
    )

    policy = crud.create_policy(
        db,
        rider_id       = rider.id,
        weekly_premium = premium_data["weekly_premium_inr"],
        zone_category  = premium_data["zone_category"],
    )

    return {
        "policy_id":      policy.id,
        "rider_id":       rider.id,
        "rider_name":     rider.name,
        "zone_category":  policy.zone_category,
        "weekly_premium": policy.weekly_premium,
        "is_active":      policy.is_active,
        "expires_at":     policy.expires_at.isoformat() if policy.expires_at else None,
        "premium_breakdown": premium_data,
    }


@router.get("/{rider_id}/active",
            summary="Get the currently active policy for a rider")
def get_active_policy(rider_id: int, db: Session = Depends(get_db)):
    if not crud.get_rider(db, rider_id):
        raise HTTPException(404, detail="Rider not found")
    policy = crud.get_active_policy(db, rider_id)
    if not policy:
        raise HTTPException(404, detail="No active policy found for this rider")
    return _policy_resp(policy)


@router.get("/{rider_id}/history",
            summary="Get all policies (history) for a rider")
def get_policy_history(rider_id: int, db: Session = Depends(get_db)):
    if not crud.get_rider(db, rider_id):
        raise HTTPException(404, detail="Rider not found")
    policies = crud.get_policies_for_rider(db, rider_id)
    return [_policy_resp(p) for p in policies]


# ── Helper ──────────────────────────────────────────────────────────────────

def _policy_resp(p):
    return {
        "policy_id":      p.id,
        "rider_id":       p.rider_id,
        "zone_category":  p.zone_category,
        "weekly_premium": p.weekly_premium,
        "is_active":      p.is_active,
        "created_at":     p.created_at.isoformat() if p.created_at else None,
        "expires_at":     p.expires_at.isoformat()  if p.expires_at  else None,
    }
