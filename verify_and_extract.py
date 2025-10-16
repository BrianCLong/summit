import hashlib
import zipfile

# Verify SHA-512 hash
expected_hash = "c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4"
with open("activities-v21.zip", "rb") as f:
    file_hash = hashlib.sha512(f.read()).hexdigest()
assert file_hash == expected_hash, "ZIP integrity check failed"

# Extract ZIP
with zipfile.ZipFile("activities-v21.zip", "r") as zip_ref:
    zip_ref.extractall("activities-v21")
