import csv
import os
import sys

# Add backend directory to sys.path so we can import from database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.session import SessionLocal
from database.models import DarkStore

def seed_csv(csv_path):
    print(f"Loading data from {csv_path}...")
    db = SessionLocal()
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            # Keep track of existing stores to avoid duplicates
            existing_names = {store.name for store in db.query(DarkStore.name).all()}
            
            new_stores = []
            for row in reader:
                name = row['name'].strip()
                if name in existing_names:
                    continue  # skip if already added
                
                # We ignore the CSV's 'id' (since our table uses Integer auto-increment) 
                # We also ignore 'city' and the CSV's 'current_zone' (which contains regions like 'North').
                # We default the risk zone to "GREEN" per our system requirement.
                store = DarkStore(
                    name=name,
                    lat=float(row['lat']),
                    lon=float(row['lon']),
                    radius_km=float(row['radius_km']),
                    current_zone="GREEN",  
                    is_active=True
                )
                new_stores.append(store)
                existing_names.add(name)
            
            if new_stores:
                db.bulk_save_objects(new_stores)
                db.commit()
                print(f"Successfully inserted {len(new_stores)} new Dark Stores into Postgres!")
            else:
                print("No new stores to insert (duplicates skipped).")
                
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    csv_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "zepto_darkstores_500.csv")
    seed_csv(csv_file)
