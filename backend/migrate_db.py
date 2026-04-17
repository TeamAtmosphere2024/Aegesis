from sqlalchemy import text
from database.session import engine, init_db
from database.models import Base

def migrate():
    print("Starting Database Migration...")
    
    with engine.connect() as conn:
        # 1. Enable PostGIS extension
        print("Enabling PostGIS extension...")
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.commit()
            print("PostGIS extension enabled.")
        except Exception as e:
            print(f"Skipping PostGIS extension enablement (not available or no permission): {e}")

        # 2. Drop existing tables to refresh schema (CAUTION: Resets all data)
        print("Dropping existing tables for schema refresh...")
        try:
            Base.metadata.drop_all(bind=engine)
            conn.commit()
        except Exception as e:
             print(f"Error dropping tables: {e}")

    # 3. Re-initialize DB
    print("Creating new tables with PostGIS support...")
    init_db()
    print("Migration Complete! Database is now ready with Geometry support.")

if __name__ == "__main__":
    migrate()
