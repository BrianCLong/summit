"""
ML Training Service - Automated model training with hyperparameter tuning
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
import logging
from datetime import datetime
import uuid

from .training_pipeline import TrainingPipeline
from .config import Settings

# Initialize FastAPI app
app = FastAPI(
    title="ML Training Service",
    description="Automated ML training with hyperparameter tuning and experiment tracking",
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

# Load settings
settings = Settings()

# Initialize training pipeline
training_pipeline = TrainingPipeline(settings)


# Request/Response Models
class TrainingRequest(BaseModel):
    """Request to train a model"""
    model_name: str
    model_type: str = Field(..., description="Model type: pytorch, sklearn, xgboost")
    dataset_config: Dict[str, Any]
    hyperparameters: Dict[str, Any] = Field(default_factory=dict)
    enable_tuning: bool = False
    tuning_trials: int = 50
    distributed: bool = False
    gpu_count: int = 1
    tags: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TrainingJobResponse(BaseModel):
    """Response for training job creation"""
    job_id: str
    status: str
    model_name: str
    created_at: str
    message: str


class TrainingStatus(BaseModel):
    """Training job status"""
    job_id: str
    status: str
    model_name: str
    progress: float
    current_epoch: Optional[int] = None
    total_epochs: Optional[int] = None
    metrics: Dict[str, float] = Field(default_factory=dict)
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None


class EvaluationRequest(BaseModel):
    """Request to evaluate a model"""
    model_name: str
    model_version: str
    dataset_config: Dict[str, Any]
    metrics: List[str] = ["accuracy", "precision", "recall", "f1"]
    include_fairness: bool = True
    include_robustness: bool = True
    include_explainability: bool = True


class EvaluationResponse(BaseModel):
    """Model evaluation results"""
    model_name: str
    model_version: str
    metrics: Dict[str, float]
    fairness_metrics: Optional[Dict[str, Any]] = None
    robustness_metrics: Optional[Dict[str, Any]] = None
    explainability: Optional[Dict[str, Any]] = None
    evaluated_at: str


# In-memory job tracking (in production, use Redis or database)
training_jobs: Dict[str, Dict[str, Any]] = {}


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "ML Training Service",
        "status": "healthy",
        "version": "1.0.0"
    }


@app.post("/training/start", response_model=TrainingJobResponse)
async def start_training(
    request: TrainingRequest,
    background_tasks: BackgroundTasks
):
    """Start a new training job"""
    try:
        job_id = str(uuid.uuid4())

        # Create job record
        job = {
            "job_id": job_id,
            "status": "pending",
            "model_name": request.model_name,
            "created_at": datetime.utcnow().isoformat(),
            "request": request.dict(),
            "progress": 0.0
        }

        training_jobs[job_id] = job

        # Start training in background
        background_tasks.add_task(
            run_training_job,
            job_id,
            request
        )

        logger.info(f"Started training job {job_id} for model {request.model_name}")

        return TrainingJobResponse(
            job_id=job_id,
            status="pending",
            model_name=request.model_name,
            created_at=job["created_at"],
            message="Training job started successfully"
        )

    except Exception as e:
        logger.error(f"Error starting training job: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/training/status/{job_id}", response_model=TrainingStatus)
async def get_training_status(job_id: str):
    """Get status of a training job"""
    if job_id not in training_jobs:
        raise HTTPException(status_code=404, detail="Training job not found")

    job = training_jobs[job_id]

    return TrainingStatus(
        job_id=job["job_id"],
        status=job["status"],
        model_name=job["model_name"],
        progress=job.get("progress", 0.0),
        current_epoch=job.get("current_epoch"),
        total_epochs=job.get("total_epochs"),
        metrics=job.get("metrics", {}),
        started_at=job.get("started_at"),
        completed_at=job.get("completed_at"),
        error=job.get("error")
    )


@app.get("/training/jobs")
async def list_training_jobs(status: Optional[str] = None, limit: int = 50):
    """List training jobs"""
    jobs = list(training_jobs.values())

    if status:
        jobs = [j for j in jobs if j["status"] == status]

    # Sort by created_at descending
    jobs.sort(key=lambda x: x["created_at"], reverse=True)

    return {
        "jobs": jobs[:limit],
        "total": len(jobs)
    }


@app.post("/evaluation/evaluate", response_model=EvaluationResponse)
async def evaluate_model(request: EvaluationRequest):
    """Evaluate a trained model"""
    try:
        logger.info(f"Evaluating model {request.model_name} version {request.model_version}")

        # Run evaluation
        results = await training_pipeline.evaluate_model(
            model_name=request.model_name,
            model_version=request.model_version,
            dataset_config=request.dataset_config,
            metrics=request.metrics,
            include_fairness=request.include_fairness,
            include_robustness=request.include_robustness,
            include_explainability=request.include_explainability
        )

        return EvaluationResponse(
            model_name=request.model_name,
            model_version=request.model_version,
            metrics=results.get("metrics", {}),
            fairness_metrics=results.get("fairness_metrics"),
            robustness_metrics=results.get("robustness_metrics"),
            explainability=results.get("explainability"),
            evaluated_at=datetime.utcnow().isoformat()
        )

    except Exception as e:
        logger.error(f"Error evaluating model: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/tuning/optimize")
async def optimize_hyperparameters(
    model_name: str,
    model_type: str,
    dataset_config: Dict[str, Any],
    search_space: Dict[str, Any],
    n_trials: int = 50
):
    """Optimize hyperparameters using Optuna"""
    try:
        logger.info(f"Starting hyperparameter optimization for {model_name}")

        best_params = await training_pipeline.optimize_hyperparameters(
            model_name=model_name,
            model_type=model_type,
            dataset_config=dataset_config,
            search_space=search_space,
            n_trials=n_trials
        )

        return {
            "model_name": model_name,
            "best_parameters": best_params,
            "n_trials": n_trials,
            "optimized_at": datetime.utcnow().isoformat()
        }

    except Exception as e:
        logger.error(f"Error optimizing hyperparameters: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


async def run_training_job(job_id: str, request: TrainingRequest):
    """Run training job in background"""
    try:
        # Update status to running
        training_jobs[job_id]["status"] = "running"
        training_jobs[job_id]["started_at"] = datetime.utcnow().isoformat()

        logger.info(f"Running training job {job_id}")

        # Run training pipeline
        result = await training_pipeline.train_model(
            model_name=request.model_name,
            model_type=request.model_type,
            dataset_config=request.dataset_config,
            hyperparameters=request.hyperparameters,
            enable_tuning=request.enable_tuning,
            tuning_trials=request.tuning_trials,
            distributed=request.distributed,
            gpu_count=request.gpu_count,
            tags=request.tags,
            metadata=request.metadata,
            # Progress callback
            on_progress=lambda progress, metrics: update_job_progress(job_id, progress, metrics)
        )

        # Update job as completed
        training_jobs[job_id]["status"] = "completed"
        training_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
        training_jobs[job_id]["progress"] = 1.0
        training_jobs[job_id]["result"] = result

        logger.info(f"Completed training job {job_id}")

    except Exception as e:
        logger.error(f"Training job {job_id} failed: {str(e)}")
        training_jobs[job_id]["status"] = "failed"
        training_jobs[job_id]["error"] = str(e)
        training_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()


def update_job_progress(job_id: str, progress: float, metrics: Dict[str, float]):
    """Update job progress"""
    if job_id in training_jobs:
        training_jobs[job_id]["progress"] = progress
        training_jobs[job_id]["metrics"] = metrics


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
