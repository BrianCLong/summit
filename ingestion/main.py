import json
import os
import time

from kafka import KafkaProducer
from kafka.errors import NoBrokersAvailable

from ingestion.ingestors import DEFAULT_SOURCES, build_ingestors

print("Ingestion service starting up...")

KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
RAW_POSTS_TOPIC = os.environ.get("RAW_POSTS_TOPIC", "raw.posts")
INGEST_LOOP_SECONDS = int(os.environ.get("INGEST_LOOP_SECONDS", "5"))
SOURCE_CONFIG_ENV = "INGEST_SOURCE_CONFIG"

producer = None
max_attempts = 10
delay = 5

for attempt in range(max_attempts):
    try:
        print(f"Attempting to connect to Kafka (Attempt {attempt + 1}/{max_attempts})...")
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        producer.bootstrap_connected()
        print("Successfully connected to Kafka.")
        break
    except NoBrokersAvailable as e:
        print(f"Kafka connection failed: {e}. Retrying in {delay} seconds...")
        time.sleep(delay)
    except Exception as e:
        print(f"An unexpected error occurred during Kafka connection: {e}")
        time.sleep(delay)
else:
    raise Exception("Failed to connect to Kafka after multiple attempts.")


def _load_source_config() -> list[dict[str, object]]:
    raw = os.environ.get(SOURCE_CONFIG_ENV)
    if not raw:
        return DEFAULT_SOURCES

    try:
        config = json.loads(raw)
        if isinstance(config, list):
            return [item for item in config if isinstance(item, dict)]
    except json.JSONDecodeError:
        print(f"Invalid {SOURCE_CONFIG_ENV}; using default sources")

    return DEFAULT_SOURCES


def main():
    source_config = _load_source_config()
    ingestors = build_ingestors(producer=producer, topic=RAW_POSTS_TOPIC, source_configs=source_config)

    print(f"Starting ingestion service with {len(ingestors)} sources...")
    while True:
        for ingestor in ingestors:
            ingestor.run()
        time.sleep(INGEST_LOOP_SECONDS)


if __name__ == "__main__":
    main()
