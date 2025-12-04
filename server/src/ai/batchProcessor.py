import time
import json
import asyncio
import logging
import yaml
import redis.asyncio as redis
from typing import List, Dict, Any
from collections import defaultdict

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("BatchProcessor")

# Load configuration
try:
    with open("config/ai-models.yml", "r") as f:
        CONFIG = yaml.safe_load(f)
except FileNotFoundError:
    logger.warning("config/ai-models.yml not found, using defaults")
    CONFIG = {"models": {}}

REDIS_URL = "redis://localhost:6379"
QUEUE_NAME = "ai_inference_queue"
RESULT_PREFIX = "ai_result:"

class BatchProcessor:
    def __init__(self):
        self.redis = redis.from_url(REDIS_URL, decode_responses=True)
        self.queues: Dict[str, List[Dict]] = defaultdict(list)
        self.batch_configs = {}
        self._load_configs()

    def _load_configs(self):
        for model, cfg in CONFIG.get("models", {}).items():
            self.batch_configs[model] = {
                "size": cfg.get("batch_size", 1),
                "timeout": cfg.get("timeout_ms", 100) / 1000.0
            }
        logger.info(f"Loaded batch configs: {self.batch_configs}")

    async def start(self):
        logger.info("Starting BatchProcessor...")
        while True:
            try:
                # Fetch job from Redis (blocking pop with timeout)
                # We use a specialized queue per model or a generic one?
                # For simplicity, let's assume a generic queue with JSON payload: {model, input, id}
                job_data = await self.redis.lpop(QUEUE_NAME)

                if job_data:
                    job = json.loads(job_data)
                    model_name = job.get("model")
                    if model_name:
                        self.queues[model_name].append(job)
                        await self.check_batch(model_name)
                else:
                    await asyncio.sleep(0.01) # Avoid tight loop if empty

                # Periodically check all queues for timeouts
                for model in list(self.queues.keys()):
                     await self.check_batch(model, force=False)

            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
                await asyncio.sleep(1)

    async def check_batch(self, model_name: str, force: bool = False):
        queue = self.queues[model_name]
        config = self.batch_configs.get(model_name, {"size": 1, "timeout": 0.1})

        # Check if batch is full or forced
        if len(queue) >= config["size"]: # OR timeout logic (omitted for brevity in this loop structure, need better loop)
            await self.process_batch(model_name, queue[:config["size"]])
            self.queues[model_name] = queue[config["size"]:]

        # Note: A real implementation would need a separate timer per batch to respect 'timeout_ms' accurately.
        # Here we simplify: if there are items, we process them immediately if batch is full,
        # or we could add a flush mechanism. For MVP, strict size-based triggering.

    async def process_batch(self, model_name: str, batch: List[Dict]):
        logger.info(f"Processing batch of {len(batch)} for {model_name}")

        inputs = [job["input"] for job in batch]
        ids = [job["id"] for job in batch]

        # MOCK INFERENCE - Replace with actual model calls
        results = await self.mock_inference(model_name, inputs)

        # Store results
        async with self.redis.pipeline() as pipe:
            for job_id, result in zip(ids, results):
                pipe.set(f"{RESULT_PREFIX}{job_id}", json.dumps(result), ex=3600)
            await pipe.execute()

    async def mock_inference(self, model_name: str, inputs: List[Any]) -> List[Any]:
        await asyncio.sleep(0.05) # Simulate inference time
        if model_name == "yolo":
            return [{"detections": [{"class": "person", "conf": 0.95}]} for _ in inputs]
        elif model_name == "whisper":
            return [{"text": "Transcribed text mock"} for _ in inputs]
        elif model_name == "spacy":
            return [{"entities": ["MockEntity"]} for _ in inputs]
        elif model_name == "sentence_transformers":
            return [{"embedding": [0.1] * 384} for _ in inputs]
        return [{"error": "Unknown model"} for _ in inputs]

if __name__ == "__main__":
    processor = BatchProcessor()
    asyncio.run(processor.start())
