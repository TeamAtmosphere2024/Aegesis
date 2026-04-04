# 🚀 Aegesis Phase 2 Execution & Integration Plan

This document outlines everything needed to execute the Phase 2 Minimum Viable Product (MVP) for the **Guidewire DEVTrails** hackathon. Aegesis is an **AI-Powered Parametric Insurance Platform** built exclusively for **Quick Commerce (Q-Commerce) 2-wheeler delivery partners** (Zepto / Blinkit). It is structured to allow a seamless upgrade into the commercial product described in the **Final Startup Roadmap** (Month 1 - 3).

---

## 🏗️ 1. Tech Stack (Phase 2 MVP vs. Production Upgrade)

We are selecting an MVP tech stack that maps perfectly 1-to-1 with your final Day 90 startup stack, ensuring no throwaway code.

| Component | Phase 2 MVP (Now) | Startup Roadmap Upgrade Path (Day 31+) |
| :--- | :--- | :--- |
| **Frontend** | **React Native (Expo)** - Fast prototyping | **React Native (Bare Workflow)** - Native Swift/Kotlin for Aadhaar eKYC |
| **Backend** | **Python FastAPI** - Async speed, ML ready | **Dockerized FastAPI** on Kubernetes (AWS EKS) |
| **Database** | **SQLite** - Local, zero-config, portable | **Amazon RDS (PostgreSQL + PostGIS)** for massive geospatial scale |
| **AI / ML** | **Scikit-Learn (Local)** - 3 Python ML pipelines | **AWS SageMaker** - Nightly batch jobs & live inference |
| **Event Stream** | **FastAPI Background Tasks** | **Redis Streams (Amazon ElastiCache)** - Non-blocking queues |

---

## 📐 2. End-to-End System Architecture

This outlines the complete architecture, visualizing how data flows from the Q-commerce rider's pocket, through security boundaries, into our 3 AI models, and out to their Razorpay wallet.

