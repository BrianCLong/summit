import json
import os
import random
import time

import redis
from fastapi import BackgroundTasks, FastAPI
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import NoBrokersAvailable

app = FastAPI()

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
NLP_POSTS_TOPIC = "nlp.posts"
SOURCE_SCORES_TOPIC = "source.scores"

redis_client = redis.from_url(REDIS_URL)

producer = None
consumer = None
max_attempts = 10
delay = 5

# Initialize Kafka Producer with retry
for attempt in range(max_attempts):
    try:
        print(
            f"Reliability service: Attempting to connect producer to Kafka (Attempt {attempt + 1}/{max_attempts})..."
        )
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        producer.bootstrap_connected()
        print("Reliability service: Successfully connected producer to Kafka.")
        break
    except NoBrokersAvailable as e:
        print(
            f"Reliability service: Kafka producer connection failed: {e}. Retrying in {delay} seconds..."
        )
        time.sleep(delay)
    except Exception as e:
        print(
            f"Reliability service: An unexpected error occurred during Kafka producer connection: {e}"
        )
        time.sleep(delay)
else:
    raise Exception(
        "Reliability service: Failed to connect producer to Kafka after multiple attempts."
    )

# Initialize Kafka Consumer with retry
for attempt in range(max_attempts):
    try:
        print(
            f"Reliability service: Attempting to connect consumer to Kafka (Attempt {attempt + 1}/{max_attempts})..."
        )
        consumer = KafkaConsumer(
            NLP_POSTS_TOPIC,
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS.split(","),
            auto_offset_reset="earliest",
            group_id="reliability-processor",
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
        )
        # Test connection by trying to get a message (non-blocking)
        consumer.poll(timeout_ms=1000)
        print("Reliability service: Successfully connected consumer to Kafka.")
        break
    except NoBrokersAvailable as e:
        print(
            f"Reliability service: Kafka consumer connection failed: {e}. Retrying in {delay} seconds..."
        )
        time.sleep(delay)
    except Exception as e:
        print(
            f"Reliability service: An unexpected error occurred during Kafka consumer connection: {e}"
        )
        time.sleep(delay)
else:
    raise Exception(
        "Reliability service: Failed to connect consumer to Kafka after multiple attempts."
    )


async def consume_kafka_messages_task():
    print("Reliability service: Starting Kafka consumer background task...")
    for message in consumer:
        post = message.value
        user_id = post.get("metadata", {}).get("user")
        if user_id:
            # Simulate updating source behavior stats in Redis
            redis_client.incr(f"source:{user_id}:posts_count")
            redis_client.incr(f"source:{user_id}:words_count", len(post.get("text", "").split()))
            print(f"Reliability service: Processed post from user {user_id}")


@app.on_event("startup")
async def startup_event():
    background_tasks = BackgroundTasks()
    background_tasks.add_task(consume_kafka_messages_task)


@app.on_event("shutdown")
def shutdown_event():
    producer.close()
    consumer.close()


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/score_source/{source_id}")
def score_source(source_id: str):
    """Returns a simulated reliability score for a given source_id."""
    posts_count = int(redis_client.get(f"source:{source_id}:posts_count") or 0)
    words_count = int(redis_client.get(f"source:{source_id}:words_count") or 0)

    # Simple scoring logic: more posts = higher score, but with some randomness
    score = min(100, posts_count * 10 + random.randint(0, 20))

    source_score = {
        "source_id": source_id,
        "score": score,
        "timestamp": time.time(),
        "metrics": {"posts_count": posts_count, "words_count": words_count},
    }
    producer.send(SOURCE_SCORES_TOPIC, value=source_score)
    print(f"Reliability service: Scored source {source_id} with score {score}")
    return source_score
