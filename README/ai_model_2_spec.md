# AI Model 2: Actionable Payout Engine (Q-Commerce)

## 1. Objective
An automated execution model designed to execute "zero-touch" insurance claims exclusively for Quick Commerce (Q-commerce) delivery partners. When a public API reports an active disruption, this model verifies localized eligibility using geospatial radius constraints, calculates the exact loss of income, and applies a **Dynamic Coverage %** filter to ensure the sustainability of the liquidity pool.

## 2. Dynamic Coverage % (Sustainability Filter)
To protect the ₹6.45 Cr liquidity fund during major catastrophic events (Red Zones) where thousands of riders might be affected simultaneously, Aegesis uses a tiered coverage model:
*   🟢 **Green Zone Payouts**: **50%** of loss covered.
*   🟠 **Orange Zone Payouts**: **45%** of loss covered.
*   🔴 **Red Zone Payouts**: **35%** of loss covered.

## 3. The 4 Automated Event Triggers (Directly Mapped to Model 1 Forecasts)
Model 2 continuously listens to external data streams. An execution is only initiated when one of the following APIs fire an anomaly payload, perfectly mirroring the prediction categories from Model 1:

**Category A: Environmental Triggers**
1. **IMD Severe Weather API:** > 60mm continuous rain or active flash flood alert.
2. **IMD Extreme Heat API:** Urban temperatures exceeding 45°C.

**Category B: Socio-Political & Platform Triggers**
3. **News Sentiment / Traffic APIs (NLP):** Sudden volumetric spikes in localized keywords like "Transport Strike", "Road Blockade", or "Protests".
4. **Q-Commerce Platform Suspension Oracle (The "Killer Feature"):** By monitoring Zepto/Blinkit backend status APIs, we detect when ordering is temporarily suspended in a specific grid due to surge or weather. If the platform officially halts ordering, it acts as infallible proof the rider cannot earn, eliminating all guesswork.

## 4. The Geospatial Eligibility Filter (Radius Constraint)
To prevent bleeding funds and ensure pinpoint accuracy, **we do not pay everyone in the affected macro-zone**. 

When a trigger fires, the API payload must provide a coordinate epicenter (`latitude`, `longitude`). The system executes a **Haversine Distance / PostGIS Radius Query**:
* **The Rule:** Only active riders who have pinged their background GPS within a `2.5 km` (configurable) radius of the disruption epicenter at the time of the event are eligible.
* **Why?** In Q-commerce, a protest at a major junction halts deliveries for riders actively routing through that specific intersection, but a rider 8 km away in the same "Zone" is entirely unaffected and should not receive a payout.

## 5. ML Model Parameters (Features for Calculation)

If a rider passes the Radius Eligibility Filter, the model calculates their exact compensation using:

**Inputs (Features):**
1. `historical_hourly_wage` (Float): The rider's calculated average earnings for that specific day of the week and time frame (e.g., Friday 8 PM = ₹150/hr).
2. `disruption_duration_hours` (Float): The exact runtime of the API trigger (e.g., 3.5 hours).
3. `severity_multiplier` (Float, 1.0 to 2.0): Provided by the trigger API. (e.g., General waterlogging = 1.0x, but an active violent strike where vehicles are at risk = 1.5x).

**Target Variable (y):**
- `settlement_payout_inr` (Float): The exact final monetary compensation released to Razorpay.

## 6. The Algorithm & Logic 

Instead of flat-rate payouts, the model ensures the partner is made whole based on the active risk coverage of the zone.

**Formula:**
`Base Income Loss = (historical_hourly_wage * disruption_duration_hours) * severity_multiplier`
`Final Payout = Base Income Loss * Coverage_Percentage`

## 7. Technical Implementation (MVP Blueprint)
For the Phase 2 backend (Python / FastAPI):
```python
from math import radians, cos, sin, asin, sqrt

def haversine_distance(lon1, lat1, lon2, lat2):
    # Calculates the great-circle distance between two points on Earth
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1 
    dlat = lat2 - lat1 
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a)) 
    r = 6371 # Radius of earth in kilometers
    return c * r

def calculate_model_2_payout(rider_lat: float, rider_lon: float, 
                             trigger_category: str, trigger_lat: float, trigger_lon: float,
                             zone_category: str, wage: float, duration: float, severity: float) -> float:
    
    # 1. Geospatial Radius Constraint (< 2.5 km)
    distance = haversine_distance(rider_lon, rider_lat, trigger_lon, trigger_lat)
    
    # Platform suspensions (Zepto/Blinkit) might affect the entire Pincode regardless of 2.5km epicenter.
    if distance > 2.5 and trigger_category != "APP_SUSPENSION_ORACLE":
        # Rider is completely outside the affected Q-commerce blast radius
        return 0.0
        
    # 2. Dynamic Coverage Calculation (Sustainability Factor)
    coverage_map = {"GREEN": 0.50, "ORANGE": 0.45, "RED": 0.35}
    coverage_pct = coverage_map.get(zone_category.upper(), 0.35)

    # 3. Payout Execution Logic
    # Base loss includes severity (e.g. 1.5x strike penalty)
    base_loss = (wage * duration) * severity
    final_payout = base_loss * coverage_pct
    
    return round(final_payout, 2)

# --- Example Evaluation ---
# A rider making ₹120/hour is 1.1km away from an active RED ZONE flood (1.0 severity) lasting 3 hours
# base_loss = (120 * 3) * 1.0 = 360
# final_payout = 360 * 0.35 (Red Zone Coverage) = ₹126.00 payout via Zero-Touch Claim
```
