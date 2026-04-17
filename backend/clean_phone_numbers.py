from sqlalchemy import text
from database.session import engine

def clean_db():
    print("Starting database cleanup...")
    with engine.connect() as conn:
        # Remove all non-digits from the phone column in the riders table
        conn.execute(text("UPDATE riders SET phone = regexp_replace(phone, '[^0-9]', '', 'g');"))
        conn.commit()
    print("Database cleaned successfully.")

if __name__ == "__main__":
    clean_db()
