"""
database/session.py
SQLAlchemy engine + session factory for SQLite.
Call init_db() once at startup to create all tables.
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from database.models import Base

# Default to Postgres for production, fallback to environment variable
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:12345@localhost:5432/aegesis")

# If using Postgres, we don't need 'check_same_thread', but we keep it for SQLite fallback just in case
if DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False)
else:
    engine = create_engine(DATABASE_URL, echo=False)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def init_db() -> None:
    """Create all tables (idempotent — safe to call every startup)."""
    Base.metadata.create_all(bind=engine)
    
    # Seed mock Dark Stores for Classification Model mapping
    db: Session = SessionLocal()
    from database.models import DarkStore, Rider, WageHistory
    if db.query(DarkStore).count() <= 3:
        dark_stores = [
            DarkStore(name="Zepto Hub - Koramangala", lat=12.9352, lon=77.6245, current_zone="GREEN"),
            DarkStore(name="Blinkit Store - Indiranagar", lat=12.9783, lon=77.6408, current_zone="GREEN"),
            DarkStore(name="Zepto Hub - HSR", lat=12.9121, lon=77.6446, current_zone="GREEN"),
            DarkStore(name="Zepto Hub - Chennai Central", lat=12.8155, lon=80.0393, current_zone="GREEN"),
        ]
        for ds in dark_stores:
            if not db.query(DarkStore).filter(DarkStore.name == ds.name).first():
                db.add(ds)
        db.commit()

    if db.query(Rider).filter(Rider.phone == "9876543210").count() == 0:
        # Seed test rider (Arjun) to enable frontend login bypassing postman
        default_rider = Rider(
            name="Arjun Kumar", phone="9876543210", hub_name="Zepto Hub - Koramangala",
            zone_category="ORANGE", zone_risk=0.55, lat=12.9352, lon=77.6245, dpdt=80.0
        )
        db.add(default_rider)
        db.commit()
        db.refresh(default_rider)
        # Give Arjun a default earning rate of ₹120/hr
        for day in range(7):
            for hr in range(24):
                 db.add(WageHistory(rider_id=default_rider.id, day_of_week=day, hour_bucket=hr, avg_wage_inr=120.0))
        db.commit()
    db.close()


def get_db():
    """FastAPI dependency — yields a DB session and always closes it."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()