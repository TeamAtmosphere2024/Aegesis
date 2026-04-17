"""Test the CSV upload endpoint directly via Python."""
import requests

url = "http://127.0.0.1:8000/api/v1/admin/dark-stores/upload-csv"

with open("test_darkstores.csv", "rb") as f:
    resp = requests.post(url, files={"file": ("test_darkstores.csv", f, "text/csv")})

print("Status:", resp.status_code)
print("Response:", resp.json())
