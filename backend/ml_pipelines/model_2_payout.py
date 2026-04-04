"""
ml_pipelines/model_2_payout.py
Actionable Payout Engine — Aegesis Model 2.

Loads the trained eligibility classifier (eligibility_classifier.joblib) from
models/Payout_engine/.  Its output gates geospatial eligibility BEFORE the 
payout formula runs.  Falls back to the pure-Python Haversine formula if the
model file is missing.

Public API
----------
calculate_payout(rider_lat, rider_lon, trigger_lat, trigger_lon,
                 trigger_category, zone_category,
                 wage, duration, severity) -> dict
"""
import logging
import math
from datetime import datetime

import numpy as np

from core.config import (
    PAYOUT_MODEL_PATH, COVERAGE_MAP,
    TRIGGER_RADIUS_KM, APP_SUSPENSION_RADIUS_KM,
)
from core.geospatial import haversine

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────
# Model loading (lazy singleton)
# ──────────────────────────────────────────────────────
_eligibility_model = None
_use_model         = False


def _load_model():
    global _eligibility_model, _use_model
    try:
        import joblib
        if PAYOUT_MODEL_PATH.exists():
            _eligibility_model = joblib.load(str(PAYOUT_MODEL_PATH))
            _use_model = True
            logger.info("Model 2 (eligibility classifier) loaded from %s", PAYOUT_MODEL_PATH)
        else:
            logger.warning("Model 2 artefact not found — using Haversine rule fallback.")
    except ImportError:
        logger.warning("joblib not installed — using Haversine rule fallback for Model 2.")
    except Exception as exc:
        logger.warning("Model 2 load failed (%s) — using Haversine rule fallback.", exc)


# ──────────────────────────────────────────────────────
# Feature engineering helpers
# ──────────────────────────────────────────────────────
def _encode_trigger_category(tc: str) -> int:
    mapping = {"ENVIRONMENTAL": 0, "SOCIOPOLITICAL": 1, "PLATFORM": 2}
    return mapping.get(tc.upper(), 0)


def _encode_zone(zone: str) -> int:
    return {"GREEN": 0, "ORANGE": 1, "RED": 2}.get(zone.upper(), 1)


def _encode_day_of_week(dow: int) -> int:
    return dow % 7  # 0=Mon … 6=Sun


def _build_features(distance_km: float, wage: float, duration: float,
                    severity: float, coverage_pct: float,
                    trigger_category: str, zone_category: str,
                    is_app_suspension: bool) -> np.ndarray:
    """
    Matches feature_metadata.json:
      numeric:  distance_from_epicenter_km, historical_hourly_wage,
                disruption_duration_hours, severity_multiplier, coverage_pct,
                hour_sin, hour_cos, is_app_suspension
      categorical (encoded): trigger_category, zone_category, day_of_week, city
    """
    now      = datetime.utcnow()
    hour_rad = (now.hour / 24.0) * 2 * math.pi
    hour_sin = math.sin(hour_rad)
    hour_cos = math.cos(hour_rad)

    # Encode categoricals
    cat_trigger = _encode_trigger_category(trigger_category)
    cat_zone    = _encode_zone(zone_category)
    cat_dow     = _encode_day_of_week(now.weekday())
    cat_city    = 0   # Default: Bangalore (MVP has single city)

    numeric     = [distance_km, wage, duration, severity,
                   coverage_pct, hour_sin, hour_cos,
                   float(is_app_suspension)]
    categorical = [cat_trigger, cat_zone, cat_dow, cat_city]

    return np.array([numeric + categorical], dtype=np.float32)


# ──────────────────────────────────────────────────────
# Eligibility check (rule-based fallback)
# ──────────────────────────────────────────────────────
def _is_eligible_by_rule(distance_km: float, trigger_category: str) -> bool:
    if trigger_category.upper() == "APP_SUSPENSION_ORACLE":
        return True  # pincode-wide — bypass radius check
    return distance_km <= TRIGGER_RADIUS_KM


# ──────────────────────────────────────────────────────
# Payout formula (always deterministic)
# ──────────────────────────────────────────────────────
def _compute_payout(wage: float, duration: float,
                    severity: float, coverage_pct: float) -> float:
    base_loss = wage * duration * severity
    return round(base_loss * coverage_pct, 2)


# ──────────────────────────────────────────────────────
# Public entry-point
# ──────────────────────────────────────────────────────
def calculate_payout(rider_lat: float, rider_lon: float,
                     trigger_lat: float, trigger_lon: float,
                     trigger_category: str, zone_category: str,
                     wage: float, duration: float, severity: float) -> dict:
    """
    Determine eligibility and compute a payout for one rider + trigger event.

    Returns
    -------
    dict with:
      eligible: bool
      distance_km: float
      payout_amount_inr: float   (0.0 if ineligible)
      coverage_pct: float
      base_loss_inr: float
      model_source: str
    """
    global _use_model
    if _eligibility_model is None:
        _load_model()

    distance_km   = haversine(rider_lat, rider_lon, trigger_lat, trigger_lon)
    coverage_pct  = COVERAGE_MAP.get(zone_category.upper(), 0.35)
    is_app_susp   = trigger_category.upper() in ("APP_SUSPENSION_ORACLE", "APP_SUSPENSION")

    # ── Eligibility gate ──────────────────────────────
    if _use_model:
        try:
            features  = _build_features(distance_km, wage, duration, severity,
                                        coverage_pct, trigger_category,
                                        zone_category, is_app_susp)
            eligible  = bool(_eligibility_model.predict(features)[0])
            src       = "eligibility_classifier"
        except Exception as exc:
            logger.warning("Model 2 inference failed (%s), falling back to rule.", exc)
            eligible  = _is_eligible_by_rule(distance_km, trigger_category)
            src       = "haversine_rule_fallback"
    else:
        eligible = _is_eligible_by_rule(distance_km, trigger_category)
        src      = "haversine_rule_fallback"

    if not eligible:
        return {
            "eligible":          False,
            "distance_km":       round(distance_km, 3),
            "payout_amount_inr": 0.0,
            "coverage_pct":      coverage_pct,
            "base_loss_inr":     0.0,
            "model_source":      src,
        }

    # ── Payout formula ────────────────────────────────
    base_loss = wage * duration * severity
    payout    = _compute_payout(wage, duration, severity, coverage_pct)

    return {
        "eligible":           True,
        "distance_km":        round(distance_km, 3),
        "payout_amount_inr":  payout,
        "coverage_pct":       coverage_pct,
        "base_loss_inr":      round(base_loss, 2),
        "model_source":       src,
    }
