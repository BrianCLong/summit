import asyncio
import logging
import random

from observability_sdk import TelemetryConfig, bootstrap_telemetry, configure_logging, register_golden_metrics
from opentelemetry import trace

bootstrap_telemetry(TelemetryConfig(service_name="demo-worker"))
configure_logging()
metrics = register_golden_metrics("demo-worker")
logger = logging.getLogger(__name__)
tracer = trace.get_tracer(__name__)


async def process_queue():
    while True:
        job_id = random.randint(1000, 9999)
        with tracer.start_as_current_span("worker.process_job") as span:
            span.set_attribute("job.id", job_id)
            duration = random.uniform(0.05, 0.2)
            await asyncio.sleep(duration)
            metrics["record_worker_latency"](duration, {"queue": "order-fulfillment"})
            if random.random() < 0.02:
                logger.error("failed to process job", extra={"job_id": job_id})
            else:
                logger.info("processed job", extra={"job_id": job_id})


if __name__ == "__main__":
    asyncio.run(process_queue())
