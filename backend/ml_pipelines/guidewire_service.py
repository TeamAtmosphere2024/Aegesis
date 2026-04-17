import joblib
import pandas as pd
import numpy as np
from pathlib import Path
import logging

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
GW_DIR = BASE_DIR / "GuideWire_MultiOUTPUT'"
MODEL_PATH = GW_DIR / "outputs" / "multioutput_xgb_model.pkl"
KMEANS_PATH = GW_DIR / "outputs" / "geo_kmeans.pkl"
DATA_PATH = GW_DIR / "final_fixed_dataset_no_target.csv"

logger = logging.getLogger("aegesis")

# Global Singletons
_model = None
_kmeans = None
_data_ref = None
_cluster_stats = None

def haversine_vec(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1, phi2 = np.radians(lat1), np.radians(lat2)
    dphi = np.radians(lat2 - lat1)
    dlambda = np.radians(lon2 - lon1)
    a = np.sin(dphi/2)**2 + np.cos(phi1)*np.cos(phi2)*np.sin(dlambda/2)**2
    return 2 * R * np.arctan2(np.sqrt(a), np.sqrt(1-a))

def initialize_ml_if_needed():
    global _model, _kmeans, _data_ref, _cluster_stats
    if _model is not None:
        return True
    
    try:
        if not MODEL_PATH.exists():
            return False
            
        _model = joblib.load(MODEL_PATH)
        _kmeans = joblib.load(KMEANS_PATH)
        _data_ref = pd.read_csv(DATA_PATH)
        _data_ref["geo_cluster"] = _kmeans.predict(_data_ref[["latitude", "longitude"]])
        _cluster_stats = _data_ref.groupby("geo_cluster").mean(numeric_only=True)
        
        logger.info("🚀 Financial Intelligence Engine Ready.")
        return True
    except Exception as e:
        logger.error(f"Init Error: {e}")
        return False

FEATURE_COLS = [
    "latitude", "longitude", "dist_to_hub_km", "geo_cluster",
    "avg_orders_last_2w", "avg_distance_km_last_2w",
    "order_std_last_2w", "order_variability",
    "avg_active_riders_last_2w", "rider_std_last_2w",
    "total_active_riders_week", "rider_variability",
    "supply_demand_gap", "order_per_rider",
    "avg_earning_per_hour_last2w", "earnings_vs_cluster",
    "temperature_c", "rainfall_mm", "humidity_percent",
    "aqi", "extreme_heat_hours_week", "heavy_rain_hours_week",
    "weather_risk_score",
    "num_claims_last_week", "claim_rate_per_rider",
]

def predict_dark_store_insights(dark_stores):
    """
    ULTRA-OPTIMIZED Vectorized Inference with Financial Loss/Gain Modeling.
    """
    if not initialize_ml_if_needed() or not dark_stores:
        return []

    # 1. Convert DB objects to DataFrame
    ds_data = []
    for ds in dark_stores:
        if ds.lat and ds.lon:
            ds_data.append({"id": ds.id, "name": ds.name, "city": ds.city, "lat": ds.lat, "lon": ds.lon})
    
    if not ds_data: return []
    df_live = pd.DataFrame(ds_data)
    
    # 2. Vectorized Assignments
    hub_lat, hub_lon = _data_ref["latitude"].mean(), _data_ref["longitude"].mean()
    df_live["geo_cluster"] = _kmeans.predict(df_live[["lat", "lon"]])
    df_live["dist_to_hub_km"] = haversine_vec(df_live["lat"], df_live["lon"], hub_lat, hub_lon)
    
    df_features = df_live.merge(_cluster_stats, left_on="geo_cluster", right_index=True, how="left")
    df_features["latitude"] = df_live["lat"]
    df_features["longitude"] = df_live["lon"]

    # 3. Vectorized Math
    df_features["order_per_rider"]      = df_features["avg_orders_last_2w"] / (df_features["avg_active_riders_last_2w"] + 1)
    df_features["supply_demand_gap"]    = df_features["total_active_riders_week"] - df_features["avg_active_riders_last_2w"]
    df_features["weather_risk_score"]   = (
        df_features["rainfall_mm"] * 0.3 +
        df_features["extreme_heat_hours_week"] * 0.25 +
        df_features["heavy_rain_hours_week"] * 0.25 +
        (df_features["aqi"] / 100) * 0.2
    )
    df_features["rider_variability"]    = df_features["rider_std_last_2w"] / (df_features["avg_active_riders_last_2w"] + 1)
    df_features["order_variability"]    = df_features["order_std_last_2w"]  / (df_features["avg_orders_last_2w"] + 1)
    df_features["claim_rate_per_rider"] = df_features["num_claims_last_week"] / (df_features["total_active_riders_week"] + 1)
    df_features["earnings_vs_cluster"]  = 0.0

    # 4. Inference
    X = df_features[FEATURE_COLS].fillna(0)
    all_preds = _model.predict(X) 
    
    # 5. Financial Modeling (Projected for next week)
    # AVG_PAYOUT_INR = 500 (Simulated claim cost)
    # REVENUE_PER_ORDER = 40 (Platform margin)
    avg_payout = 500
    margin = 40
    
    results = []
    for i, row in df_live.iterrows():
        preds = all_preds[i]
        
        # Financial Metrics
        projected_claims = round(preds[2])
        projected_loss   = projected_claims * avg_payout
        
        # Projected Gain (Operational Efficiency gain vs Baseline cost)
        baseline_cost = df_features.iloc[i]["avg_distance_km_last_2w"] * 20 # Baseline comparison
        predicted_cost = preds[0]
        projected_gain = max(0, (baseline_cost - predicted_cost) * df_features.iloc[i]["avg_orders_last_2w"])
        
        results.append({
            "id": int(row["id"]),
            "name": str(row["name"]),
            "city": str(row["city"]),
            "predicted_delivery_cost": float(preds[0]),
            "payout_viability_score": float(preds[1]),
            "is_payout_viable": bool(preds[1] >= 0.5),
            "forecasted_claims_next_week": int(projected_claims),
            "weather_risk_index": float(df_features.iloc[i]["weather_risk_score"]),
            "operational_efficiency": "High" if preds[1] > 0.7 else ("Normal" if preds[1] > 0.4 else "At Risk"),
            "projected_loss": float(projected_loss),
            "projected_gain": float(projected_gain),
            "net_impact": float(projected_gain - projected_loss)
        })
        
    return results
