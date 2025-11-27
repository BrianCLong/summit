"""
Deepfake Detection Service - FastAPI Application

This service provides ML-based deepfake detection for video, audio, and images.
"""

import time
import logging
from contextlib import asynccontextmanager
from typing import Optional, List

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.responses import Response

# Import detectors
from ..detectors.video_detector import VideoDetector
from ..detectors.audio_detector import AudioDetector
from ..detectors.image_detector import ImageDetector
from ..detectors.ensemble import EnsembleDetector
from ..models.loader import ModelLoader
from ..utils.config import get_settings
from ..utils.storage import StorageClient
from ..utils.metrics import MetricsCollector

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Prometheus metrics
DETECTION_REQUESTS = Counter(
    'deepfake_detection_requests_total',
    'Total detection requests',
    ['detector_type', 'status']
)

DETECTION_DURATION = Histogram(
    'deepfake_detection_duration_seconds',
    'Detection duration',
    ['detector_type']
)

CONFIDENCE_SCORE = Histogram(
    'deepfake_confidence_score',
    'Confidence scores',
    ['detector_type'],
    buckets=[0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
)

# Global state
model_loader: Optional[ModelLoader] = None
video_detector: Optional[VideoDetector] = None
audio_detector: Optional[AudioDetector] = None
image_detector: Optional[ImageDetector] = None
ensemble_detector: Optional[EnsembleDetector] = None
storage_client: Optional[StorageClient] = None
metrics_collector: Optional[MetricsCollector] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for loading models on startup and cleanup on shutdown"""
    global model_loader, video_detector, audio_detector, image_detector
    global ensemble_detector, storage_client, metrics_collector
    
    settings = get_settings()
    
    logger.info("Loading ML models...")
    try:
        # Initialize model loader
        model_loader = ModelLoader(settings.model_storage_path)
        
        # Load models
        video_model = await model_loader.load_model("video_detector", settings.video_model_version)
        audio_model = await model_loader.load_model("audio_detector", settings.audio_model_version)
        image_model = await model_loader.load_model("image_detector", settings.image_model_version)
        
        # Initialize detectors
        video_detector = VideoDetector(video_model)
        audio_detector = AudioDetector(audio_model)
        image_detector = ImageDetector(image_model)
        ensemble_detector = EnsembleDetector([video_detector, audio_detector, image_detector])
        
        # Initialize storage client
        storage_client = StorageClient(
            endpoint=settings.s3_endpoint,
            access_key=settings.s3_access_key,
            secret_key=settings.s3_secret_key,
            bucket=settings.s3_bucket
        )
        
        # Initialize metrics collector
        metrics_collector = MetricsCollector()
        
        logger.info("Models loaded successfully")
        
    except Exception as e:
        logger.error(f"Failed to load models: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("Shutting down...")
    if model_loader:
        await model_loader.cleanup()


# Create FastAPI app
app = FastAPI(
    title="Deepfake Detection Service",
    description="ML-based deepfake detection for video, audio, and images",
    version="1.0.0",
    lifespan=lifespan
)


# Pydantic models
class DetectionRequest(BaseModel):
    media_url: str = Field(..., description="URL of media file to analyze")
    detector_type: Optional[str] = Field(None, description="Specific detector to use (video/audio/image/ensemble)")
    enable_explanation: bool = Field(False, description="Generate explainability data")
    priority: int = Field(5, ge=1, le=10, description="Processing priority (1-10)")


class DetectionResult(BaseModel):
    media_url: str
    is_synthetic: bool
    confidence_score: float = Field(..., ge=0.0, le=1.0)
    detector_type: str
    model_version: str
    processing_time_ms: int
    explanation: Optional[dict] = None
    frame_scores: Optional[List[dict]] = None
    segment_scores: Optional[List[dict]] = None


class HealthResponse(BaseModel):
    status: str
    models_loaded: bool
    available_detectors: List[str]
    uptime_seconds: float


# Health endpoints
@app.get("/health/live", response_model=dict)
async def liveness():
    """Liveness probe"""
    return {"status": "alive"}


@app.get("/health/ready", response_model=dict)
async def readiness():
    """Readiness probe"""
    if not all([video_detector, audio_detector, image_detector]):
        raise HTTPException(status_code=503, detail="Models not loaded")
    return {"status": "ready"}


@app.get("/health", response_model=HealthResponse)
async def health():
    """Detailed health check"""
    return {
        "status": "healthy" if all([video_detector, audio_detector, image_detector]) else "degraded",
        "models_loaded": all([video_detector, audio_detector, image_detector]),
        "available_detectors": ["video", "audio", "image", "ensemble"],
        "uptime_seconds": time.time() - app.state.start_time if hasattr(app.state, 'start_time') else 0
    }


# Main detection endpoint
@app.post("/detect", response_model=DetectionResult)
async def detect_deepfake(
    request: DetectionRequest,
    background_tasks: BackgroundTasks
):
    """
    Detect deepfake in media file
    
    Supports video, audio, and image files. Automatically selects appropriate detector
    based on file type or uses specified detector.
    """
    start_time = time.time()
    
    try:
        # Download media file from URL
        logger.info(f"Downloading media from {request.media_url}")
        media_data = await storage_client.download(request.media_url)
        
        # Determine detector type if not specified
        detector_type = request.detector_type or await _infer_media_type(media_data)
        
        # Select detector
        if detector_type == "video":
            detector = video_detector
        elif detector_type == "audio":
            detector = audio_detector
        elif detector_type == "image":
            detector = image_detector
        elif detector_type == "ensemble":
            detector = ensemble_detector
        else:
            raise HTTPException(status_code=400, detail=f"Unknown detector type: {detector_type}")
        
        # Run detection
        logger.info(f"Running {detector_type} detection")
        result = await detector.detect(
            media_data,
            enable_explanation=request.enable_explanation
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Record metrics
        DETECTION_REQUESTS.labels(detector_type=detector_type, status="success").inc()
        DETECTION_DURATION.labels(detector_type=detector_type).observe(time.time() - start_time)
        CONFIDENCE_SCORE.labels(detector_type=detector_type).observe(result['confidence_score'])
        
        # Record metrics in background
        background_tasks.add_task(
            metrics_collector.record_detection,
            detector_type=detector_type,
            confidence=result['confidence_score'],
            processing_time_ms=processing_time_ms
        )
        
        return DetectionResult(
            media_url=request.media_url,
            is_synthetic=result['is_synthetic'],
            confidence_score=result['confidence_score'],
            detector_type=detector_type,
            model_version=result.get('model_version', 'unknown'),
            processing_time_ms=processing_time_ms,
            explanation=result.get('explanation'),
            frame_scores=result.get('frame_scores'),
            segment_scores=result.get('segment_scores')
        )
        
    except Exception as e:
        DETECTION_REQUESTS.labels(detector_type=detector_type, status="error").inc()
        logger.error(f"Detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/detect/upload", response_model=DetectionResult)
async def detect_upload(
    file: UploadFile = File(...),
    detector_type: Optional[str] = None,
    enable_explanation: bool = False,
    background_tasks: BackgroundTasks = None
):
    """
    Detect deepfake in uploaded media file
    
    Accepts direct file upload instead of URL.
    """
    start_time = time.time()
    
    try:
        # Read file data
        media_data = await file.read()
        
        # Determine detector type
        if not detector_type:
            detector_type = await _infer_media_type_from_filename(file.filename)
        
        # Select detector
        if detector_type == "video":
            detector = video_detector
        elif detector_type == "audio":
            detector = audio_detector
        elif detector_type == "image":
            detector = image_detector
        elif detector_type == "ensemble":
            detector = ensemble_detector
        else:
            raise HTTPException(status_code=400, detail=f"Unknown detector type: {detector_type}")
        
        # Run detection
        result = await detector.detect(
            media_data,
            enable_explanation=enable_explanation
        )
        
        processing_time_ms = int((time.time() - start_time) * 1000)
        
        # Record metrics
        DETECTION_REQUESTS.labels(detector_type=detector_type, status="success").inc()
        DETECTION_DURATION.labels(detector_type=detector_type).observe(time.time() - start_time)
        CONFIDENCE_SCORE.labels(detector_type=detector_type).observe(result['confidence_score'])
        
        return DetectionResult(
            media_url=f"upload://{file.filename}",
            is_synthetic=result['is_synthetic'],
            confidence_score=result['confidence_score'],
            detector_type=detector_type,
            model_version=result.get('model_version', 'unknown'),
            processing_time_ms=processing_time_ms,
            explanation=result.get('explanation'),
            frame_scores=result.get('frame_scores'),
            segment_scores=result.get('segment_scores')
        )
        
    except Exception as e:
        DETECTION_REQUESTS.labels(detector_type=detector_type or "unknown", status="error").inc()
        logger.error(f"Detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# Metrics endpoint
@app.get("/metrics")
async def metrics():
    """Prometheus metrics endpoint"""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


# Model management endpoints
@app.get("/models", response_model=List[dict])
async def list_models():
    """List all loaded models"""
    return await model_loader.list_models()


@app.get("/models/{model_name}", response_model=dict)
async def get_model_info(model_name: str):
    """Get information about a specific model"""
    info = await model_loader.get_model_info(model_name)
    if not info:
        raise HTTPException(status_code=404, detail=f"Model not found: {model_name}")
    return info


# Utility functions
async def _infer_media_type(media_data: bytes) -> str:
    """Infer media type from file data"""
    # Simple magic number detection
    if media_data[:4] == b'\x00\x00\x00\x20' or media_data[:4] == b'ftyp':
        return "video"
    elif media_data[:3] == b'ID3' or media_data[:4] == b'RIFF':
        return "audio"
    elif media_data[:4] == b'\x89PNG' or media_data[:2] == b'\xff\xd8':
        return "image"
    else:
        raise HTTPException(status_code=400, detail="Unable to determine media type")


async def _infer_media_type_from_filename(filename: str) -> str:
    """Infer media type from filename extension"""
    ext = filename.lower().split('.')[-1]
    
    video_exts = ['mp4', 'avi', 'mov', 'mkv', 'webm', 'flv']
    audio_exts = ['mp3', 'wav', 'flac', 'ogg', 'm4a', 'aac']
    image_exts = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp']
    
    if ext in video_exts:
        return "video"
    elif ext in audio_exts:
        return "audio"
    elif ext in image_exts:
        return "image"
    else:
        raise HTTPException(status_code=400, detail=f"Unsupported file extension: {ext}")


# Error handlers
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


# Startup event
@app.on_event("startup")
async def startup_event():
    app.state.start_time = time.time()
    logger.info("Deepfake Detection Service started")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Deepfake Detection Service shutting down")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
