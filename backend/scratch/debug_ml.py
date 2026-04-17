import sys
import traceback
sys.path.append('.')
from database.session import SessionLocal
from database.models import DarkStore
from ml_pipelines.guidewire_service import predict_dark_store_insights

def test():
    db = SessionLocal()
    try:
        ds_list = db.query(DarkStore).all()
        print(f"Processing {len(ds_list)} stores...")
        res = predict_dark_store_insights(ds_list)
        print(f"Result len: {len(res)}")
        if len(res) > 0:
            print("Successfully processed 1st store:")
            print(res[0])
    except Exception:
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test()