```mermaid
flowchart TD
    %% END USER LAYER (Q-Commerce Rider App)
    subgraph UI ["📱 1. Client Access Layer (React Native)"]
        RiderApp["🏇 Q-Commerce Rider App"]
        BackgroundGPS["📍 Background GPS Service (Continuous)"]
        Biometric["🔐 Simulated KYC & Hub Assignment"]
    end

    %% INGESTION & GATEWAY LAYER
    subgraph Gateway ["🚪 2. Ingestion & API Gateway"]
        Auth["🔑 JWT API Security"]
        Webhook["⚓ FastAPI Webhook Receiver"]
        API["⚡ FastAPI REST Endpoints"]
    end

    %% EXTERNAL PLUGINS (Data Sources) - Category A & B Triggers
    subgraph External ["🌍 3. External API Oracles (4 Triggers)"]
        IMD_Rain["🌧️ IMD Severe Weather API (Cat A)"]
        IMD_Heat["🔥 IMD Extreme Heat API (Cat A)"]
        News["📰 News Sentiment NLP (Cat B)"]
        Platform["📱 Q-Commerce App Suspension Oracle (Cat B)"]
    end

    %% REAL-TIME EVENT STREAMING
    subgraph Events ["🔄 4. Event Streaming"]
        GPSStream["📡 Continuous Location Topic"]
        DisruptionStream["⛈️ Disruption Alert Topic"]
        DPDTStream["📊 DPDT Tracker (Weekly Behavioral)"]
    end

    %% STATE MANAGEMENT (Database)
    subgraph Storage ["🗄️ 5. Persistent Storage & Grids"]
        GeoDB["🗺️ Geospatial Grid DB (Haversine 2.5km Radius)"]
        Ledger["📜 Policy, Claims & DPDT Ledger"]
        WageDB["💰 Historical Hourly Wage Store"]
    end

    %% MACHINE LEARNING LAYER (3 AI Models)
    subgraph Intelligence ["🧠 6. ML Inference Engines (3 Models)"]
        Model1["📈 Model 1: Dynamic Premium Engine"]
        Model2["💸 Model 2: Payout Calculator"]
        Model3["🛡️ Model 3: Fraud Defense (Isolation Forest)"]
    end

    %% EXECUTION LAYER
    subgraph Execution ["⚡ 7. Parametric Execution & Settlement"]
        CoverageFilter["📊 Dynamic Coverage % Filter"]
        Razorpay["💸 Razorpay UPI Payout"]
    end

    %% --- Connections ---

    %% Client to Gateway
    RiderApp -->|1. Sign-Up, Hub Assignment & Policy Fetch| API
    BackgroundGPS -.->|2. Async Encrypted Location Pings| Auth
    Biometric -->|Simulated KYC Binding| Auth

    %% Gateway Routing
    Auth --> Webhook & API
    Webhook -->|3. Route Trigger Payloads| DisruptionStream
    API -->|Read/Write Rider Data| Ledger

    %% External APIs Feeding the System
    IMD_Rain & IMD_Heat -->|7-Day Forecast (Cat A)| Model1
    News & Platform -->|Socio-Political Forecast (Cat B)| Model1
    External -.->|Live Trigger Webhook POST| Webhook

    %% GPS & DPDT Tracking
    Auth -->|Push Verified Lats/Longs| GPSStream
    GPSStream -->|Update Last Known Location| GeoDB
    GPSStream -->|Track Active Deliveries During Triggers| DPDTStream
    DPDTStream -->|Weekly DPDT % Recalculation| Ledger

    %% Model 1: Subscription Pricing (Every Monday)
    Ledger -->|Rider Zone + DPDT History| Model1
    Model1 -->|Calculate Weekly Premium e.g. ₹84| API

    %% Trigger → Model 2 → Model 3 → Payout
    DisruptionStream -->|4. Trigger Fires: Match Riders in 2.5km Radius| GeoDB
    GeoDB -->|5. Eligible Riders Found| Model2
    WageDB -->|Historical Hourly Wage for Day/Time| Model2
    Model2 -->|Base Income Loss Calculated| Model3

    %% Model 3: Fraud Gate
    GPSStream -->|Measure Max Distance Jump < 1km| Model3
    Model3 -->|6A. Valid Score < 0.6 = APPROVED| CoverageFilter
    Model3 -->|6B. Anomaly > 0.6 = FREEZE| Gateway

    %% Coverage % & Settlement
    CoverageFilter -->|7. Apply Zone Coverage (50/45/35%)| Razorpay
    Razorpay -.->|Receipt to Ledger| Ledger
    Razorpay -.->|8. Instant Push Notification| RiderApp

    %% Colors
    classDef mobile fill:#e1bee7,stroke:#4a148c,stroke-width:2px,color:#000
    classDef gate fill:#bbdefb,stroke:#0d47a1,stroke-width:2px,color:#000
    classDef ext fill:#c8e6c9,stroke:#1b5e20,stroke-width:2px,color:#000
    classDef stream fill:#ffecb3,stroke:#f57f17,stroke-width:2px,color:#000
    classDef db fill:#cfd8dc,stroke:#263238,stroke-width:2px,color:#000
    classDef ai fill:#f8bbd0,stroke:#880e4f,stroke-width:2px,color:#000
    classDef exec fill:#ffe0b2,stroke:#e65100,stroke-width:2px,color:#000

    class UI mobile
    class Gateway gate
    class External ext
    class Events stream
    class Storage db
    class Intelligence ai
    class Execution exec
```

### MVP Simulation Context

For the immediate Phase 2 executable codebase, this architecture simulates the following async flows:
1. **Client Device:** React Native app posts rider registration, hub assignment, and continuous GPS to the backend.
2. **API Layer:** FastAPI receives requests (simulating the future API Gateway).
3. **Trigger Simulation:** FastAPI exposes secure mock Webhook endpoints for all 4 triggers (IMD Rain, IMD Heat, News NLP, Platform Suspension).
4. **Geospatial Verification:** SQLite + Haversine formula handles the 2.5km radius logic (simulating PostGIS).
5. **DPDT Tracking:** Background task recalculates each rider's Delivery Percentage During Triggers weekly.
6. **Wallet Settlement:** Virtual wallet updates replace live Razorpay API calls for the 2-minute demo.

*Upgrade Note:* By using `async def` endpoints in FastAPI from Day 1, integrating Redis Streams in Month 2 will be a pure plug-and-play operation.

---

## 🔗 3. The Three AI Models & API Connectivity Architecture

