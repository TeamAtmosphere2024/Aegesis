# Reset Dark Store Zones to GREEN for fresh testing
import os
import sys
from sqlalchemy import create_session
from sqlalchemy.orm import Session
from sqlalchemy import create_engine

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.database.database import SessionLocal
from backend.database.models import DarkStore

db = SessionLocal()
try:
    stores = db.query(DarkStore).all()
    print(f"Repairing {len(stores)} dark stores...")
    for s in stores:
        s.current_zone = "GREEN"
    db.commit()
    print("All Hubs reset to GREEN successfully.")
finally:
    db.close()
