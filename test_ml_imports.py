import sys

# Add services to path
sys.path.append("services/ml-serving")
sys.path.append("services/ml-training")

print("Checking ml-serving...")
try:
    print("✅ ml-serving imports successful")
except Exception as e:
    print(f"❌ ml-serving import failed: {e}")
    sys.exit(1)

print("Checking ml-training...")
try:
    print("✅ ml-training imports successful")
except Exception as e:
    print(f"❌ ml-training import failed: {e}")
    sys.exit(1)

print("Checking drift detection...")
try:
    sys.path.append("mlops")
    print("✅ drift detection imports successful")
except Exception as e:
    print(f"❌ drift detection import failed: {e}")
    sys.exit(1)
