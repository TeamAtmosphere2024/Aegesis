"""
core/config.py
Central configuration and constants for Aegesis Phase 2.
"""
from pathlib import Path

# ──────────────────────────────────────────────────────
# File-system paths
# ──────────────────────────────────────────────────────
BACKEND_ROOT = Path(__file__).resolve().parent.parent

# Model artefact locations (models/ folder at repo root, two levels up)
MODELS_ROOT = BACKEND_ROOT.parent / "models"

PREMIUM_MODEL_PATH  = MODELS_ROOT / "Dynamic_premium"  / "model1_xgboost.json"
PREMIUM_ENCODER_PATH= MODELS_ROOT / "Dynamic_premium"  / "zone_label_encoder.pkl"
PAYOUT_MODEL_PATH   = MODELS_ROOT / "Payout_engine"    / "eligibility_classifier.joblib"
PAYOUT_META_PATH    = MODELS_ROOT / "Payout_engine"    / "feature_metadata.json"
FRAUD_MODEL_PATH    = MODELS_ROOT / "fraud_model"      / "fraud_model.pkl"

# ──────────────────────────────────────────────────────
# Geospatial constants
# ──────────────────────────────────────────────────────
TRIGGER_RADIUS_KM        = 50.0  # Expanded for demo: covers full city radius
MAX_GPS_JUMP_KM          = 1.0   # Max allowed GPS displacement between pings
APP_SUSPENSION_RADIUS_KM = 999.0 # Pincode-wide — effectively unlimited radius

# ──────────────────────────────────────────────────────
# Business rules
# ──────────────────────────────────────────────────────
MIN_ACCOUNT_AGE_HOURS = 0.0  # LIFTED: allow instant claims during hackathon demo

# Dynamic Coverage % by zone
COVERAGE_MAP = {
    "GREEN":  0.50,
    "ORANGE": 0.45,
    "RED":    0.35,
}

# Zone penalty (₹) for premium calculation
ZONE_PENALTY_MAP = {
    "GREEN":  0.0,
    "ORANGE": 24.0,
    "RED":    45.0,
}

BASE_PREMIUM_INR = 60.0            # Minimum weekly premium

# ──────────────────────────────────────────────────────
# Fraud thresholds
# ──────────────────────────────────────────────────────
FRAUD_SCORE_THRESHOLD   = 0.99    # RELAXED for demo stability (99% confidence required to freeze)
MAX_CLAIMS_PER_SUBNET   = 10      # Max claims per IP-subnet bucket per trigger event

# ──────────────────────────────────────────────────────
# Zone classification thresholds (Model 1 logic)
# ──────────────────────────────────────────────────────
RED_ZONE_RISK_THRESHOLD    = 0.7
ORANGE_ZONE_RISK_THRESHOLD = 0.4
RED_ZONE_HIST_THRESHOLD    = 0.8
ORANGE_ZONE_HIST_THRESHOLD = 0.5
