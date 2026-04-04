# Aegesis ML Engine

This repository contains the core machine learning systems powering a real-time parametric insurance backend. The system is designed to **price risk dynamically**, **validate payout eligibility**, and **prevent fraudulent claims at scale**.

---

## Overview

The ML layer is composed of three independent but connected models:

1. **Payout Eligibility Model**  
2. **Dynamic Premium Subscription Model**  
3. **Fraud Detection Model**  

Together, they form a complete decision pipeline:


Event → Eligibility Check → Fraud Validation → Payout Execution


---

## 1. Payout Eligibility Model

### Purpose
Determines whether a user is **eligible for a payout** when a disruption event (e.g., flood) is triggered.

### Key Logic

This is a **rule-based system**, not purely ML-driven.

#### Checks performed:
- User is within disaster geo-fence  
- GPS movement is physically valid  
- Policy is active  
- 48-hour time lock is satisfied  

### Input
- User GPS data  
- Event geo-coordinates  
- Policy metadata  

### Output

eligible / not eligible


### Role in System
Acts as the **first gatekeeper** before any financial computation.

---

## 2. Dynamic Premium Subscription Model

### Purpose
Calculates **weekly insurance premium (₹)** based on real-time risk.

### Model
XGBoost Regressor

### Input Features
- rainfall_7d  
- rainfall_forecast_7d  
- flood_index  
- zone_risk  
- claim_density  
- avg_distance_km  
- time_in_risk_zone  

### Output

predicted_expected_loss → premium_price


### Pricing Logic

premium = expected_loss + margin + safety_buffer


### Key Characteristics
- Adaptive to environmental changes  
- Zone-aware pricing  
- Non-linear risk modeling  

### Role in System
Controls **money inflow** into the insurance pool.

---

## 3. Fraud Detection Model (Market Crash Prevention)

### Purpose
Detects **anomalous claim behavior** and prevents large-scale financial exploitation.

### Model
Isolation Forest

### Input Features
- distance_jump_km  
- time_delta_sec  
- speed_kmph  
- claims_last_10min  
- claims_last_1hr  
- ip_subnet_count  
- device_uniqueness_score  
- geo_fence_match  
- distance_from_event_km  
- burst_activity_flag  

### Output

anomaly_score → [0,1]


### Decision Logic

score < threshold → allow
score ≥ threshold → freeze


### Key Capabilities
- Detects GPS spoofing  
- Identifies bot swarm attacks  
- Flags abnormal claim bursts  
- Prevents coordinated fraud  

### Role in System
Protects **money outflow** and ensures system stability.

---

## System Flow

Event Trigger (Flood / Disruption)
Payout Eligibility Model validates user
Fraud Detection Model verifies legitimacy
Dynamic Premium Model ensures pricing integrity
Execution Engine processes payout

---

## Project Structure


ml_pipelines/
├── pricing.py # XGBoost model (premium calculation)
├── fraud_detection.py # Isolation Forest model
├── eligibility.py # Rule-based eligibility checks
├── models/
│ ├── pricing_model.pkl
│ └── fraud_model.pkl


---

## Key Design Principles

- **Separation of concerns**
  - Pricing, fraud, and eligibility are independent  

- **Plug-and-play ML**
  - Models can be swapped without affecting backend  

- **Fail-safe architecture**
  - Fraud detection acts as final defense layer  

---

## Usage

### Pricing
```python
get_predicted_loss(input_features)
Fraud Detection
detect_anomaly(input_features)
Eligibility
check_payout_eligibility(user, event)
Notes
Synthetic datasets are used for initial training
Models are designed for seamless upgrade to real-world data
Architecture supports scaling to production systems (Redis, PostgreSQL, SageMaker)
Final Statement

This ML system is designed not just to predict, but to control financial flow in real-time systems:

Pricing model → earns money
Eligibility model → validates claims
Fraud model → protects capital

Together, they form a robust, production-oriented decision engine.
