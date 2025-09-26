"""FastAPI application for the cognitive targeting engine with MLflow logging."""

import json
import logging
import os
import time
import uuid
from abc import ABC, abstractmethod
from typing import Dict, List

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline

from mlflow_tracking import ensure_experiment, log_inference_run

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Ensure the shared experiment is created at import time so cold starts are fast.
try:  # pragma: no cover - best-effort initialisation
    ensure_experiment()
except Exception as exc:  # pragma: no cover - defensive logging
    logger.warning("Unable to initialise MLflow experiment", exc_info=exc)

app = FastAPI(
    title="Cognitive Targeting Engine",
    description=(
        "Microservice that ingests raw text from social media, identifies dominant "
        "emotional states using NLP, maps to cognitive bias profiles, and outputs "
        "recommended influence vectors."
    ),
    version="1.0.0",
)


class TextInput(BaseModel):
    text: str


try:
    with open("cognitive-targeting-engine/config.json", "r", encoding="utf-8") as config_file:
        config_data = json.load(config_file)
    emotion_to_bias = config_data.get("emotion_to_bias", {})
    bias_to_vectors = config_data.get("bias_to_vectors", {})
    logger.info("Successfully loaded mappings from config.json")
except FileNotFoundError:
    logger.error("config.json not found. Using empty mappings.")
    emotion_to_bias = {}
    bias_to_vectors = {}
except json.JSONDecodeError:
    logger.error("Error decoding config.json. Using empty mappings.")
    emotion_to_bias = {}
    bias_to_vectors = {}

results_cache: Dict[str, Dict] = {}


class InferenceBackend(ABC):
    @abstractmethod
    def classify_emotions(self, text: str) -> List[Dict[str, float]]:
        """Classify emotions in the text."""

    @property
    @abstractmethod
    def model_version(self) -> str:
        """Return the model revision or version string."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the hugging face model identifier."""

    @property
    @abstractmethod
    def pipeline_task(self) -> str:
        """Return the Hugging Face pipeline task name."""


class HuggingFaceBackend(InferenceBackend):
    def __init__(self) -> None:
        self._model_name = os.getenv("MODEL_NAME", "j-hartmann/emotion-english-distilroberta-base")
        self._model_revision = os.getenv("MODEL_REVISION")
        logger.info("Initialising HuggingFaceBackend", extra={"model": self._model_name})
        self.classifier = pipeline("text-classification", model=self._model_name, top_k=None)
        config = getattr(getattr(self.classifier, "model", None), "config", None)
        if not self._model_revision and config is not None:
            self._model_revision = (
                getattr(config, "revision", None)
                or getattr(config, "_commit_hash", None)
                or getattr(config, "_name_or_path", None)
            )
        if not self._model_revision:
            self._model_revision = "unknown"

    def classify_emotions(self, text: str) -> List[Dict[str, float]]:
        return self.classifier(text)[0]

    @property
    def model_version(self) -> str:
        return self._model_revision or "unknown"

    @property
    def model_name(self) -> str:
        return self._model_name

    @property
    def pipeline_task(self) -> str:
        return getattr(self.classifier, "task", "text-classification")


backend = HuggingFaceBackend()


async def _process_text_in_background(task_id: str, text: str) -> None:
    try:
        logger.info("Starting background processing", extra={"task_id": task_id})
        start_time = time.perf_counter()
        emotions = backend.classify_emotions(text)
        elapsed_ms = (time.perf_counter() - start_time) * 1000

        dominant_emotions = [emo["label"] for emo in emotions if emo["score"] > 0.3]

        biases = set()
        for emotion in dominant_emotions:
            bias = emotion_to_bias.get(emotion)
            if bias:
                biases.add(bias)

        output: Dict[str, List[str]] = {}
        for bias in biases:
            output[bias] = bias_to_vectors.get(bias, [])

        run_id = log_inference_run(
            model_name=backend.model_name,
            model_version=backend.model_version,
            params={
                "task_id": task_id,
                "pipeline_task": backend.pipeline_task,
                "dominant_emotions": dominant_emotions,
            },
            metrics={
                "inference_time_ms": elapsed_ms,
                "emotion_candidates": len(emotions),
                "dominant_emotion_count": len(dominant_emotions),
            },
            tags={
                "deployment": os.getenv("DEPLOY_ENV", "local"),
            },
            run_name=f"inference-{task_id}",
        )

        results_cache[task_id] = {
            "status": "completed",
            "result": {"bias_profiles": output},
            "model_version": backend.model_version,
            "mlflow_run_id": run_id,
        }
        logger.info("Finished processing", extra={"task_id": task_id, "run_id": run_id})
    except Exception as exc:
        logger.error(
            "Error during background text processing",
            extra={"task_id": task_id, "error": str(exc)},
            exc_info=exc,
        )
        results_cache[task_id] = {"status": "failed", "error": str(exc)}


@app.post("/analyze", response_model=Dict[str, str])
async def analyze_text(input: TextInput, background_tasks: BackgroundTasks) -> Dict[str, str]:
    task_id = str(uuid.uuid4())
    logger.info("Received request to analyse text", extra={"task_id": task_id})
    results_cache[task_id] = {"status": "processing"}
    background_tasks.add_task(_process_text_in_background, task_id, input.text)
    return {"status": "Processing started in background", "task_id": task_id}


@app.get("/results/{task_id}", response_model=Dict)
async def get_results(task_id: str) -> Dict:
    logger.info("Received request for results", extra={"task_id": task_id})
    result = results_cache.get(task_id)
    if result:
        return result
    raise HTTPException(status_code=404, detail="Task ID not found or processing not started.")
