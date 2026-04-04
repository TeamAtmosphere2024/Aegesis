"""
ml_pipelines/model_1_premium.py
Dynamic Premium Engine — Aegesis Model 1.

Loads the trained XGBoost model (model1_xgboost.json) from models/Dynamic_premium/.
Falls back to pure-Python formula if the model file is missing (useful in CI).

Public API
----------
calculate_premium(historical_zone_risk_score, predictive_environmental_risk,
                  predictive_sociopolitical_risk, dpdt_pct) -> float
"""
import json
import logging
from pathlib import Path

import numpy as np

from core.config import (
    PREMIUM_MODEL_PATH, PREMIUM_ENCODER_PATH,
    BASE_PREMIUM_INR, ZONE_PENALTY_MAP,
    RED_ZONE_RISK_THRESHOLD, ORANGE_ZONE_RISK_THRESHOLD,
    RED_ZONE_HIST_THRESHOLD, ORANGE_ZONE_HIST_THRESHOLD,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────
# Model loading (lazy singleton)
# ──────────────────────────────────────────────────────
_xgb_model  = None
_encoder    = None
_use_model  = False   # set True once the artefacts load successfully


def _load_model():
    global _xgb_model, _encoder, _use_model
    try:
        import xgboost as xgb   # optional dependency
        import joblib

        if PREMIUM_MODEL_PATH.exists():
            _xgb_model = xgb.XGBRegressor()
            _xgb_model.load_model(str(PREMIUM_MODEL_PATH))

        if PREMIUM_ENCODER_PATH.exists():
            _encoder = joblib.load(str(PREMIUM_ENCODER_PATH))

        if _xgb_model is not None:
            _use_model = True
            logger.info("Model 1 (XGBoost) loaded from %s", PREMIUM_MODEL_PATH)
        else:
            logger.warning("Model 1 artefact not found — using formula fallback.")
    except ImportError:
        logger.warning("xgboost/joblib not installed — using formula fallback for Model 1.")
    except Exception as exc:
        logger.warning("Model 1 load failed (%s) — using formula fallback.", exc)


# ──────────────────────────────────────────────────────
# Zone classification helper (shared with fallback & XGB feature engineering)
# ──────────────────────────────────────────────────────
def _classify_zone(historical_zone_risk_score: float,
                   combined_predictive_risk: float) -> str:
    if (combined_predictive_risk > RED_ZONE_RISK_THRESHOLD or
            historical_zone_risk_score > RED_ZONE_HIST_THRESHOLD):
        return "RED"
    elif (combined_predictive_risk > ORANGE_ZONE_RISK_THRESHOLD or
          historical_zone_risk_score > ORANGE_ZONE_HIST_THRESHOLD):
        return "ORANGE"
    return "GREEN"


# ──────────────────────────────────────────────────────
# Pure-Python formula fallback (always correct per spec)
# ──────────────────────────────────────────────────────
def _formula_premium(historical_zone_risk_score: float,
                     predictive_environmental_risk: float,
                     predictive_sociopolitical_risk: float,
                     dpdt_pct: float) -> dict:
    combined = max(predictive_environmental_risk, predictive_sociopolitical_risk)
    zone     = _classify_zone(historical_zone_risk_score, combined)
    penalty  = ZONE_PENALTY_MAP[zone]
    subtotal = BASE_PREMIUM_INR + penalty

    dpdt_factor  = (100.0 - dpdt_pct) / 100.0
    dpdt_penalty = subtotal * dpdt_factor
    final        = subtotal + dpdt_penalty

    return {
        "weekly_premium_inr":     round(final, 2),
        "base_premium_inr":       BASE_PREMIUM_INR,
        "zone_category":          zone,
        "zone_penalty_inr":       round(penalty, 2),
        "subtotal_inr":           round(subtotal, 2),
        "dpdt_pct":               dpdt_pct,
        "dpdt_penalty_inr":       round(dpdt_penalty, 2),
        "model_source":           "formula_fallback",
    }


# ──────────────────────────────────────────────────────
# XGBoost-backed prediction
# ──────────────────────────────────────────────────────
def _xgb_premium(historical_zone_risk_score: float,
                 predictive_environmental_risk: float,
                 predictive_sociopolitical_risk: float,
                 dpdt_pct: float) -> dict:
    """
    Build the same engineered features the training script used:
      zone_penalty_inr, zone_category (encoded), zone_penalty_x_dpdt,
      subtotal_inr, dpdt_penalty_factor, dpdt_pct,
      combined_predictive_risk, predictive_sociopolitical_risk,
      historical_zone_risk_score, predictive_environmental_risk
    """
    combined      = max(predictive_environmental_risk, predictive_sociopolitical_risk)
    zone          = _classify_zone(historical_zone_risk_score, combined)
    zone_penalty  = ZONE_PENALTY_MAP[zone]
    subtotal      = BASE_PREMIUM_INR + zone_penalty
    dpdt_factor   = (100.0 - dpdt_pct) / 100.0
    dpdt_penalty  = subtotal * dpdt_factor

    # Encode zone label (encoder was fit on ["GREEN", "ORANGE", "RED"])
    try:
        zone_encoded = int(_encoder.transform([zone])[0]) if _encoder else {"GREEN": 0, "ORANGE": 1, "RED": 2}[zone]
    except Exception:
        zone_encoded = {"GREEN": 0, "ORANGE": 1, "RED": 2}.get(zone, 0)

    features = np.array([[
        zone_penalty,                               # zone_penalty_inr
        zone_encoded,                               # zone_category
        zone_penalty * (dpdt_pct / 100.0),          # zone_penalty_x_dpdt
        subtotal,                                   # subtotal_inr
        dpdt_factor,                                # dpdt_penalty_factor
        dpdt_pct,                                   # dpdt_pct
        combined,                                   # combined_predictive_risk
        predictive_sociopolitical_risk,             # predictive_sociopolitical_risk
        historical_zone_risk_score,                 # historical_zone_risk_score
        predictive_environmental_risk,              # predictive_environmental_risk
    ]], dtype=np.float32)

    predicted = float(_xgb_model.predict(features)[0])
    # XGB predicts the raw premium; we still round it.
    final = round(predicted, 2)

    return {
        "weekly_premium_inr": final,
        "base_premium_inr":   BASE_PREMIUM_INR,
        "zone_category":      zone,
        "zone_penalty_inr":   round(zone_penalty, 2),
        "subtotal_inr":       round(subtotal, 2),
        "dpdt_pct":           dpdt_pct,
        "dpdt_penalty_inr":   round(dpdt_penalty, 2),
        "model_source":       "xgboost",
    }


# ──────────────────────────────────────────────────────
# Public entry-point
# ──────────────────────────────────────────────────────
def calculate_premium(historical_zone_risk_score: float,
                      predictive_environmental_risk: float,
                      predictive_sociopolitical_risk: float,
                      dpdt_pct: float) -> dict:
    """
    Calculate the weekly insurance premium for a Q-Commerce rider.

    Parameters
    ----------
    historical_zone_risk_score : float  [0.0 – 1.0]
    predictive_environmental_risk : float  [0.0 – 1.0]
    predictive_sociopolitical_risk : float  [0.0 – 1.0]
    dpdt_pct : float  [0.0 – 100.0]

    Returns
    -------
    dict with  weekly_premium_inr, zone_category, breakdown fields, model_source
    """
    global _use_model
    if _xgb_model is None:
        _load_model()

    if _use_model:
        try:
            return _xgb_premium(
                historical_zone_risk_score,
                predictive_environmental_risk,
                predictive_sociopolitical_risk,
                dpdt_pct
            )
        except Exception as exc:
            logger.warning("XGBoost inference failed (%s), falling back to formula.", exc)

    return _formula_premium(
        historical_zone_risk_score,
        predictive_environmental_risk,
        predictive_sociopolitical_risk,
        dpdt_pct
    )
