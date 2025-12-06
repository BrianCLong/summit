from fastapi import APIRouter, HTTPException
from app.models.schemas import PredictionRequest, PredictionResponse, HealthResponse
from app.services.model_manager import model_manager

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

@router.post("/predict", response_model=PredictionResponse)
async def predict(request: PredictionRequest):
    try:
        predictions, latency = await model_manager.predict(
            request.model_name,
            request.version,
            request.data
        )
        return {
            "model_name": request.model_name,
            "version": request.version,
            "predictions": predictions,
            "latency_ms": latency
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def list_models():
    # In production, query MLflow registry
    return {
        "models": [
            {"name": "sentiment-analysis", "versions": ["v1", "v2"]},
            {"name": "threat-detection", "versions": ["v1"]}
        ]
    }

@router.post("/monitor/drift")
async def check_drift(reference_data: List[float], current_data: List[float]):
    try:
        # Import dynamically to avoid strict dependency if mlops package not installed in container
        import sys
        import os

        # Add mlops to path if mounted
        if os.path.exists("/app/mlops"):
            sys.path.append("/app/mlops")

        # Simplified drift check stub
        from scipy.stats import ks_2samp
        statistic, p_value = ks_2samp(reference_data, current_data)

        drift_detected = p_value < 0.05

        return {
            "drift_detected": drift_detected,
            "p_value": float(p_value),
            "statistic": float(statistic)
        }
    except ImportError:
        return {"error": "Drift detection module not available"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
