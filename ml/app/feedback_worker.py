import asyncio
import json
import logging
import os

import psycopg2
from bullmq import Worker
from feedback_logger import log_feedback
from redis import Redis

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Redis connection details
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", None)

# PostgreSQL connection details
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = int(os.getenv("PG_PORT", 5432))
PG_DB = os.getenv("PG_DB", "intelgraph")
PG_USER = os.getenv("PG_USER", "intelgraph_user")
PG_PASSWORD = os.getenv("PG_PASSWORD", "intelgraph_password")


def get_pg_connection():
    """Establishes and returns a PostgreSQL connection."""
    try:
        conn = psycopg2.connect(
            host=PG_HOST, port=PG_PORT, database=PG_DB, user=PG_USER, password=PG_PASSWORD
        )
        logger.info("Successfully connected to PostgreSQL.")
        return conn
    except Exception as e:
        logger.error(f"Failed to connect to PostgreSQL: {e}")
        raise


def ensure_feedback_table_exists(conn):
    """Ensures the ai_feedback table exists in PostgreSQL."""
    with conn.cursor() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS ai_feedback (
                id SERIAL PRIMARY KEY,
                insight JSONB NOT NULL,
                feedback_type VARCHAR(50) NOT NULL,
                "user" VARCHAR(255) NOT NULL,
                timestamp TIMESTAMPTZ NOT NULL,
                original_prediction JSONB NOT NULL,
                logged_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            );
        """
        )
        conn.commit()
    logger.info("Ensured 'ai_feedback' table exists.")


# Connect to Redis
redis_connection = Redis(
    host=REDIS_HOST,
    port=REDIS_PORT,
    password=REDIS_PASSWORD,
    decode_responses=True,  # Decode responses to Python strings
)

# Ensure Redis connection is working
try:
    redis_connection.ping()
    logger.info(f"Successfully connected to Redis at {REDIS_HOST}:{REDIS_PORT}")
except Exception as e:
    logger.error(f"Could not connect to Redis: {e}")
    exit(1)

# Establish PostgreSQL connection and ensure table exists on startup
try:
    pg_conn = get_pg_connection()
    ensure_feedback_table_exists(pg_conn)
except Exception:
    logger.error("Exiting due to PostgreSQL connection or table creation failure.")
    exit(1)


async def process_feedback_job(job):
    logger.info(f"Processing feedback job {job.id}: {job.data}")
    try:
        feedback_data = job.data
        log_feedback(
            insight=feedback_data["insight"],
            feedback_type=feedback_data["feedbackType"],
            user=feedback_data["user"],
            timestamp=feedback_data["timestamp"],
            original_prediction=feedback_data["originalPrediction"],
        )

        # Persist to PostgreSQL
        with pg_conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ai_feedback (
                    insight, feedback_type, "user", timestamp, original_prediction
                ) VALUES (%s, %s, %s, %s, %s);
            """,
                (
                    json.dumps(feedback_data["insight"]),
                    feedback_data["feedbackType"],
                    feedback_data["user"],
                    feedback_data["timestamp"],
                    json.dumps(feedback_data["originalPrediction"]),
                ),
            )
            pg_conn.commit()
        logger.info(f"Feedback job {job.id} persisted to PostgreSQL.")

        logger.info(f"Feedback job {job.id} processed successfully.")
    except Exception as e:
        logger.error(f"Error processing feedback job {job.id}: {e}")
        # Rollback transaction on error
        if pg_conn:
            pg_conn.rollback()
        raise  # Re-raise to mark job as failed in BullMQ


async def main():
    logger.info("Starting AI Feedback Worker...")
    worker = Worker(
        "aiFeedbackQueue",
        process_feedback_job,
        connection=redis_connection,
        concurrency=5,  # Process up to 5 jobs concurrently
    )

    worker.on("completed", lambda job: logger.info(f"Job {job.id} completed"))
    worker.on("failed", lambda job, err: logger.error(f"Job {job.id} failed with error: {err}"))
    worker.on("error", lambda err: logger.error(f"Worker error: {err}"))

    # Keep the worker running indefinitely
    try:
        while True:
            await asyncio.sleep(1)  # Keep event loop alive
    except asyncio.CancelledError:
        logger.info("Worker stopped by cancellation.")
    finally:
        await worker.close()
        redis_connection.close()
        if pg_conn:
            pg_conn.close()
            logger.info("PostgreSQL connection closed.")
        logger.info("Worker and Redis connection closed.")


if __name__ == "__main__":
    asyncio.run(main())
