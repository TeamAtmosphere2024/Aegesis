from database.session import SessionLocal
from database.models import DarkStore
db = SessionLocal()
stores = db.query(DarkStore).order_by(DarkStore.city).all()
print(f"Total stores: {len(stores)}")
print()
for s in stores:
    city = s.city or "?"
    print(f"  [{city}] {s.name} | ext={s.external_id} | {s.lat:.4f},{s.lon:.4f} zone={s.current_zone}")
db.close()