This section details the direct data flow between the external plugins and the 3 core ML engines.

```mermaid
graph TD
    %% External Plugins Layer - 4 Triggers
    subgraph AL["External API Plugins (4 Automated Triggers)"]
        subgraph CatA["Category A: Environmental"]
            IMD_Rain["🌧️ IMD Severe Weather (>60mm Rain)"]
            IMD_Heat["🔥 IMD Extreme Heat (>45°C)"]
        end
        subgraph CatB["Category B: Socio-Political & Platform"]
            News["📰 News NLP (Strikes/Protests)"]
            AppOracle["📱 Zepto/Blinkit App Suspension Oracle"]
        end
    end

    %% API Gateway Layer
    Gateway["⚡ FastAPI Webhooks / Gateway"]
    AL --> Gateway

    %% Feature Processing Layer
    subgraph PL["Pipeline & Feature Enrichment"]
        GPS["📡 GPS Stream + DPDT Tracker"]
        SQLite["🗄️ SQLite (Rider Geofence + Wage + DPDT Ledger)"]
    end

    Gateway --> GPS
    GPS -.-> SQLite
    SQLite -.-> GPS

    %% Machine Learning Engines Layer - 3 Models
    subgraph ML["Machine Learning Inference Engines (3 Models)"]
        M1["📈 Model 1: Dynamic Premium Engine"]
        M2["💸 Model 2: Payout Calculator"]  
        M3["🛡️ Model 3: Fraud Defense (Isolation Forest)"]
    end

    %% Execution & Financial Layer
    subgraph EL["Execution & Settlement"]
        Coverage["📊 Dynamic Coverage % Filter (50/45/35%)"]
        Razorpay["💸 Razorpay UPI Payout"]
    end

    %% Model 1 Connections (Pre-Event: Weekly Pricing)
    CatA -->|7-Day Forecast → predictive_environmental_risk| M1
    CatB -->|Strike/Outage Forecast → predictive_sociopolitical_risk| M1
    SQLite -->|historical_zone_risk_score + dpdt_pct| M1
    M1 -->|Weekly Premium e.g. ₹84| SQLite

    %% Model 2 Connections (Post-Event: Payout Calc)
    Gateway -->|Live Trigger Payload with Epicenter Coords| M2
    SQLite -->|Rider GPS within 2.5km Haversine + Historical Hourly Wage| M2
    M2 -->|Base Income Loss * Severity| M3

    %% Model 3 Connections (Security Gate)
    GPS -->|Rider GPS Ping < 1km Jump + Device Meta| M3
    M3 -->|Valid Score < 0.6 → APPROVED| Coverage
    M3 -->|Anomaly > 0.6 → FREEZE HACKERS| Gateway

    %% Payout Execution
    Coverage -->|Apply Zone Coverage %| Razorpay
    Razorpay -->|₹126 Credited to UPI| SQLite

    %% Styling
    classDef api fill:#e3f2fd,stroke:#1565c0,stroke-width:2px,color:#000
    classDef ml fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px,color:#000
    classDef core fill:#fff3e0,stroke:#e65100,stroke-width:2px,color:#000

    class IMD_Rain,IMD_Heat,News,AppOracle api
    class M1,M2,M3 ml
    class Gateway,GPS,SQLite,Coverage,Razorpay core
```

### The Three AI Models (Summary)

| # | Model Name | When It Runs | Input | Output | Formula |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | Dynamic Premium Engine | Every Monday (Pre-Event) | Zone Risk, Environmental Forecast, Socio-Political Forecast, DPDT % | Weekly Premium (₹) | `Subtotal + [(100-DPDT)% × Subtotal]` |
| **2** | Payout Calculator | On Trigger Fire (Post-Event) | Hourly Wage, Duration, Severity, Zone Coverage % | Instant Payout (₹) | `(Wage × Hours × Severity) × Coverage%` |
| **3** | Fraud Defense | Before Every Payout | GPS Displacement, Device Meta, IP Clusters | Allow / Freeze (Boolean) | Isolation Forest Anomaly Score |

### The Four Connectivity Bridges

