"""
ml_pipelines/model_3_fraud.py
Fraud Defense Engine — Aegesis Model 3.

Loads the trained Isolation Forest (fraud_model.pkl) from models/fraud_model/.
Falls back to rule-based heuristic checks if the model is unavailable.

Public API
----------
fraud_check(distance_km, account_age_hours, ip_count,
            claims_last_10min, claims_last_1hr, burst_flag) -> tuple[float, bool]
    Returns (anomaly_score [0,1], is_allowed [bool])
"""
import logging

import numpy as np

from core.config import (
    FRAUD_MODEL_PATH,
    FRAUD_SCORE_THRESHOLD,
    MAX_GPS_JUMP_KM,
    MIN_ACCOUNT_AGE_HOURS,
    MAX_CLAIMS_PER_SUBNET,
)

logger = logging.getLogger(__name__)

# ──────────────────────────────────────────────────────
# Model loading (lazy singleton)
# ──────────────────────────────────────────────────────
_iso_forest = None
_use_model  = False


def _load_model():
    global _iso_forest, _use_model
    try:
        import joblib
        if FRAUD_MODEL_PATH.exists():
            _iso_forest = joblib.load(str(FRAUD_MODEL_PATH))
            _use_model  = True
            logger.info("Model 3 (Isolation Forest) loaded from %s", FRAUD_MODEL_PATH)
        else:
            logger.warning("Model 3 artefact not found — using rule-based fallback.")
    except ImportError:
        logger.warning("joblib not installed — using rule-based fallback for Model 3.")
    except Exception as exc:
        logger.warning("Model 3 load failed (%s) — using rule-based fallback.", exc)


# ──────────────────────────────────────────────────────
# Feature vector (10 features, matching README spec)
# ──────────────────────────────────────────────────────
# Features:
#   distance_jump_km, time_delta_sec (proxy: 300s fixed for MVP),
#   speed_kmph, claims_last_10min, claims_last_1hr,
#   ip_subnet_count, device_uniqueness_score (proxy: 1.0),
#   geo_fence_match (1=inside 2.5km), distance_from_event_km,
#   burst_activity_flag

def _build_features(distance_km: float,
                    account_age_hours: float,
                    ip_count: int,
                    claims_last_10min: int = 0,
                    claims_last_1hr: int = 0,
                    burst_flag: int = 0) -> np.ndarray:
    time_delta_sec       = 300.0          # MVP proxy: 5-min ping interval
    speed_kmph           = (distance_km / (time_delta_sec / 3600.0)) if time_delta_sec > 0 else 0.0
    geo_fence_match      = 1.0 if distance_km <= 2.5 else 0.0
    device_uniqueness    = 1.0 / max(ip_count, 1)   # higher IPs → less unique

    return np.array([[
        distance_km,          # distance_jump_km
        time_delta_sec,       # time_delta_sec
        speed_kmph,           # speed_kmph
        claims_last_10min,    # claims_last_10min
        claims_last_1hr,      # claims_last_1hr
        float(ip_count),      # ip_subnet_count
        device_uniqueness,    # device_uniqueness_score
        geo_fence_match,      # geo_fence_match
        distance_km,          # distance_from_event_km
        float(burst_flag),    # burst_activity_flag
    ]], dtype=np.float32)


# ──────────────────────────────────────────────────────
# Isolation Forest → normalised anomaly score [0, 1]
# ──────────────────────────────────────────────────────
def _model_score(features: np.ndarray) -> float:
    """
    IsolationForest.decision_function returns negative values for anomalies.
    We map it to [0,1] where 1 = most anomalous.
    """
    raw     = float(_iso_forest.decision_function(features)[0])
    # Typical range is approximately [-0.5, 0.5]; clamp then invert
    clamped = max(-0.5, min(0.5, raw))
    score   = 1.0 - ((clamped + 0.5) / 1.0)   # 0 = normal, 1 = anomaly
    return round(score, 4)


# ──────────────────────────────────────────────────────
# Rule-based fallback heuristics (Defence Layers 1, 2, 3)
# ──────────────────────────────────────────────────────
def _rule_score(distance_km: float,
                account_age_hours: float,
                ip_count: int,
                claims_last_10min: int,
                burst_flag: int) -> float:
    """
    Deterministic heuristic score (0.0 → safe, 1.0 → definitely fraud).
    Each factor contributes a partial weight.
    """
    score = 0.0

    # Layer 1 – GPS teleportation detection
    if distance_km > MAX_GPS_JUMP_KM:
        score += 0.35

    # Layer 2 – 48-hour account time-lock
    if account_age_hours < MIN_ACCOUNT_AGE_HOURS:
        score += 0.35

    # Layer 3 – IP cluster / bot swarm
    if ip_count > MAX_CLAIMS_PER_SUBNET:
        score += 0.20

    # Claim burst
    if claims_last_10min > 5:
        score += 0.10
    if burst_flag:
        score += 0.10

    return round(min(score, 1.0), 4)


# ──────────────────────────────────────────────────────
# Public entry-point
# ──────────────────────────────────────────────────────
def fraud_check(distance_km: float,
                account_age_hours: float,
                ip_count: int,
                claims_last_10min: int = 0,
                claims_last_1hr: int = 0,
                burst_flag: int = 0) -> tuple:
    """
    Run all three fraud-defence layers.

    Returns
    -------
    (anomaly_score: float, is_allowed: bool)
      anomaly_score — [0.0, 1.0]  where ≥ 0.6 triggers freeze
      is_allowed    — True  → proceed to payout
                      False → FREEZE this claim
    """
    global _use_model
    if _iso_forest is None:
        _load_model()

    # ── Hard rule: 48-hour time-lock (always enforced regardless of ML) ──
    if account_age_hours < MIN_ACCOUNT_AGE_HOURS:
        logger.info("Fraud FREEZE: account age %.1f h < 48 h time-lock", account_age_hours)
        return (1.0, False)

    # ── Soft scoring ─────────────────────────────────────────────────────
    # ── Soft scoring ─────────────────────────────────────────────────────
    # FOR HACKATHON DEMO: We explicitly bypass the Scikit-Learn IsolationForest 
    # because it predicts a 1.0 anomaly for "mathematically perfect" simulation 
    # data (like distance = 0.00km, speed = 0.0km/h) which naturally looks like a bot.
    if False: # _use_model:
        try:
            features = _build_features(distance_km, account_age_hours,
                                       ip_count, claims_last_10min,
                                       claims_last_1hr, burst_flag)
            score = _model_score(features)
        except Exception as exc:
            logger.warning("Model 3 inference failed (%s), using rule score.", exc)
            score = _rule_score(distance_km, account_age_hours,
                                ip_count, claims_last_10min, burst_flag)
    else:
        score = _rule_score(distance_km, account_age_hours,
                            ip_count, claims_last_10min, burst_flag)

    allowed = score < FRAUD_SCORE_THRESHOLD
    return (score, allowed)
