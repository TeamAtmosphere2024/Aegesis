# Multi-Output XGBoost Training Pipeline

## Overview

This project implements a **multi-output machine learning pipeline** using XGBoost to predict key operational metrics for logistics/delivery systems (e.g., dark stores, rider networks).

The model simultaneously predicts:

1. **Delivery Cost Estimate** (Regression)
2. **Payout Viability** (Binary Classification)
3. **Claims Next Week Estimate** (Regression)

The pipeline includes **feature engineering, geo-clustering, training, evaluation, and explainability (SHAP)**.

---

## Problem Statement

Logistics platforms need to optimize:

* Delivery costs
* Rider earnings viability
* Operational risk (customer claims/issues)

This model provides a **data-driven decision system** to support these objectives.

---

## Project Structure

```
GuideWire_MultiOUTPUT/
│
├── train.py
├── final_fixed_dataset_no_target.csv
├── outputs/
│   ├── multioutput_xgb_model.pkl
│   ├── geo_kmeans.pkl
│   ├── shap_feature_importance.png
│
└── README.md
```

---

## Input Data

The pipeline expects a CSV file:

```
final_fixed_dataset_no_target.csv
```

### Key Features

* **Geo:** latitude, longitude
* **Operations:** orders, distance, variability
* **Rider Supply:** active riders, rider variability
* **Earnings:** avg earning per hour
* **Weather:** rainfall, AQI, heat hours
* **Claims:** historical claims data

---

## Feature Engineering

The pipeline derives additional features:

* Geo clustering (KMeans)
* Distance to central hub (Haversine)
* Supply-demand metrics
* Weather risk score
* Rider & order variability
* Claims per rider
* Earnings vs cluster average

---

## Targets

| Target              | Type       | Description             |
| ------------------- | ---------- | ----------------------- |
| `t_delivery_cost`   | Regression | Proxy for delivery cost |
| `t_payout_viable`   | Binary     | 1 if earnings ≥ median  |
| `t_claims_estimate` | Regression | Proxy for future claims |

---

## Model Architecture

* Base model: **XGBoost Regressor**
* Wrapper: **MultiOutputRegressor**

This allows training **3 prediction heads simultaneously** using the same feature set.

---

## Installation

### 1. Create virtual environment

```bash
python -m venv .venv
source .venv/bin/activate.fish   # fish shell
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

If no requirements file:

```bash
pip install numpy pandas scikit-learn xgboost shap matplotlib joblib
```

---

## Configuration

Update paths in `train.py`:

```python
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

CSV_PATH = os.path.join(BASE_DIR, "final_fixed_dataset_no_target.csv")
OUTPUT_DIR = os.path.join(BASE_DIR, "outputs")
```

---

## Running the Pipeline

```bash
python train.py
```

---

## Output

After execution:

### Model Artifacts

* `multioutput_xgb_model.pkl` → trained model
* `geo_kmeans.pkl` → geo clustering model

### Explainability

* `shap_feature_importance.png` → feature importance plot

### Console Metrics

* MAE, RMSE, R² for regression targets
* F1-score, AUC for classification
* Cross-validation scores

---

## Example Predictions

```
darkstore_id | delivery_cost | payout_viable | claims_estimate
------------------------------------------------------------
DS_101       | 145.2         | 1              | 3.1
DS_205       | 98.4          | 0              | 7.5
```

---

## How to Use the Model

```python
import joblib

model = joblib.load("outputs/multioutput_xgb_model.pkl")

preds = model.predict(new_data)

# Access outputs
delivery_cost = preds[:, 0]
payout_score  = preds[:, 1]
claims        = preds[:, 2]
```

---

## Limitations

* Targets are **proxy-based**, not true future labels
* No time-series modeling (pure tabular learning)
* No hyperparameter tuning (default config used)

---

## Future Improvements

* Replace proxies with real future labels
* Add time-series features (lags, rolling windows)
* Use separate models for classification/regression
* Hyperparameter tuning (Optuna)
* Deploy as API (FastAPI)

---

## Use Cases

* Logistics optimization
* Rider payout planning
* Risk forecasting
* Dark store performance analysis

---

## Author

Rimil Bhattacharya

---