1. **The Pricing Bridge (Model 1 ↔ Forecast APIs):** Controls the flow of money *into* the pool. Model 1 fetches 7-day historical weather and socio-political risk aggregates from the **IMD + News plugins** and combines it with the rider's `historical_zone_risk_score` and `dpdt_pct` to output a dynamic weekly premium.
2. **The Verification Bridge (Trigger APIs → Geospatial Filter → Model 2):** When any of the 4 triggers fire, the system first runs a **Haversine distance check** (2.5km radius) against the trigger epicenter to identify only the Q-commerce riders who are actually affected. Model 2 then calculates the exact loss of income for each eligible rider.
3. **The Defense Bridge (Model 3 ↔ GPS Streams):** Protects money flowing *out*. The embedded `Scikit-Learn Isolation Forest` calculates an anomaly score using real-time GPS displacement (ensuring max jump remains < 1 km), 48-hour account age locks, and IP subnet clustering. A high score halts the payout.
4. **The Sustainability Bridge (Coverage % Filter):** After Model 3 approves a payout, the system applies a zone-based coverage cap (🟢 50%, 🟠 45%, 🔴 35%) to protect the ₹6.45 Cr liquidity pool from catastrophic Red Zone mass-payout events.

---

## 🔌 4. API Integration Flow

This specifies how we build the mock API data ingestion layer for the MVP so that it naturally unplugs to accept live data later.

### 1. Webhook Endpoints (Simulating 4 Push Triggers)
FastAPI exposes secure mock endpoints that simulate external APIs "pushing" disruption alerts:

| # | Endpoint | Trigger Type | Category |
| :--- | :--- | :--- | :--- |
| 1 | `/api/v1/webhooks/imd-weather` | Severe Rain / Flash Flood Alert | Cat A: Environmental |
| 2 | `/api/v1/webhooks/imd-heat` | Extreme Heatwave (>45°C) | Cat A: Environmental |
| 3 | `/api/v1/webhooks/news-disruption` | Transport Strike / Protest | Cat B: Socio-Political |
| 4 | `/api/v1/webhooks/platform-status` | Zepto/Blinkit App Suspension | Cat B: Platform |

### 2. JSON Payload Contracts
The backend expects precise JSON payloads to trigger Model 2. For example, the simulated **IMD Severe Weather Payload**:
```json
{
  "source": "imd_weather_api",
  "trigger_type": "SEVERE_FLOOD",
  "category": "ENVIRONMENTAL",
  "geo_fence": {
    "center_lat": 12.9121,
    "center_long": 77.6446,
    "radius_km": 2.5
  },
  "severity_multiplier": 1.0,
  "estimated_duration_hours": 3.5,
  "timestamp": "2026-03-31T18:00:00Z"
}
```

The simulated **Zepto App Suspension Payload** (The "Killer Feature"):
```json
{
  "source": "zepto_platform_oracle",
  "trigger_type": "APP_SUSPENSION",
  "category": "PLATFORM",
  "geo_fence": {
    "center_lat": 12.9352,
    "center_long": 77.6245,
    "radius_km": 5.0
  },
  "severity_multiplier": 1.2,
  "estimated_duration_hours": 2.0,
  "affected_pincode": "560034",
  "timestamp": "2026-03-31T20:30:00Z"
}
```

### 3. Integration Path
1. **MVP Execution:** You click a "Trigger Flood" or "Simulate App Suspension" button on the UI, which POSTs the JSON to the FastAPI webhook.
2. **Post-MVP Upgrade:** These mock endpoints get deleted, and the exact same JSON schemas are mapped to deployed Redis streams listening to live IMD, News, and Platform feeds.

---

## 📂 5. File Structure

This is the exact directory structure for the Phase 2 source code executable, mapped entirely to the End-to-End architecture above:

