from fastapi import FastAPI
from observability_sdk import TelemetryConfig, bootstrap_telemetry, configure_logging, register_golden_metrics
from opentelemetry import trace
from opentelemetry.trace import Status, StatusCode
import asyncio
import logging
import random

bootstrap_telemetry(TelemetryConfig(service_name="demo-api"))
configure_logging()
metrics = register_golden_metrics("demo-api")
logger = logging.getLogger(__name__)
app = FastAPI()


@app.get("/orders/{order_id}")
async def get_order(order_id: str):
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("api.fetch_order") as span:
        span.set_attribute("app.order_id", order_id)
        metrics["increment_http_requests"]({"route": "/orders/{order_id}", "method": "GET"})

        # Simulate downstream call to worker
        await asyncio.sleep(random.uniform(0.05, 0.15))
        worker_latency = random.uniform(0.02, 0.08)
        metrics["record_worker_latency"](worker_latency, {"queue": "order-fulfillment"})

        if random.random() < 0.05:
            span.set_status(Status(StatusCode.ERROR, "database timeout"))
            logger.error("db timeout for order %s", order_id)
            metrics["record_http_latency"](1.2, {"route": "/orders/{order_id}", "status": "500"})
            return {"status": "error", "message": "temporary issue"}

        metrics["record_http_latency"](0.2, {"route": "/orders/{order_id}", "status": "200"})
        logger.info("order retrieved", extra={"order_id": order_id})
        return {"order_id": order_id, "status": "ok"}
