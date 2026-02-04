import logging
import os
from typing import Optional

from opentelemetry import metrics, trace
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import ConsoleMetricExporter, PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter

# Fallback to HTTP if GRPC fails or is preferred (auto-detected usually, but good to be explicit)
# For now, we'll try to import both, but use OTLP generic exporter which often defaults to gRPC.

logger = logging.getLogger(__name__)

class SummitTelemetry:
    _instance = None
    _initialized = False

    def __new__(cls) -> "SummitTelemetry":
        if cls._instance is None:
            cls._instance = super(SummitTelemetry, cls).__new__(cls)
        return cls._instance  # type: ignore

    def initialize(self, service_name: str = "summit-python", version: str = "0.1.0") -> None:
        if self._initialized:
            logger.warning("Telemetry already initialized")
            return

        resource = Resource.create(attributes={
            "service.name": service_name,
            "service.version": version,
            "deployment.environment": os.getenv("NODE_ENV", "development"),
        })

        # --- Tracing ---
        tracer_provider = TracerProvider(resource=resource)

        otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
        if otlp_endpoint:
            try:
                otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint, insecure=True)
                tracer_provider.add_span_processor(BatchSpanProcessor(otlp_exporter))
                logger.info(f"OTLP Trace Exporter initialized at {otlp_endpoint}")
            except Exception as e:
                logger.error(f"Failed to initialize OTLP Trace Exporter: {e}")

        if os.getenv("OTEL_CONSOLE_EXPORTER", "false").lower() == "true":
            tracer_provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
            logger.info("Console Trace Exporter initialized")

        trace.set_tracer_provider(tracer_provider)

        # --- Metrics ---
        metric_readers = []

        if otlp_endpoint:
            try:
                otlp_metric_exporter = OTLPMetricExporter(endpoint=otlp_endpoint, insecure=True)
                metric_readers.append(PeriodicExportingMetricReader(otlp_metric_exporter))
                logger.info(f"OTLP Metric Exporter initialized at {otlp_endpoint}")
            except Exception as e:
                logger.error(f"Failed to initialize OTLP Metric Exporter: {e}")

        if os.getenv("OTEL_CONSOLE_EXPORTER", "false").lower() == "true":
            metric_readers.append(PeriodicExportingMetricReader(ConsoleMetricExporter()))
            logger.info("Console Metric Exporter initialized")

        if metric_readers:
            meter_provider = MeterProvider(resource=resource, metric_readers=metric_readers)
            metrics.set_meter_provider(meter_provider)

        self._initialized = True
        logger.info("Summit Telemetry initialized")

    @property
    def tracer(self) -> trace.Tracer:
        return trace.get_tracer("summit")

    @property
    def meter(self) -> metrics.Meter:
        return metrics.get_meter("summit")

# Singleton accessor
def get_telemetry() -> SummitTelemetry:
    return SummitTelemetry()