```text
aegesis_phase2/
├── backend/
│   ├── main.py                          # Primary FastAPI Gateway Entry
│   ├── api/
│   │   └── v1/
│   │       ├── webhooks.py              # Mock payload receivers for all 4 triggers
│   │       │                            #   - /imd-weather (Cat A: Rain/Flood)
│   │       │                            #   - /imd-heat (Cat A: Extreme Heat)
│   │       │                            #   - /news-disruption (Cat B: Strikes/Protests)
│   │       │                            #   - /platform-status (Cat B: Zepto/Blinkit Suspension)
│   │       ├── policies.py              # Policy fetching, creation & weekly premium display
│   │       ├── rider.py                 # JWT Auth, Hub Assignment & GPS stream receivers
│   │       └── premium.py               # Endpoint to fetch Model 1 dynamic premium for a rider
│   ├── core/
│   │   ├── execution_engine.py          # Model 2 Payout Logic + Coverage % Filter + Razorpay
│   │   ├── geospatial.py               # Haversine distance calculator (2.5km radius check)
│   │   ├── dpdt_tracker.py             # DPDT calculation engine (weekly recalculation)
│   │   ├── stream_processor.py          # Simulating the Redis Streams event queues
│   │   └── config.py                    # Application configuration & constants
│   ├── database/
│   │   ├── session.py                   # SQLite logic (simulating PostgreSQL + PostGIS)
│   │   ├── models.py                    # Rider, Policy, Claim Ledger, DPDT History, GPS Log,
│   │   │                                #   Wage History, Zone Assignment tables
│   │   └── crud.py                      # Core Reads/Writes for all tables
│   ├── ml_pipelines/
│   │   ├── model_1_premium.py           # AI Model 1: Dynamic Subscription Premium Calculator
│   │   │                                #   Inputs: zone_risk, env_risk, sociopol_risk, dpdt_pct
│   │   │                                #   Output: weekly_premium_inr (e.g. ₹84.00)
│   │   ├── model_2_payout.py            # AI Model 2: Actionable Payout Engine
│   │   │                                #   Inputs: hourly_wage, duration, severity, coverage%
│   │   │                                #   Output: settlement_payout_inr (e.g. ₹126.00)
│   │   └── model_3_fraud.py             # AI Model 3: Isolation Forest Fraud Defense
│   │                                    #   Inputs: GPS displacement, device meta, IP clusters
│   │                                    #   Output: anomaly_score (float), allow/freeze (bool)
│   ├── mock_data/
│   │   ├── trigger_payloads.json        # Pre-built JSON payloads for all 4 trigger types
│   │   ├── rider_profiles.json          # Sample Q-commerce rider profiles with wage history
│   │   └── zone_grid.json              # Predefined Green/Orange/Red zone grid coordinates
│   └── requirements.txt                 # Python dependencies
│
└── frontend/
    ├── App.js                           # React Native entry point & screen navigator
    ├── services/
    │   ├── api.js                       # Axios/Fetch wrapper for all backend API calls
    │   └── BackgroundLocation.js        # Async Foreground/Background silent GPS tracker
    ├── screens/
    │   ├── OnboardingScreen.js          # Simulated KYC, Hub Assignment & Zone Selection
    │   ├── ShieldDashboard.js           # Main Dashboard: Zone indicator, AI premium display,
    │   │                                #   DPDT score, Coverage %, and trigger simulation buttons
    │   ├── PremiumBreakdownScreen.js    # [NEW] Detailed Model 1 breakdown showing:
    │   │                                #   Base ₹60 + Zone Penalty + DPDT Correction = Final ₹
    │   ├── TriggerStatusScreen.js       # [NEW] Live feed of active/past triggers with:
    │   │                                #   Trigger type, epicenter map pin, 2.5km radius visual,
    │   │                                #   affected rider count, and real-time payout status
    │   ├── SettlementScreen.js          # Payout confirmation: Amount, Coverage % applied,
    │   │                                #   Trigger type, Duration, and UPI credit animation
    │   └── FraudAlertScreen.js          # [NEW] Model 3 visualization: Shows blocked syndicate
    │                                    #   attacks, GPS teleportation detection, anomaly scores
    ├── components/
    │   ├── GlassCard.js                 # Glassmorphism floating card container
    │   ├── AnimatedButton.js            # Gradient button with spring press animation
    │   ├── CustomModal.js               # Dark blurred alert modal
    │   ├── ZoneBadge.js                 # [NEW] Color-coded zone indicator (Green/Orange/Red)
    │   ├── DPDTMeter.js                 # [NEW] Circular progress meter showing rider's DPDT %
    │   └── CoverageBar.js              # [NEW] Visual bar showing Coverage % for active zone
    ├── theme/
    │   └── colors.js                    # Centralized Q-Commerce color palette
    └── package.json                     # React Native dependencies
```

---

## 🧠 6. AI Plan — Model 1: Dynamic Premium Engine

