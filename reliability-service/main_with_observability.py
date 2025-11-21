"""
Reliability Service with Observability Integration

This is an enhanced version of main.py demonstrating how to integrate
the observability module without changing business logic.

The original business logic (source scoring, Kafka processing) remains unchanged.
Only observability hooks are added.
"""

import json
import os
import random
import time

import redis
from fastapi import BackgroundTasks, FastAPI, Response
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import NoBrokersAvailable

# Import observability module
from observability import (
    tracer,
    metrics,
    create_observability_middleware,
    trace_kafka_message,
    trace_redis_operation,
)

app = FastAPI(title="Reliability Service", version="1.0.0")

# Add observability middleware
app.middleware("http")(create_observability_middleware())

# Configuration (unchanged from original)
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")
KAFKA_BOOTSTRAP_SERVERS = os.environ.get("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
NLP_POSTS_TOPIC = "nlp.posts"
SOURCE_SCORES_TOPIC = "source.scores"

redis_client = redis.from_url(REDIS_URL)

producer = None
consumer = None
max_attempts = 10
delay = 5


# Enhanced Redis wrapper with observability
class ObservableRedisClient:
    """Wrapper around Redis client that adds observability without changing interface"""

    def __init__(self, client):
        self._client = client

    @trace_redis_operation("incr")
    def incr(self, key: str, amount: int = 1):
        return self._client.incr(key, amount)

    @trace_redis_operation("get")
    def get(self, key: str):
        return self._client.get(key)

    @trace_redis_operation("set")
    def set(self, key: str, value):
        return self._client.set(key, value)


# Wrap redis client with observability
observable_redis = ObservableRedisClient(redis_client)


# Initialize Kafka Producer with retry (unchanged business logic)
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

        # Track successful connection
        if metrics._enabled:
            metrics.active_kafka_consumers.set(1)
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

# Initialize Kafka Consumer with retry (unchanged business logic)
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


# Kafka message consumer with observability (business logic unchanged)
@trace_kafka_message(NLP_POSTS_TOPIC)
async def process_kafka_message(post: dict):
    """Process a single Kafka message - business logic unchanged"""
    user_id = post.get("metadata", {}).get("user")
    if user_id:
        # Original business logic - using observable wrapper
        observable_redis.incr(f"source:{user_id}:posts_count")
        observable_redis.incr(f"source:{user_id}:words_count", len(post.get("text", "").split()))
        print(f"Reliability service: Processed post from user {user_id}")


async def consume_kafka_messages_task():
    """Background task to consume Kafka messages"""
    print("Reliability service: Starting Kafka consumer background task...")
    for message in consumer:
        await process_kafka_message(message.value)


@app.on_event("startup")
async def startup_event():
    background_tasks = BackgroundTasks()
    background_tasks.add_task(consume_kafka_messages_task)


@app.on_event("shutdown")
def shutdown_event():
    producer.close()
    consumer.close()
    if metrics._enabled:
        metrics.active_kafka_consumers.set(0)


@app.get("/health")
def health_check():
    """Health check endpoint - unchanged"""
    return {"status": "ok"}


@app.get("/metrics")
def prometheus_metrics():
    """Expose Prometheus metrics endpoint"""
    return Response(
        content=metrics.get_metrics(),
        media_type="text/plain; charset=utf-8"
    )


@app.get("/score_source/{source_id}")
@tracer.trace("score_source")
def score_source(source_id: str):
    """
    Returns a simulated reliability score for a given source_id.

    Business logic is unchanged - only observability decorators added.
    """
    # Track scoring request
    if metrics._enabled:
        metrics.scoring_requests_total.labels(status="started").inc()

    try:
        # Original business logic (unchanged)
        posts_count = int(observable_redis.get(f"source:{source_id}:posts_count") or 0)
        words_count = int(observable_redis.get(f"source:{source_id}:words_count") or 0)

        # Simple scoring logic: more posts = higher score, but with some randomness
        score = min(100, posts_count * 10 + random.randint(0, 20))

        # Track score distribution
        if metrics._enabled:
            metrics.source_scores.observe(score)

        source_score = {
            "source_id": source_id,
            "score": score,
            "timestamp": time.time(),
            "metrics": {"posts_count": posts_count, "words_count": words_count},
        }

        producer.send(SOURCE_SCORES_TOPIC, value=source_score)
        print(f"Reliability service: Scored source {source_id} with score {score}")

        # Track successful scoring
        if metrics._enabled:
            metrics.scoring_requests_total.labels(status="success").inc()

        return source_score

    except Exception as e:
        # Track failed scoring
        if metrics._enabled:
            metrics.scoring_requests_total.labels(status="error").inc()
        raise


"""
=============================================================================
INTEGRATION SUMMARY
=============================================================================

This enhanced version demonstrates:

1. **Zero Business Logic Changes**
   - All original functionality preserved
   - Scoring algorithm unchanged
   - Kafka processing unchanged
   - Redis operations unchanged

2. **Drop-in Observability**
   - `@tracer.trace()` decorator for endpoint tracing
   - `@trace_kafka_message()` for Kafka processing
   - `ObservableRedisClient` wrapper for Redis ops
   - Middleware for automatic HTTP metrics

3. **Exposed Metrics**
   - `/metrics` endpoint for Prometheus scraping
   - HTTP request metrics (rate, errors, duration)
   - Kafka processing metrics
   - Redis operation metrics
   - Source scoring distribution

4. **Distributed Tracing**
   - Automatic span creation for HTTP requests
   - Manual spans for business operations
   - Context propagation across services

Usage:
    # Run the enhanced service
    uvicorn main_with_observability:app --host 0.0.0.0 --port 8080

    # Access metrics
    curl http://localhost:8080/metrics

    # Score a source (with tracing)
    curl http://localhost:8080/score_source/user123

Environment Variables:
    OTEL_SERVICE_NAME=reliability-service
    OTEL_ENABLED=true
    PROMETHEUS_ENABLED=true
    JAEGER_ENDPOINT=http://localhost:14268/api/traces

=============================================================================
"""
