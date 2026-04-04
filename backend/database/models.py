"""
database/models.py
SQLAlchemy ORM table definitions for Aegesis Phase 2.
Covers: Riders, Policies, GPS Logs, Claims, DPDT History, Wage History, Trigger Events.
"""
from sqlalchemy import (
    Column, Integer, Float, String, Boolean,
    DateTime, ForeignKey, Text
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()


class DarkStore(Base):
    """Q-Commerce Hubs (Dark Stores) that dynamically change zone colors during disruptions."""
    __tablename__ = "dark_stores"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), unique=True, nullable=False)
    lat             = Column(Float, nullable=False)
    lon             = Column(Float, nullable=False)
    radius_km       = Column(Float, default=5.0)
    current_zone    = Column(String(10), default="GREEN")   # Changes to ORANGE/RED during triggers
    is_active       = Column(Boolean, default=True)


class Rider(Base):
    """Core rider profile — one row per registered delivery partner."""
    __tablename__ = "riders"

    id              = Column(Integer, primary_key=True, index=True)
    name            = Column(String(100), nullable=False)
    phone           = Column(String(15), unique=True, nullable=False)
    hub_name        = Column(String(100), nullable=False, default="Default Hub")
    zone_category   = Column(String(10), nullable=False, default="GREEN")   # GREEN / ORANGE / RED
    zone_risk       = Column(Float, default=0.3)                             # 0.0 – 1.0
    lat             = Column(Float, nullable=True)
    lon             = Column(Float, nullable=True)
    dpdt            = Column(Float, default=100.0)                           # 0.0 – 100.0  %
    account_age_hours = Column(Float, default=0.0)
    ip_count        = Column(Integer, default=1)                             # unique IPs per session
    is_active       = Column(Boolean, default=True)
    is_flagged      = Column(Boolean, default=False)
    created_at      = Column(DateTime, default=datetime.utcnow)

    policies        = relationship("Policy",      back_populates="rider", cascade="all, delete-orphan")
    gps_logs        = relationship("GPSLog",      back_populates="rider", cascade="all, delete-orphan")
    claims          = relationship("ClaimLedger", back_populates="rider", cascade="all, delete-orphan")
    dpdt_history    = relationship("DPDTHistory", back_populates="rider", cascade="all, delete-orphan")
    wage_history    = relationship("WageHistory", back_populates="rider", cascade="all, delete-orphan")


class Policy(Base):
    """Insurance policy — one active policy per rider at any time."""
    __tablename__ = "policies"

    id              = Column(Integer, primary_key=True, index=True)
    rider_id        = Column(Integer, ForeignKey("riders.id"), nullable=False)
    weekly_premium  = Column(Float, nullable=False)
    zone_category   = Column(String(10), nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, default=datetime.utcnow)
    expires_at      = Column(DateTime, nullable=True)

    rider           = relationship("Rider", back_populates="policies")


class GPSLog(Base):
    """Continuous background GPS pings — used by geofence check & DPDT tracker."""
    __tablename__ = "gps_logs"

    id              = Column(Integer, primary_key=True, index=True)
    rider_id        = Column(Integer, ForeignKey("riders.id"), nullable=False)
    lat             = Column(Float, nullable=False)
    lon             = Column(Float, nullable=False)
    timestamp       = Column(DateTime, default=datetime.utcnow)
    during_trigger  = Column(Boolean, default=False)  # True if ping was within active trigger window

    rider           = relationship("Rider", back_populates="gps_logs")


class ClaimLedger(Base):
    """Every payout attempt (approved or blocked)."""
    __tablename__ = "claim_ledger"

    id              = Column(Integer, primary_key=True, index=True)
    rider_id        = Column(Integer, ForeignKey("riders.id"), nullable=False)
    trigger_event_id= Column(Integer, ForeignKey("trigger_events.id"), nullable=True)
    status          = Column(String(20), nullable=False)   # paid / fraud_blocked / not_eligible
    payout_amount   = Column(Float, default=0.0)
    fraud_score     = Column(Float, nullable=True)
    coverage_pct    = Column(Float, nullable=True)
    distance_km     = Column(Float, nullable=True)
    reason          = Column(Text, nullable=True)
    created_at      = Column(DateTime, default=datetime.utcnow)

    rider           = relationship("Rider", back_populates="claims")
    trigger_event   = relationship("TriggerEvent", back_populates="claims")


class DPDTHistory(Base):
    """Weekly DPDT recalculation log per rider."""
    __tablename__ = "dpdt_history"

    id              = Column(Integer, primary_key=True, index=True)
    rider_id        = Column(Integer, ForeignKey("riders.id"), nullable=False)
    week_start      = Column(DateTime, nullable=False)
    dpdt_pct        = Column(Float, nullable=False)    # calculated score for that week
    deliveries_during_trigger = Column(Integer, default=0)
    total_trigger_windows     = Column(Integer, default=0)
    created_at      = Column(DateTime, default=datetime.utcnow)

    rider           = relationship("Rider", back_populates="dpdt_history")


class WageHistory(Base):
    """Historical hourly wage per rider per day-of-week / hour bucket."""
    __tablename__ = "wage_history"

    id              = Column(Integer, primary_key=True, index=True)
    rider_id        = Column(Integer, ForeignKey("riders.id"), nullable=False)
    day_of_week     = Column(Integer, nullable=False)   # 0=Mon … 6=Sun
    hour_bucket     = Column(Integer, nullable=False)   # 0-23
    avg_wage_inr    = Column(Float, nullable=False)     # ₹/hour
    sample_count    = Column(Integer, default=1)
    created_at      = Column(DateTime, default=datetime.utcnow)

    rider           = relationship("Rider", back_populates="wage_history")


class TriggerEvent(Base):
    """Records every webhook trigger received from the 4 external APIs."""
    __tablename__ = "trigger_events"

    id              = Column(Integer, primary_key=True, index=True)
    source          = Column(String(50), nullable=False)   # e.g. imd_weather_api
    trigger_type    = Column(String(50), nullable=False)   # SEVERE_FLOOD / EXTREME_HEAT / etc.
    category        = Column(String(20), nullable=False)   # ENVIRONMENTAL / PLATFORM / SOCIOPOLITICAL
    center_lat      = Column(Float, nullable=False)
    center_lon      = Column(Float, nullable=False)
    radius_km       = Column(Float, default=2.5)
    severity_multiplier = Column(Float, default=1.0)
    estimated_duration_hours = Column(Float, default=1.0)
    affected_pincode = Column(String(10), nullable=True)
    zone_category   = Column(String(10), nullable=True)    # derived at ingest time
    is_processed    = Column(Boolean, default=False)
    affected_rider_count = Column(Integer, default=0)
    total_payout_inr = Column(Float, default=0.0)
    created_at      = Column(DateTime, default=datetime.utcnow)

    claims          = relationship("ClaimLedger", back_populates="trigger_event")