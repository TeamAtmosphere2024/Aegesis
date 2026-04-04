"""
Quick Seed Script to add Chennai Hub to Hosted Backend.
Usage:
  cd backend
  python seed_chennai.py
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# 1. Reuse existing database configuration
# Set DATABASE_URL in your terminal if running locally against a remote DB
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:12345@localhost:5432/aegesis")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def seed_chennai():
    from database.models import DarkStore
    db = SessionLocal()
    
    chennai_hub_name = "Zepto Hub - Chennai Central"
    exists = db.query(DarkStore).filter(DarkStore.name == chennai_hub_name).first()
    
    if not exists:
        print(f"Adding {chennai_hub_name} Hub...")
        new_hub = DarkStore(
            name=chennai_hub_name,
            lat=12.8155,
            lon=80.0393,
            current_zone="GREEN"
        )
        db.add(new_hub)
        db.commit()
        print("✅ Success! Your Chennai Hub is now live on the hosted backend.")
    else:
        print(f"✅ {chennai_hub_name} already exists. No action needed.")
    
    db.close()

if __name__ == "__main__":
    seed_chennai()
