"""Migration: add city + external_id columns to dark_stores"""
import psycopg2

conn = psycopg2.connect(dbname="aegesis", user="postgres", password="12345", host="localhost", port=5432)
cur = conn.cursor()

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='dark_stores' AND column_name='external_id'")
if not cur.fetchone():
    cur.execute("ALTER TABLE dark_stores ADD COLUMN external_id VARCHAR(50)")
    print("Added external_id column")
else:
    print("external_id already exists")

cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name='dark_stores' AND column_name='city'")
if not cur.fetchone():
    cur.execute("ALTER TABLE dark_stores ADD COLUMN city VARCHAR(100)")
    print("Added city column")
else:
    print("city already exists")

conn.commit()
cur.close()
conn.close()
print("Migration complete.")
