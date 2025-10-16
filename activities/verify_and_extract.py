import hashlib
import zipfile

# Verify SHA-512 hash
expected_hash = "f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4"
with open("activities-v24.zip", "rb") as f:
    file_hash = hashlib.sha512(f.read()).hexdigest()
assert file_hash == expected_hash, "ZIP integrity check failed"

# Extract ZIP
with zipfile.ZipFile("activities-v24.zip", "r") as zip_ref:
    zip_ref.extractall("activities-v24")