> **Detailed specification:** See [`ai_model_1_spec.md`](./ai_model_1_spec.md)

**Phase 2 Goal:** Demonstrate mathematical, hyper-local weekly pricing for Q-Commerce riders.

### The Formula
```
Subtotal = Base Premium (₹60) + Zone Penalty (₹0 / ₹24 / ₹45)
Final Weekly Premium = Subtotal + [ (100% - DPDT%) × Subtotal ]
```

### Input Features
| # | Feature | Type | Source |
| :--- | :--- | :--- | :--- |
| 1 | `historical_zone_risk_score` | Float (0.0 - 1.0) | PostGIS / SQLite grid analysis |
| 2 | `predictive_environmental_risk` | Float (0.0 - 1.0) | IMD Weather API (Cat A forecast) |
| 3 | `predictive_sociopolitical_risk` | Float (0.0 - 1.0) | News NLP + Platform Oracle (Cat B forecast) |
| 4 | `dpdt_pct` | Float (0.0 - 100.0) | Weekly recalculated behavioral metric |

### Zone Classification
| Zone | Condition | Penalty |
| :--- | :--- | :--- |
| 🟢 Green | Clear forecast + safe grid | +₹0 |
| 🟠 Orange | Moderate risk (heat/rain/isolated protests) | +₹24 |
| 🔴 Red | Severe floods, city-wide strikes, app suspensions expected | +₹45 |

### DPDT (Delivery Percentage During Triggers)
The unique behavioral metric that rewards hardworking riders:
* **Recalculated every week** — riders get a fresh chance to improve their score.
* A rider with **100% DPDT** pays the bare minimum (e.g., ₹84 for Orange Zone).
* A rider with **20% DPDT** pays significantly more (e.g., ₹151.20 for Orange Zone).
* **Formula:** `DPDT Penalty = (100% - DPDT%) × Subtotal`

### Example Calculations
| Rider | Zone | DPDT | Subtotal | Penalty | Final Premium |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Rider A (Hustler) | 🟠 Orange | 100% | ₹84 | ₹0 | **₹84.00** |
| Rider B (Average) | 🟠 Orange | 80% | ₹84 | ₹16.80 | **₹100.80** |
| Rider C (Fair-Weather) | 🟠 Orange | 20% | ₹84 | ₹67.20 | **₹151.20** |
| Rider D (Red Zone Hustler) | 🔴 Red | 90% | ₹105 | ₹10.50 | **₹115.50** |

---

## 💸 7. AI Plan — Model 2: Payout Calculator

> **Detailed specification:** See [`ai_model_2_spec.md`](./ai_model_2_spec.md)

**Phase 2 Goal:** Demonstrate zero-touch, income-based parametric payouts with geospatial precision.

### The Formula
```
Base Income Loss = (Historical Hourly Wage × Disruption Duration) × Severity Multiplier
Final Payout = Base Income Loss × Coverage Percentage
```

### The 4 Automated Triggers
| # | Trigger | Category | Threshold |
| :--- | :--- | :--- | :--- |
| 1 | IMD Severe Weather | Cat A: Environmental | > 60mm continuous rain or flash flood |
| 2 | IMD Extreme Heat | Cat A: Environmental | > 45°C urban temperature |
| 3 | News Sentiment NLP | Cat B: Socio-Political | "Transport Strike" / "Road Blockade" / "Protests" |
| 4 | Q-Commerce App Suspension | Cat B: Platform | Zepto/Blinkit orders suspended in a pincode |

### Geospatial Eligibility Filter (The 2.5km Radius)
When a trigger fires, **we do not pay everyone in the zone.** The system executes a Haversine distance check:
* Only riders whose GPS pings are within **2.5 km** of the disruption epicenter are eligible.
* Q-Commerce riders operate from fixed Dark Stores (Hubs), making this radius constraint extremely accurate.
* Exception: `APP_SUSPENSION_ORACLE` triggers may affect an entire pincode.

### Dynamic Coverage % (Sustainability Filter)
To protect the ₹6.45 Cr liquidity fund:
| Zone | Coverage % | Reason |
| :--- | :--- | :--- |
| 🟢 Green | **50%** | Low volume of simultaneous claims |
| 🟠 Orange | **45%** | Moderate claim density expected |
| 🔴 Red | **35%** | Catastrophic events affect thousands; must cap exposure |

