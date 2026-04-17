"""
main.py — Aegesis Phase 2 FastAPI Gateway Entry Point

Run with:
    cd backend
    uvicorn main:app --reload

Swagger UI: http://127.0.0.1:8000/docs
ReDoc:      http://127.0.0.1:8000/redoc
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database.session import init_db
from api.v1 import rider, webhooks, premium, policies, analytics, admin

# ──────────────────────────────────────────────────────
# Logging
# ──────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s — %(message)s",
)
logger = logging.getLogger("aegesis")

# ──────────────────────────────────────────────────────
# App instantiation
# ──────────────────────────────────────────────────────
app = FastAPI(
    title       = "Aegesis — AI Parametric Insurance Platform",
    description = (
        "Phase 2 MVP Backend for the Guidewire DEVTrails Hackathon.\n\n"
        "Powering hyper-local, zero-touch insurance for Q-Commerce delivery partners "
        "(Zepto / Blinkit) using three ML models:\n"
        "- **Model 1** – Dynamic Premium Engine (XGBoost)\n"
        "- **Model 2** – Actionable Payout Calculator (Eligibility Classifier)\n"
        "- **Model 3** – Fraud Defense Engine (Isolation Forest)\n"
    ),
    version     = "2.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
)

# ──────────────────────────────────────────────────────
# CORS (allows React Native frontend dev server)
# ──────────────────────────────────────────────────────
import os
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins  = CORS_ORIGINS,
    allow_credentials = True,
    allow_methods  = ["*"],
    allow_headers  = ["*"],
)


# ──────────────────────────────────────────────────────
# Startup event — initialise DB tables
# ──────────────────────────────────────────────────────
@app.on_event("startup")
def on_startup():
    init_db()
    logger.info("✅  Aegesis backend ready — DB initialised.")

# ──────────────────────────────────────────────────────
# Routers
# ──────────────────────────────────────────────────────
app.include_router(rider.router)
app.include_router(premium.router)
app.include_router(policies.router)
app.include_router(webhooks.router)
app.include_router(analytics.router)
app.include_router(admin.router)

# ──────────────────────────────────────────────────────
# Health-check
# ──────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
def root():
    return {
        "service": "Aegesis Parametric Insurance API",
        "version": "2.0.0",
        "status":  "operational",
        "docs":    "/docs",
    }


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok"}
# reload trigger