"""
Multi-Output XGBoost Training Pipeline
=======================================
Targets:
  1. delivery_cost_estimate     → regression  (proxy: avg_earning_per_hour_last2w)
  2. payout_viability           → binary flag (1 if earnings > regional median)
  3. claims_next_week_estimate  → regression  (proxy: num_claims_last_week as forward signal)

Dataset: final_fixed_dataset_no_target.csv
"""

import os
import warnings
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.multioutput import MultiOutputRegressor
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    mean_absolute_error, mean_squared_error, r2_score,
    f1_score, roc_auc_score, classification_report
)
from sklearn.pipeline import Pipeline
import xgboost as xgb
import shap
import joblib
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

warnings.filterwarnings("ignore")

# ─────────────────────────────────────────────
# 0. CONFIG
# ─────────────────────────────────────────────
CSV_PATH   = "./final_fixed_dataset_no_target.csv"
OUTPUT_DIR = "./outputs"
MODEL_SAVE_PATH = os.path.join(OUTPUT_DIR, "multioutput_xgb_model.pkl")
N_GEO_CLUSTERS  = 10          # KMeans clusters on lat/lon
RANDOM_STATE    = 42
TEST_SIZE       = 0.2
CV_FOLDS        = 5

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# 1. LOAD DATA
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 1 — Loading data")
print("=" * 60)

df = pd.read_csv(CSV_PATH)
print(f"  Shape     : {df.shape}")
print(f"  Nulls     : {df.isnull().sum().sum()}")
print(f"  Columns   : {df.columns.tolist()}\n")

# ─────────────────────────────────────────────
# 2. TARGET ENGINEERING
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 2 — Deriving targets from existing columns")
print("=" * 60)

# Target 1: delivery cost estimate (continuous)
df["t_delivery_cost"] = df["avg_earning_per_hour_last2w"]

# Target 2: payout viability (binary — 1 if above regional median)
regional_median = df["avg_earning_per_hour_last2w"].median()
df["t_payout_viable"] = (df["avg_earning_per_hour_last2w"] >= regional_median).astype(int)
print(f"  Payout viability split  : {df['t_payout_viable'].value_counts().to_dict()}")
print(f"  Regional median earning : ₹{regional_median:.2f}")

# Target 3: claims prediction (use current week's claims as training signal)
df["t_claims_estimate"] = df["num_claims_last_week"]

print(f"  t_delivery_cost  range  : {df['t_delivery_cost'].min():.1f} – {df['t_delivery_cost'].max():.1f}")
print(f"  t_claims_estimate range : {df['t_claims_estimate'].min()} – {df['t_claims_estimate'].max()}\n")

# ─────────────────────────────────────────────
# 3. FEATURE ENGINEERING
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 3 — Feature engineering")
print("=" * 60)

# Geo clusters (KMeans on lat/lon)
coords = df[["latitude", "longitude"]].values
kmeans = KMeans(n_clusters=N_GEO_CLUSTERS, random_state=RANDOM_STATE, n_init=10)
df["geo_cluster"] = kmeans.fit_predict(coords)
print(f"  Geo clusters created    : {N_GEO_CLUSTERS}")

