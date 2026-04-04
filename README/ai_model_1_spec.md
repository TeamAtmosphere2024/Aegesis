# AI Model 1: Dynamic Premium Subscriptions (Q-Commerce)

## 1. Objective
A Machine Learning regression model designed to calculate hyper-local, dynamically priced weekly insurance premiums specifically for **Quick Commerce (Q-Commerce) 2-wheeler delivery partners**. The model evaluates multifaceted disruption forecasts (weather and socio-political), geospatial history, and weekly behavioral metrics (DPDT) to determine a fair price that combats moral hazard. Since Q-Commerce is exclusively 2-wheelers, vehicle variations are omitted.

## 2. ML Model Parameters (Features & Target)

To train or simulate this model, the following parameters are used:

**Input Features (X):**
1. `historical_zone_risk_score` (Float, 0.0 to 1.0): A numerical score of the rider's primary working grid based on historical disruption frequency.
2. `predictive_environmental_risk` (Float, 0.0 to 1.0): The forecasted probability of **Category A Disruptions** over the upcoming 7 days (e.g., severe rain, floods, extreme heatwaves).
3. `predictive_sociopolitical_risk` (Float, 0.0 to 1.0): The forecasted probability of **Category B Disruptions** over the upcoming 7 days (e.g., sudden transport strikes, local protests, platform/app suspensions).
4. `dpdt_pct` (Float, 0.0 to 100.0): Delivery Percentage During Triggers. A behavioral metric measuring the rider's dedication during past disruptive events. This is **recalculated every week** so the driver has a fair, immediate opportunity to increase their DPDT and reduce their upcoming insurance premium.

**Target Variable (y):**
- `weekly_premium_inr` (Float): The computed weekly subscription cost in INR.

## 3. The Algorithm & Logic 

The pricing pipeline calculates a base risk subtotal derived from the environmental and socio-political parameters, and then applies a behavioral correction penalty using the weekly DPDT index.

### Step 1: Base Factor & Zone Penalties
The system maps the combination of `historical_zone_risk_score` and total predictive risks into categorical zones to determine the subtotal:
* **Base Minimum Premium:** ₹60 / week
* **Green Zone (Clear environmental & political forecast, safe grid):** +₹0
* **Orange Zone (Moderate heat/rain predictions, isolated localized protests):** +₹24
* **Red Zone (Severe floods, city-wide strikes, extreme heat, high likelihood of Q-commerce App Suspensions):** +₹45

**[ Calculation: The Subtotal ]**
`Subtotal = Base Premium + Zone Penalty`

### Step 2: The Behavioral Correction (DPDT)
The system calculates the final premium by penalizing "fair-weather" workers who only drive when it is perfectly safe but still expect active insurance coverage when they log off during extreme heat or protests. By calculating this weekly, riders are incentivized to hustle through minor disruptions to lower their subcription cost next week.

**Formula:**
`Final Weekly Premium = Subtotal + [ (100% - DPDT%) * Subtotal ]`

## 4. Market & Business Justification
This model is deeply appealing to commercial underwriters and investors for two reasons:
1. **Prevents Adverse Selection:** We ensure that strictly fair-weather drivers subsidize the pool organically via the DPDT multiplier. 
2. **Rewards Resilience ("Protect Your Worker"):** Hard-working drivers with a 100% DPDT rate are mathematically rewarded with the base-bottom minimum premium without deductions. They prove they do not easily abandon shifts, lowering the likelihood of filing minor loss-of-income claims.

## 5. Technical Implementation (MVP Blueprint)
For the Phase 2 backend (Python / FastAPI):
```python
def calculate_model_1_premium(historical_zone_risk_score: float, 
                              predictive_environmental_risk: float, 
                              predictive_sociopolitical_risk: float, 
                              dpdt_pct: float) -> float:
    # Base Constants
    BASE = 60.0
    
    # 1. Zone Penalty Evaluation (Mocked XGBoost Output)
    # The Model aggregates the chance of any Category A or Category B event happening this week.
    combined_predictive_risk = max(predictive_environmental_risk, predictive_sociopolitical_risk)
    
    if combined_predictive_risk > 0.7 or historical_zone_risk_score > 0.8:
        zone_penalty = 45.0 # RED ZONE (e.g., Major Strike or Flood expected)
    elif combined_predictive_risk > 0.4 or historical_zone_risk_score > 0.5:
        zone_penalty = 24.0 # ORANGE ZONE (e.g., Moderate Heatwave or Traffic Disruption)
    else:
        zone_penalty = 0.0  # GREEN ZONE (Clear operational skies)
    
    # Subtotal
    subtotal = BASE + zone_penalty
    
    # 2. Behavioral Correction (Weekly DPDT Penalty)
    dpdt_factor = (100.0 - dpdt_pct) / 100.0
    dpdt_penalty = subtotal * dpdt_factor
    
    final_premium = subtotal + dpdt_penalty
    
    return round(final_premium, 2)

# --- Example Evaluation ---
# Red Zone rider (City-wide strike forecasted), works 80% DPDT.
# subtotal = 60 + 45 = 105
# diff = (100 - 80) = 20%
# penalty = 105 * 0.20 = 21.00
# final = 126.00
```