# app.py
# Modular microservice for analyzing social media text to identify emotional states,
# map them to cognitive bias profiles, and recommend influence vectors.
# Uses FastAPI for the API, transformers for NLP.
# Pluggable inference backend via abstract class.

import logging
import os
from abc import ABC, abstractmethod

from fastapi import BackgroundTasks, FastAPI, HTTPException
from pydantic import BaseModel
from transformers import pipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cognitive Targeting Engine",
    description="Microservice that ingests raw text from social media, identifies dominant emotional states using NLP, maps to cognitive bias profiles, and outputs recommended influence vectors.",
    version="1.0.0",
)


# Define input model
class TextInput(BaseModel):
    text: str  # Raw text from social media feed (e.g., Twitter/X post, Telegram message, TikTok comment)


import json
import logging
import uuid

from fastapi import FastAPI
from pydantic import BaseModel

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Cognitive Targeting Engine",
    description="Microservice that ingests raw text from social media, identifies dominant emotional states using NLP, maps to cognitive bias profiles, and outputs recommended influence vectors.",
    version="1.0.0",
)


# Define input model
class TextInput(BaseModel):
    text: str  # Raw text from social media feed (e.g., Twitter/X post, Telegram message, TikTok comment)


# Load mappings from config.json
try:
    with open("cognitive-targeting-engine/config.json") as f:
        config_data = json.load(f)
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

# In-memory cache for results
results_cache: dict[str, dict] = {}


# Pluggable inference backend interface
class InferenceBackend(ABC):
    @abstractmethod
    def classify_emotions(self, text: str) -> list[dict[str, float]]:
        """
        Classify emotions in the text.
        Returns list of dicts with 'label' and 'score'.
        """
        pass


# HuggingFace Transformers backend (using state-of-the-art open-source model)
class HuggingFaceBackend(InferenceBackend):
    def __init__(self):
        self.model_name = os.getenv("MODEL_NAME", "j-hartmann/emotion-english-distilroberta-base")
        logger.info(f"Initializing HuggingFaceBackend with model: {self.model_name}")
        self.classifier = pipeline("text-classification", model=self.model_name, top_k=None)

    def classify_emotions(self, text: str) -> list[dict[str, float]]:
        results = self.classifier(text)[0]
        return results  # [{'label': 'fear', 'score': 0.8}, ...]


# Initialize the backend (pluggable: can swap with other implementations, e.g., custom or different provider)
backend = HuggingFaceBackend()


async def _process_text_in_background(task_id: str, text: str):
    """
    Asynchronously processes the text to classify emotions, map to biases, and generate influence vectors.
    Stores the result in the results_cache.
    """
    try:
        logger.info(f"Starting background processing for task_id: {task_id}, text: {text[:50]}...")
        # Step 1: Classify emotions using pluggable backend
        emotions = backend.classify_emotions(text)

        # Step 2: Identify dominant emotional states (threshold: score > 0.3 for multi-label)
        dominant_emotions = [emo["label"] for emo in emotions if emo["score"] > 0.3]

        # Step 3: Map dominant emotions to unique cognitive bias profiles
        biases = set()
        for emo in dominant_emotions:
            bias = emotion_to_bias.get(emo)
            if bias:
                biases.add(bias)

        # Step 4: Generate recommended influence vectors per bias profile
        output = {}
        for bias in biases:
            output[bias] = bias_to_vectors.get(bias, [])

        results_cache[task_id] = {"status": "completed", "result": {"bias_profiles": output}}
        logger.info(f"Finished background processing for task_id: {task_id}. Result stored.")

    except Exception as e:
        logger.error(
            f"Error during background text processing for task_id: {task_id}, text '{text[:50]}...': {e}",
            exc_info=True,
        )
        results_cache[task_id] = {"status": "failed", "error": str(e)}


@app.post("/analyze", response_model=dict[str, str])
async def analyze_text(input: TextInput, background_tasks: BackgroundTasks):
    """
    API Endpoint: Ingest raw text, process with NLP in the background, and return a task ID.
    """
    task_id = str(uuid.uuid4())
    logger.info(
        f"Received request to analyze text: {input.text[:50]}... Assigning task_id: {task_id}"
    )
    results_cache[task_id] = {"status": "processing"}  # Initial status
    background_tasks.add_task(_process_text_in_background, task_id, input.text)
    return {"status": "Processing started in background", "task_id": task_id}


@app.get("/results/{task_id}", response_model=dict)
async def get_results(task_id: str):
    """
    API Endpoint: Retrieve results for a given task ID.
    """
    logger.info(f"Received request for results for task_id: {task_id}")
    result = results_cache.get(task_id)
    if result:
        return result
    raise HTTPException(status_code=404, detail="Task ID not found or processing not started.")


# To run: uvicorn app:app --reload
# Dependencies: pip install fastapi uvicorn transformers torch
# Note: Model is state-of-the-art open-source for emotion classification (7 classes: anger, disgust, fear, joy, neutral, sadness, surprise).
# For pluggability, extend InferenceBackend (e.g., for ONNX, TensorFlow, or API-based inference).
