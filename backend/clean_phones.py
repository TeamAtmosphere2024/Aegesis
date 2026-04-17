"""Migration: strip leading '91' from rider phone numbers"""
import psycopg2

conn = psycopg2.connect(dbname="aegesis", user="postgres", password="12345", host="localhost", port=5432)
cur = conn.cursor()

# Update phone numbers that start with '91' and are 12 digits long
# We assume standard 10 digit numbers.
cur.execute("""
    UPDATE riders 
    SET phone = RIGHT(phone, 10) 
    WHERE phone LIKE '91%' AND LENGTH(phone) = 12
""")

print(f"Updated {cur.rowcount} rider phone numbers.")

conn.commit()
cur.close()
conn.close()
print("Cleanup complete.")