# Haversine distance to centroid of all stores (approx hub)
def haversine(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = np.radians(lat2 - lat1)
    dlon = np.radians(lon2 - lon1)
    a = np.sin(dlat/2)**2 + np.cos(np.radians(lat1)) * np.cos(np.radians(lat2)) * np.sin(dlon/2)**2
    return R * 2 * np.arcsin(np.sqrt(a))

hub_lat = df["latitude"].mean()
hub_lon = df["longitude"].mean()
df["dist_to_hub_km"] = haversine(df["latitude"], df["longitude"], hub_lat, hub_lon)
print(f"  dist_to_hub_km range    : {df['dist_to_hub_km'].min():.2f} – {df['dist_to_hub_km'].max():.2f} km")

# Supply/demand ratio
df["order_per_rider"]      = df["avg_orders_last_2w"] / (df["avg_active_riders_last_2w"] + 1)
df["supply_demand_gap"]    = df["total_active_riders_week"] - df["avg_active_riders_last_2w"]

# Weather risk composite score
df["weather_risk_score"]   = (
    df["rainfall_mm"] * 0.3 +
    df["extreme_heat_hours_week"] * 0.25 +
    df["heavy_rain_hours_week"] * 0.25 +
    (df["aqi"] / 100) * 0.2
)

# Rider variability ratio
df["rider_variability"]    = df["rider_std_last_2w"] / (df["avg_active_riders_last_2w"] + 1)
df["order_variability"]    = df["order_std_last_2w"]  / (df["avg_orders_last_2w"] + 1)

# Rolling claim rate (claims per active rider)
df["claim_rate_per_rider"] = df["num_claims_last_week"] / (df["total_active_riders_week"] + 1)

# Earnings vs regional mean per geo_cluster
cluster_mean_earn          = df.groupby("geo_cluster")["avg_earning_per_hour_last2w"].transform("mean")
df["earnings_vs_cluster"]  = df["avg_earning_per_hour_last2w"] - cluster_mean_earn

print(f"  Engineered features     : 8 new columns added\n")

# ─────────────────────────────────────────────
# 4. FEATURE MATRIX
# ─────────────────────────────────────────────
FEATURE_COLS = [
    # Raw geo
    "latitude", "longitude", "dist_to_hub_km", "geo_cluster",
    # Operations
    "avg_orders_last_2w", "avg_distance_km_last_2w",
    "order_std_last_2w", "order_variability",
    # Rider supply
    "avg_active_riders_last_2w", "rider_std_last_2w",
    "total_active_riders_week", "rider_variability",
    "supply_demand_gap", "order_per_rider",
    # Earnings
    "avg_earning_per_hour_last2w", "earnings_vs_cluster",
    # Weather
    "temperature_c", "rainfall_mm", "humidity_percent",
    "aqi", "extreme_heat_hours_week", "heavy_rain_hours_week",
    "weather_risk_score",
    # Claims history
    "num_claims_last_week", "claim_rate_per_rider",
]

TARGET_COLS = ["t_delivery_cost", "t_payout_viable", "t_claims_estimate"]

X = df[FEATURE_COLS]
y = df[TARGET_COLS]

print(f"  Feature matrix shape    : {X.shape}")
print(f"  Target matrix shape     : {y.shape}\n")

# ─────────────────────────────────────────────
# 5. GEO-STRATIFIED TRAIN/TEST SPLIT
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 4 — Geo-stratified train/test split")
print("=" * 60)

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=df["geo_cluster"]          # split by geo cluster, not random
)
print(f"  Train size : {X_train.shape[0]}")
print(f"  Test size  : {X_test.shape[0]}\n")

# ─────────────────────────────────────────────
# 6. MODEL DEFINITION
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 5 — Building MultiOutputRegressor + XGBoost")
print("=" * 60)

base_xgb = xgb.XGBRegressor(
    n_estimators      = 500,
    learning_rate     = 0.05,
    max_depth         = 6,
    subsample         = 0.8,
    colsample_bytree  = 0.8,
    reg_alpha         = 0.1,       # L1 regularisation
    reg_lambda        = 1.0,       # L2 regularisation
    min_child_weight  = 3,
    random_state      = RANDOM_STATE,
    n_jobs            = -1,
    verbosity         = 0,
)

model = MultiOutputRegressor(base_xgb, n_jobs=-1)
print(f"  Base estimator          : XGBRegressor")
print(f"  Wrapper                 : MultiOutputRegressor (3 heads)")
print(f"  n_estimators            : 500")
print(f"  learning_rate           : 0.05")
print(f"  max_depth               : 6\n")

# ─────────────────────────────────────────────
# 7. TRAINING
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 6 — Training")
print("=" * 60)

model.fit(X_train, y_train)
print("  Training complete.\n")

# ─────────────────────────────────────────────
# 8. EVALUATION
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 7 — Evaluation on hold-out test set")
print("=" * 60)

y_pred = model.predict(X_test)
y_pred_df = pd.DataFrame(y_pred, columns=TARGET_COLS, index=y_test.index)

# — Target 1: Delivery cost (regression)
t1_mae  = mean_absolute_error(y_test["t_delivery_cost"], y_pred_df["t_delivery_cost"])
t1_rmse = np.sqrt(mean_squared_error(y_test["t_delivery_cost"], y_pred_df["t_delivery_cost"]))
t1_r2   = r2_score(y_test["t_delivery_cost"], y_pred_df["t_delivery_cost"])
print(f"  TARGET 1 — Delivery cost estimate")
print(f"    MAE  : {t1_mae:.2f}")
print(f"    RMSE : {t1_rmse:.2f}")
print(f"    R²   : {t1_r2:.4f}\n")

# — Target 2: Payout viability (threshold at 0.5 for binary)
t2_raw   = y_pred_df["t_payout_viable"]
t2_binary = (t2_raw >= 0.5).astype(int)
t2_f1    = f1_score(y_test["t_payout_viable"], t2_binary)
try:
    t2_auc = roc_auc_score(y_test["t_payout_viable"], t2_raw)
except Exception:
    t2_auc = float("nan")
print(f"  TARGET 2 — Payout viability (binary)")
print(f"    F1-score : {t2_f1:.4f}")
print(f"    AUC-ROC  : {t2_auc:.4f}")
print(classification_report(y_test["t_payout_viable"], t2_binary, target_names=["Not viable", "Viable"]))

