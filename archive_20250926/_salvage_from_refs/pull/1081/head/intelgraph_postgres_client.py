import json
import logging

import psycopg2
from psycopg2 import Error
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class IntelGraphPostgresClient:
    """
    A client for interacting with the IntelGraph PostgreSQL database.
    Primarily for metadata and log storage.
    """

    def __init__(self, config: dict):
        self.config = config
        self.conn = None
        self._initialize_connection()

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Error),
        reraise=True,
    )
    def _initialize_connection(self):
        """
        Initializes the PostgreSQL database connection.
        """
        logger.info("Initializing PostgreSQL connection...")
        try:
            self.conn = psycopg2.connect(
                host=self.config["pg_host"],
                port=self.config["pg_port"],
                database=self.config["pg_dbname"],
                user=self.config["pg_user"],
                password=self.config["pg_password"],
            )
            self.conn.autocommit = True  # Auto-commit for simpler log/metadata inserts
            logger.info("PostgreSQL connection established successfully.")
            self._create_tables_if_not_exists()
        except Error as e:
            logger.error(f"Error connecting to PostgreSQL: {e}")
            raise

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Error),
        reraise=True,
    )
    def _create_tables_if_not_exists(self):
        """
        Creates necessary tables for logs and metadata if they don't already exist.
        """
        cursor = self.conn.cursor()
        try:
            # Table for processing logs/events
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS processing_logs (
                    id SERIAL PRIMARY KEY,
                    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    event_type VARCHAR(255) NOT NULL,
                    narrative_id VARCHAR(255),
                    task_id VARCHAR(255), -- New column for correlation
                    message TEXT,
                    metadata JSONB
                );
            """
            )
            # Table for counter-message metadata (beyond what's in Neo4j)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS counter_message_metadata (
                    id SERIAL PRIMARY KEY,
                    counter_message_id VARCHAR(255) UNIQUE NOT NULL,
                    narrative_id VARCHAR(255) NOT NULL,
                    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(50),
                    channels_dispatched JSONB,
                    response_metrics JSONB
                );
            """
            )
            logger.info("PostgreSQL tables checked/created successfully.")
        except Error as e:
            logger.error(f"Error creating PostgreSQL tables: {e}")
            raise
        finally:
            cursor.close()

    def close(self):
        """
        Closes the PostgreSQL database connection.
        """
        if self.conn:
            self.conn.close()
            logger.info("PostgreSQL connection closed.")

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Error),
        reraise=True,
    )
    def log_processing_event(
        self,
        event_type: str,
        narrative_id: str = None,
        task_id: str = None,
        message: str = None,
        metadata: dict = None,
    ):
        """
        Logs a processing event to the `processing_logs` table.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO processing_logs (event_type, narrative_id, task_id, message, metadata)
                VALUES (%s, %s, %s, %s, %s);
            """,
                (
                    event_type,
                    narrative_id,
                    task_id,
                    message,
                    json.dumps(metadata) if metadata else None,
                ),
            )
            logger.debug(
                f"Logged event: {event_type} for narrative {narrative_id} (Task: {task_id})"
            )
        except Error as e:
            logger.error(f"Error logging processing event: {e}", exc_info=True)
        finally:
            cursor.close()

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(Error),
        reraise=True,
    )
    def save_counter_message_metadata(
        self,
        counter_message_id: str,
        narrative_id: str,
        status: str,
        channels_dispatched: list = None,
        response_metrics: dict = None,
    ):
        """
        Saves metadata about a dispatched counter-message to `counter_message_metadata` table.
        """
        cursor = self.conn.cursor()
        try:
            cursor.execute(
                """
                INSERT INTO counter_message_metadata (counter_message_id, narrative_id, status, channels_dispatched, response_metrics)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (counter_message_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    channels_dispatched = EXCLUDED.channels_dispatched,
                    response_metrics = EXCLUDED.response_metrics,
                    generated_at = EXCLUDED.generated_at; -- Update timestamp on conflict
            """,
                (
                    counter_message_id,
                    narrative_id,
                    status,
                    json.dumps(channels_dispatched) if channels_dispatched else None,
                    json.dumps(response_metrics) if response_metrics else None,
                ),
            )
            logger.info(f"Saved/Updated counter-message metadata for ID: {counter_message_id}")
        except Error as e:
            logger.error(f"Error saving counter-message metadata: {e}", exc_info=True)
        finally:
            cursor.close()


# Example Usage (for testing this module independently)
if __name__ == "__main__":
    import time

    # --- IMPORTANT: Replace these with your actual PostgreSQL details ---
    PG_CONFIG = {
        "pg_host": "localhost",
        "pg_port": 5432,
        "pg_dbname": "intelgraph_db",
        "pg_user": "intelgraph_user",
        "pg_password": "intelgraph_password",
    }

    client = None
    try:
        client = IntelGraphPostgresClient(PG_CONFIG)

        # Test logging a processing event
        logger.info("\n--- Testing log_processing_event ---")
        client.log_processing_event(
            event_type="NARRATIVE_DETECTED",
            narrative_id="narr_12345",
            message="New adversarial narrative identified.",
            metadata={"confidence": 0.95, "keywords": ["collapse", "fear"]},
        )

        # Test saving counter-message metadata
        logger.info("\n--- Testing save_counter_message_metadata ---")
        counter_msg_id = f"cm_{int(time.time())}"
        client.save_counter_message_metadata(
            counter_message_id=counter_msg_id,
            narrative_id="narr_12345",
            status="DISPATCHED",
            channels_dispatched=["twitter", "facebook"],
            response_metrics={"likes": 100, "shares": 20},
        )

        # Test updating counter-message metadata (ON CONFLICT DO UPDATE)
        client.save_counter_message_metadata(
            counter_message_id=counter_msg_id,
            narrative_id="narr_12345",  # Same narrative_id
            status="COMPLETED",  # Updated status
            channels_dispatched=["twitter", "facebook", "telegram"],
            response_metrics={"likes": 250, "shares": 50, "sentiment_change": 0.15},
        )

    except Exception as e:
        logger.error(f"PostgreSQL client test failed: {e}", exc_info=True)
    finally:
        if client:
            client.close()