### Example Calculations
| Rider | Hourly Wage | Duration | Severity | Base Loss | Zone | Coverage | **Final Payout** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Rider A | ₹150/hr (Fri 8PM) | 3 hrs | 1.0x (Flood) | ₹450 | 🔴 Red | 35% | **₹157.50** |
| Rider B | ₹80/hr (Tue 11AM) | 3 hrs | 1.0x (Flood) | ₹240 | 🔴 Red | 35% | **₹84.00** |
| Rider C | ₹120/hr (Wed 6PM) | 2 hrs | 1.2x (Strike) | ₹288 | 🟠 Orange | 45% | **₹129.60** |
| Rider D | ₹100/hr (Mon 2PM) | 4 hrs | 1.5x (App Down) | ₹600 | 🟢 Green | 50% | **₹300.00** |

---

## 🛡️ 8. AI Plan — Model 3: Fraud Defense (Market Crash Engine)

**Phase 2 Goal:** Prove mathematically that the ₹6.45 Cr liquidity pool is safe from exploitation.

This is the crown jewel of Aegesis. The Phase 2 MVP must implement these three defense layers:

### Defense Layer 1: GPS Displacement Engine
* **Rule:** Must block teleportation.
* **MVP Code:** Verify that time elapsed and distance jumped do not exceed physical capabilities. Maximum jump radius threshold is strictly **1 km** to detect hyper-local anomalies.

### Defense Layer 2: The 48-Hour Immutable Time Lock
* **Rule:** You cannot buy a policy today and claim it today.
* **MVP Code:** Enforce a boolean in the SQLite DB that hard-rejects any payout if `account_age_hours < 48`.

### Defense Layer 3: Graph-Clustering IP Defense (The Syndicate Stop)
* **Rule:** Prevent 500 fake emulators from claiming simultaneously.
* **MVP Code:** When a trigger fires, parse the claim objects grouped by simulated IP subnets. If `count > N` per subnet, immediately flag and freeze the transaction cluster via the `model_3_fraud.py` Isolation Forest logic.

### Model 3 Output
| Anomaly Score | Decision | Action |
| :--- | :--- | :--- |
| < 0.6 | ✅ **APPROVED** | Payout proceeds to Coverage % Filter → Razorpay |
| ≥ 0.6 | 🚨 **FROZEN** | Transaction blocked, rider flagged for manual review |

---

## 📋 9. Requirements for the 2-Minute Demo Video

To execute the DEVTrails submission perfectly, ensure you check off these interactive flows in the UI:

- [ ] **Scene 1 (Onboarding):** Register a mock Q-commerce rider (Arjun) and assign him to "Zepto Hub - Koramangala" in an **Orange Zone**.
- [ ] **Scene 2 (AI Pricing - Model 1):** Show the dynamic premium calculation: Base ₹60 + Zone ₹24 = ₹84 subtotal. Arjun has 80% DPDT, so final = **₹100.80/week**. Navigate to the Premium Breakdown Screen.
- [ ] **Scene 3 (The Disaster - Trigger):** Click a "Simulate Severe Flood" button on the dashboard, which POSTs a mock IMD Weather payload to the FastAPI webhook.
- [ ] **Scene 4 (The Miracle - Model 2):** Show the React Native app instantly receive a notification: *"Trigger matched. Location verified (1.1km from epicenter). 3 hours lost at ₹120/hr. Red Zone 35% coverage applied. **₹126.00 credited to UPI.**"*
- [ ] **Scene 5 (The Platform Oracle):** Simulate a "Zepto App Suspension" trigger and show a different rider getting an instant ₹300 payout (Green Zone, 50% coverage).
- [ ] **Scene 6 (The Syndicate Attack - Model 3):** Simulate a push of 50 simultaneous claims and watch the Fraud Defense Engine instantly freeze them all with anomaly score > 0.6.
- [ ] **Scene 7 (DPDT Reward):** Show how Arjun's DPDT improved from 80% to 90% next week, reducing his premium from ₹100.80 to **₹92.40**.

By following this exact blueprint, your Phase 2 executable codebase won't just win a hackathon—it will literally become the Day 1 code of your funded startup.
