import os
import json
import logging
from redis import Redis
from bullmq import Worker, Queue
from feedback_logger import log_feedback

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Redis connection details
REDIS_HOST = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT = int(os.getenv('REDIS_PORT', 6379))
REDIS_PASSWORD = os.getenv('REDIS_PASSWORD', None)

# Connect to Redis
redis_connection = Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True # Decode responses to Python strings
)

# Ensure Redis connection is working
try:
    redis_connection.ping()
    logger.info(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    logger.error(f"Could not connect to Redis: {e}")
    exit(1)

async def process_feedback_job(job):
    logger.info(f"Processing feedback job {job.id}: {job.data}")
    try:
        feedback_data = job.data
        log_feedback(
            insight=feedback_data['insight'],
            feedback_type=feedback_data['feedbackType'],
            user=feedback_data['user'],
            timestamp=feedback_data['timestamp'],
            original_prediction=feedback_data['originalPrediction']
        )
        logger.info(f"Feedback job {job.id} processed successfully.")
    except Exception as e:
        logger.error(f"Error processing feedback job {job.id}: {e}")
        raise # Re-raise to mark job as failed in BullMQ

async def main():
    logger.info("Starting AI Feedback Worker...")
    worker = Worker(
        'aiFeedbackQueue',
        process_feedback_job,
        connection=redis_connection,
        concurrency=5 # Process up to 5 jobs concurrently
    )

    worker.on('completed', lambda job: logger.info(f"Job {job.id} completed"))
    worker.on('failed', lambda job, err: logger.error(f"Job {job.id} failed with error: {err}"))
    worker.on('error', lambda err: logger.error(f"Worker error: {err}"))

    # Keep the worker running indefinitely
    try:
        while True:
            await asyncio.sleep(1) # Keep event loop alive
    except asyncio.CancelledError:
        logger.info("Worker stopped by cancellation.")
    finally:
        await worker.close()
        redis_connection.close()
        logger.info("Worker and Redis connection closed.")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
