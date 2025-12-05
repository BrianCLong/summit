import sys
import os

# Add services to path
sys.path.append("services/ml-serving")
sys.path.append("services/ml-training")

print("Checking ml-serving...")
try:
    from app.main import app
    from app.services.model_manager import model_manager
    from app.models.schemas import PredictionRequest
    print("✅ ml-serving imports successful")
except Exception as e:
    print(f"❌ ml-serving import failed: {e}")
    sys.exit(1)

print("Checking ml-training...")
try:
    from app.worker import worker
    print("✅ ml-training imports successful")
except Exception as e:
    print(f"❌ ml-training import failed: {e}")
    sys.exit(1)

print("Checking drift detection...")
try:
    sys.path.append("mlops")
    from drift.drift import DriftDetector
    print("✅ drift detection imports successful")
except Exception as e:
    print(f"❌ drift detection import failed: {e}")
    sys.exit(1)
