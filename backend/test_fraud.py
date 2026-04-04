import sys
import numpy as np
import joblib

model = joblib.load(r"e:\Aegesis\models\fraud_model\fraud_model.pkl")

# Indro's features after unflag_riders:
features = np.array([[
    0.0,    # distance_jump_km
    300.0,  # time_delta_sec
    0.0,    # speed_kmph
    0,      # claims_last_10min
    0,      # claims_last_1hr
    1.0,    # ip_subnet_count
    1.0,    # device_uniqueness_score
    1.0,    # geo_fence_match
    0.0,    # distance_from_event_km
    0.0,    # burst_activity_flag
]], dtype=np.float32)

raw = float(model.decision_function(features)[0])
print(f"Raw Score: {raw}")
clamped = max(-0.5, min(0.5, raw))
score = 1.0 - ((clamped + 0.5) / 1.0)
print(f"Final Score: {score}")

# Let's test a more "normal" sounding feature with small GPS jitter
features2 = np.array([[
    0.15,   # distance_jump_km
    300.0,  # time_delta_sec
    1.8,    # speed_kmph
    0,      
    0,      
    1.0,    
    1.0,    
    1.0,    
    1.2,    # distance from event
    0.0,    
]], dtype=np.float32)

raw2 = float(model.decision_function(features2)[0])
print(f"Raw Score 2: {raw2}")
clamped2 = max(-0.5, min(0.5, raw2))
score2 = 1.0 - ((clamped2 + 0.5) / 1.0)
print(f"Final Score 2: {score2}")

