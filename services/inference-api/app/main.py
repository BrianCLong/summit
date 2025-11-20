"""
Inference API Service - Real-time model inference with monitoring
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
import logging
import time
from datetime import datetime
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Initialize FastAPI app
app = FastAPI(
    title="ML Inference API",
    description="Real-time model inference with monitoring and logging",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
REQUEST_COUNT = Counter(
    'inference_requests_total',
    'Total inference requests',
    ['model_name', 'model_version', 'status']
)

REQUEST_LATENCY = Histogram(
    'inference_request_latency_seconds',
    'Inference request latency',
    ['model_name', 'model_version']
)

PREDICTION_COUNT = Counter(
    'predictions_total',
    'Total predictions made',
    ['model_name', 'model_version']
)


# Request/Response Models
class PredictRequest(BaseModel):
    """Request for model prediction"""
    model_name: str
    model_version: str = "latest"
    inputs: Dict[str, Any]
    options: Dict[str, Any] = Field(default_factory=dict)


class PredictResponse(BaseModel):
    """Response for model prediction"""
    model_name: str
    model_version: str
    predictions: Any
    confidence: Optional[float] = None
    explanation: Optional[Dict[str, Any]] = None
    latency_ms: float
    timestamp: str
    request_id: str


class BatchPredictRequest(BaseModel):
    """Request for batch prediction"""
    model_name: str
    model_version: str = "latest"
    inputs: List[Dict[str, Any]]
    options: Dict[str, Any] = Field(default_factory=dict)


class BatchPredictResponse(BaseModel):
    """Response for batch prediction"""
    model_name: str
    model_version: str
    predictions: List[Any]
    count: int
    latency_ms: float
    timestamp: str
    request_id: str


class ModelInfo(BaseModel):
    """Model information"""
    name: str
    version: str
    framework: str
    status: str
    loaded_at: str
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None


# In-memory model cache (in production, use proper model management)
loaded_models: Dict[str, Dict[str, Any]] = {}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "ML Inference API",
        "status": "healthy",
        "version": "1.0.0",
        "loaded_models": len(loaded_models)
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "models_loaded": len(loaded_models),
        "models": list(loaded_models.keys())
    }


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest, http_request: Request):
    """Make a prediction with a model"""
    start_time = time.time()
    request_id = http_request.headers.get("X-Request-ID", str(time.time()))

    try:
        logger.info(f"Prediction request: {request.model_name} v{request.model_version}")

        # Get or load model
        model_key = f"{request.model_name}:{request.model_version}"

        if model_key not in loaded_models:
            # In production, load from model registry
            logger.info(f"Loading model: {model_key}")
            loaded_models[model_key] = {
                "name": request.model_name,
                "version": request.model_version,
                "loaded_at": datetime.utcnow().isoformat(),
                "status": "ready"
            }

        # Run inference (mock implementation)
        predictions = run_inference(request.inputs, request.model_name)

        # Calculate latency
        latency_ms = (time.time() - start_time) * 1000

        # Update metrics
        REQUEST_COUNT.labels(
            model_name=request.model_name,
            model_version=request.model_version,
            status="success"
        ).inc()

        REQUEST_LATENCY.labels(
            model_name=request.model_name,
            model_version=request.model_version
        ).observe(latency_ms / 1000)

        PREDICTION_COUNT.labels(
            model_name=request.model_name,
            model_version=request.model_version
        ).inc()

        # Build response
        response = PredictResponse(
            model_name=request.model_name,
            model_version=request.model_version,
            predictions=predictions,
            confidence=0.92,
            latency_ms=latency_ms,
            timestamp=datetime.utcnow().isoformat(),
            request_id=request_id
        )

        logger.info(f"Prediction completed: {request_id} ({latency_ms:.2f}ms)")

        return response

    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")

        REQUEST_COUNT.labels(
            model_name=request.model_name,
            model_version=request.model_version,
            status="error"
        ).inc()

        raise HTTPException(status_code=500, detail=str(e))


@app.post("/predict/batch", response_model=BatchPredictResponse)
async def batch_predict(request: BatchPredictRequest, http_request: Request):
    """Make batch predictions"""
    start_time = time.time()
    request_id = http_request.headers.get("X-Request-ID", str(time.time()))

    try:
        logger.info(f"Batch prediction request: {request.model_name} ({len(request.inputs)} items)")

        predictions = []
        for input_data in request.inputs:
            pred = run_inference(input_data, request.model_name)
            predictions.append(pred)

        latency_ms = (time.time() - start_time) * 1000

        # Update metrics
        REQUEST_COUNT.labels(
            model_name=request.model_name,
            model_version=request.model_version,
            status="success"
        ).inc()

        PREDICTION_COUNT.labels(
            model_name=request.model_name,
            model_version=request.model_version
        ).inc(len(predictions))

        return BatchPredictResponse(
            model_name=request.model_name,
            model_version=request.model_version,
            predictions=predictions,
            count=len(predictions),
            latency_ms=latency_ms,
            timestamp=datetime.utcnow().isoformat(),
            request_id=request_id
        )

    except Exception as e:
        logger.error(f"Batch prediction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/models")
async def list_models():
    """List loaded models"""
    return {
        "models": list(loaded_models.values()),
        "count": len(loaded_models)
    }


@app.get("/models/{model_name}/{version}", response_model=ModelInfo)
async def get_model_info(model_name: str, version: str = "latest"):
    """Get model information"""
    model_key = f"{model_name}:{version}"

    if model_key not in loaded_models:
        raise HTTPException(status_code=404, detail="Model not found")

    model = loaded_models[model_key]

    return ModelInfo(
        name=model["name"],
        version=model["version"],
        framework="pytorch",
        status=model["status"],
        loaded_at=model["loaded_at"]
    )


@app.post("/models/load")
async def load_model(model_name: str, version: str = "latest"):
    """Load a model into memory"""
    model_key = f"{model_name}:{version}"

    if model_key in loaded_models:
        return {
            "message": "Model already loaded",
            "model_key": model_key
        }

    # In production, load from model registry
    logger.info(f"Loading model: {model_key}")

    loaded_models[model_key] = {
        "name": model_name,
        "version": version,
        "loaded_at": datetime.utcnow().isoformat(),
        "status": "ready"
    }

    return {
        "message": "Model loaded successfully",
        "model_key": model_key
    }


@app.delete("/models/{model_name}/{version}")
async def unload_model(model_name: str, version: str = "latest"):
    """Unload a model from memory"""
    model_key = f"{model_name}:{version}"

    if model_key not in loaded_models:
        raise HTTPException(status_code=404, detail="Model not found")

    del loaded_models[model_key]
    logger.info(f"Unloaded model: {model_key}")

    return {
        "message": "Model unloaded successfully",
        "model_key": model_key
    }


@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


def run_inference(inputs: Dict[str, Any], model_name: str) -> Any:
    """
    Run model inference (mock implementation)

    In production, implement actual inference logic:
    1. Preprocess inputs
    2. Run model forward pass
    3. Postprocess outputs
    4. Handle different model frameworks
    """

    # Mock prediction
    return {
        "class": "positive",
        "score": 0.92,
        "probabilities": {
            "positive": 0.92,
            "negative": 0.08
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