# — Target 3: Claims estimate (regression)
t3_mae  = mean_absolute_error(y_test["t_claims_estimate"], y_pred_df["t_claims_estimate"])
t3_rmse = np.sqrt(mean_squared_error(y_test["t_claims_estimate"], y_pred_df["t_claims_estimate"]))
t3_r2   = r2_score(y_test["t_claims_estimate"], y_pred_df["t_claims_estimate"])
print(f"  TARGET 3 — Claims next week estimate")
print(f"    MAE  : {t3_mae:.2f}")
print(f"    RMSE : {t3_rmse:.2f}")
print(f"    R²   : {t3_r2:.4f}\n")

# ─────────────────────────────────────────────
# 9. CROSS-VALIDATION (Target 1 as representative)
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 8 — Cross-validation (5-fold, target 1)")
print("=" * 60)

cv_model = MultiOutputRegressor(
    xgb.XGBRegressor(
        n_estimators=300, learning_rate=0.05,
        max_depth=6, random_state=RANDOM_STATE,
        verbosity=0, n_jobs=-1
    ), n_jobs=-1
)

kf = KFold(n_splits=CV_FOLDS, shuffle=True, random_state=RANDOM_STATE)
cv_scores = cross_val_score(cv_model, X, y[["t_delivery_cost"]], cv=kf, scoring="r2", n_jobs=-1)
print(f"  CV R² scores   : {np.round(cv_scores, 4)}")
print(f"  Mean R²        : {cv_scores.mean():.4f}")
print(f"  Std R²         : {cv_scores.std():.4f}\n")

# ─────────────────────────────────────────────
# 10. SHAP FEATURE IMPORTANCE (Target 1)
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 9 — SHAP feature importance (delivery cost head)")
print("=" * 60)

try:
    estimator_t1 = model.estimators_[0]
    explainer    = shap.TreeExplainer(estimator_t1)
    shap_values  = explainer.shap_values(X_test)

    fig, ax = plt.subplots(figsize=(10, 8))
    shap.summary_plot(
        shap_values, X_test,
        feature_names=FEATURE_COLS,
        plot_type="bar",
        show=False,
        max_display=20
    )
    shap_path = os.path.join(OUTPUT_DIR, "shap_feature_importance.png")
    plt.tight_layout()
    plt.savefig(shap_path, dpi=150, bbox_inches="tight")
    plt.close()
    print(f"  SHAP plot saved → {shap_path}\n")

    # Top 10 features by mean |SHAP|
    mean_shap = np.abs(shap_values).mean(axis=0)
    shap_df   = pd.DataFrame({
        "feature"   : FEATURE_COLS,
        "mean_shap" : mean_shap
    }).sort_values("mean_shap", ascending=False).head(10)
    print(shap_df.to_string(index=False))
    print()
except Exception as e:
    print(f"  SHAP skipped: {e}\n")

# ─────────────────────────────────────────────
# 11. SAVE MODEL + ARTIFACTS
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 10 — Saving model and artifacts")
print("=" * 60)

joblib.dump(model,  MODEL_SAVE_PATH)
joblib.dump(kmeans, os.path.join(OUTPUT_DIR, "geo_kmeans.pkl"))

print(f"  Model saved  → {MODEL_SAVE_PATH}")
print(f"  KMeans saved → {os.path.join(OUTPUT_DIR, 'geo_kmeans.pkl')}\n")

# ─────────────────────────────────────────────
# 12. INFERENCE EXAMPLE
# ─────────────────────────────────────────────
print("=" * 60)
print("STEP 11 — Sample inference on 5 test rows")
print("=" * 60)

sample      = X_test.iloc[:5]
preds_raw   = model.predict(sample)
preds_df    = pd.DataFrame(preds_raw, columns=TARGET_COLS)
preds_df["t_payout_viable_flag"] = (preds_df["t_payout_viable"] >= 0.5).astype(int)
preds_df["darkstore_id"]         = df.loc[sample.index, "darkstore_id"].values

print(preds_df[["darkstore_id", "t_delivery_cost", "t_payout_viable_flag", "t_claims_estimate"]].to_string(index=False))

# ─────────────────────────────────────────────
# 13. LOADING + RE-USING (example)
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("STEP 12 — How to load and reuse the saved model")
print("=" * 60)
print("""
  # In any downstream script:
  import joblib, pandas as pd

  model  = joblib.load('/mnt/user-data/outputs/multioutput_xgb_model.pkl')
  kmeans = joblib.load('/mnt/user-data/outputs/geo_kmeans.pkl')

  # Prepare new_df the same way (run feature engineering steps)
  preds = model.predict(new_df[FEATURE_COLS])
  # preds[:, 0] → delivery cost
  # preds[:, 1] → payout viability score (threshold at 0.5)
  # preds[:, 2] → claims estimate
""")

print("=" * 60)
print("Pipeline complete.")
print("=" * 60)
