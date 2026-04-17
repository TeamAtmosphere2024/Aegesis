"""Migration: add rider CSV columns to riders table"""
import psycopg2

conn = psycopg2.connect(dbname="aegesis", user="postgres", password="12345", host="localhost", port=5432)
cur = conn.cursor()

new_cols = [
    ("external_id",                   "VARCHAR(50)"),
    ("city",                          "VARCHAR(100)"),
    ("vehicle_type",                  "VARCHAR(50)"),
    ("rider_status",                  "VARCHAR(20)"),
    ("experience_years",              "FLOAT"),
    ("avg_deliveries_per_day",        "FLOAT"),
    ("rating",                        "FLOAT"),
    ("earnings_per_hour",             "FLOAT"),
    ("deliveries_accepted_triggers",  "INTEGER"),
    ("total_deliveries_trigger",      "INTEGER"),
    ("darkstore_external_id",         "VARCHAR(50)"),
]

for col_name, col_type in new_cols:
    cur.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_name='riders' AND column_name=%s",
        (col_name,)
    )
    if not cur.fetchone():
        cur.execute(f"ALTER TABLE riders ADD COLUMN {col_name} {col_type}")
        print(f"Added: {col_name}")
    else:
        print(f"Exists: {col_name}")

conn.commit()
cur.close()
conn.close()
print("Migration complete.")
