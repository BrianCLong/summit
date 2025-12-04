import time
import json
import redis
import yaml
import threading
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor
from modelManager import ModelManager

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("BatchProcessor")

def load_config(path="config/ai-models.yml"):
    try:
        with open(path, 'r') as f:
            return yaml.safe_load(f)
    except Exception as e:
        logger.error(f"Failed to load config from {path}: {e}")
        # Return default fallback
        return {"redis": {"host": "localhost", "port": 6379, "queue_name": "ai_inference_queue"}}

config = load_config()
redis_config = config.get('redis', {})
QUEUE_NAME = redis_config.get('queue_name', 'ai_inference_queue')
RESULT_PREFIX = redis_config.get('result_prefix', 'ai_result:')

# Connect to Redis
try:
    r = redis.Redis(host=redis_config.get('host', 'localhost'),
                    port=redis_config.get('port', 6379),
                    decode_responses=True)
except Exception as e:
    logger.error(f"Redis connection failed: {e}")
    r = None

model_manager = ModelManager(config)

class BatchProcessor:
    def __init__(self):
        self.queues = {} # Local buffer for batching: {model_type: [requests]}
        self.locks = {} # Locks for each model queue
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.running = True

    def process_batch(self, model_type, batch):
        """Process a batch of requests for a specific model."""
        if not batch:
            return

        logger.info(f"Processing batch of {len(batch)} for {model_type}")

        try:
            model = model_manager.get_model(model_type)
            inputs = [item['input'] for item in batch]
            ids = [item['id'] for item in batch]

            results = []

            # Inference logic based on model type
            if model_type == 'yolo':
                # YOLO supports batch inference
                # inputs should be list of image paths or arrays
                preds = model(inputs)
                for pred in preds:
                    results.append(json.loads(pred.tojson()))

            elif model_type == 'whisper':
                # Whisper usually takes one file path? Batching requires custom loop or pipeline
                # For simplicity here, we iterate (optimization: use batched pipeline if available)
                for inp in inputs:
                    res = model.transcribe(inp)
                    results.append(res)

            elif model_type == 'spacy':
                # spaCy pipe
                docs = list(model.pipe(inputs))
                for doc in docs:
                    ents = [{"text": ent.text, "label": ent.label_} for ent in doc.ents]
                    results.append({"entities": ents})

            elif model_type == 'sentence_transformer':
                embeddings = model.encode(inputs)
                # Convert numpy arrays to lists
                results = [emb.tolist() for emb in embeddings]

            # Store results in Redis
            pipe = r.pipeline()
            for id, result in zip(ids, results):
                pipe.set(f"{RESULT_PREFIX}{id}", json.dumps(result))
                # Optional: Set TTL for results
                pipe.expire(f"{RESULT_PREFIX}{id}", 300)
            pipe.execute()

            logger.info(f"Batch completed for {model_type}")

        except Exception as e:
            logger.error(f"Error processing batch for {model_type}: {e}")
            # Handle errors (e.g., mark as failed)
            for item in batch:
                r.set(f"{RESULT_PREFIX}{item['id']}", json.dumps({"error": str(e)}))

    def worker(self, model_type):
        """Worker thread loop for a specific model type."""
        batch_size = model_manager.get_config(model_type).get('batch_size', 1)
        latency_ms = model_manager.get_config(model_type).get('max_batch_latency_ms', 100)

        logger.info(f"Worker started for {model_type} (Batch: {batch_size}, Latency: {latency_ms}ms)")

        while self.running:
            batch = []
            start_time = time.time()

            # Collect batch
            with self.locks[model_type]:
                queue = self.queues[model_type]
                while len(batch) < batch_size:
                    if not queue:
                        break
                    batch.append(queue.pop(0))

            # If batch is full or timeout reached
            if len(batch) >= batch_size or (batch and (time.time() - start_time) * 1000 >= latency_ms):
                self.process_batch(model_type, batch)
            else:
                # Small sleep to prevent busy loop if queue is empty
                time.sleep(0.01)

    def main_loop(self):
        """Main loop to poll Redis and dispatch to local buffers."""
        logger.info("Starting BatchProcessor main loop...")

        # Initialize queues and locks for known models
        known_models = ['yolo', 'whisper', 'spacy', 'sentence_transformer']
        for m in known_models:
            self.queues[m] = []
            self.locks[m] = threading.Lock()
            self.executor.submit(self.worker, m)

        while self.running:
            try:
                # BLPOP blocks until an item is available
                if r:
                    item = r.blpop(QUEUE_NAME, timeout=1)
                    if item:
                        _, data = item
                        request = json.loads(data)
                        model_type = request.get('model_type')

                        if model_type in self.queues:
                            with self.locks[model_type]:
                                self.queues[model_type].append(request)
                        else:
                            logger.warn(f"Unknown model type: {model_type}")
                    else:
                        pass # Timeout, loop again
                else:
                    logger.error("Redis not connected. Retrying...")
                    time.sleep(5)
            except Exception as e:
                logger.error(f"Error in main loop: {e}")
                time.sleep(1)

if __name__ == "__main__":
    processor = BatchProcessor()
    try:
        processor.main_loop()
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        processor.running = False
