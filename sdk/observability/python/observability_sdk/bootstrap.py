from dataclasses import dataclass
import os

from opentelemetry import trace, metrics
from opentelemetry.sdk.resources import (
    SERVICE_NAME,
    SERVICE_NAMESPACE,
    DEPLOYMENT_ENVIRONMENT,
    Resource,
)
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, OTLPSpanExporter
from opentelemetry.sdk.trace.sampling import TraceIdRatioBased, ParentBased
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter


@dataclass
class TelemetryConfig:
    service_name: str
    service_namespace: str = "summit-portfolio"
    environment: str = os.getenv("DEPLOY_ENV", "development")
    otlp_endpoint: str = os.getenv("OTLP_ENDPOINT", "http://otel-collector:4317")
    trace_sample_ratio: float = 0.05


def bootstrap_telemetry(config: TelemetryConfig) -> None:
    resource = Resource.create(
        attributes={
            SERVICE_NAME: config.service_name,
            SERVICE_NAMESPACE: config.service_namespace,
            DEPLOYMENT_ENVIRONMENT: config.environment,
        }
    )

    span_exporter = OTLPSpanExporter(endpoint=config.otlp_endpoint, insecure=True)
    tracer_provider = TracerProvider(
        resource=resource,
        sampler=ParentBased(TraceIdRatioBased(config.trace_sample_ratio)),
    )
    tracer_provider.add_span_processor(
        BatchSpanProcessor(span_exporter, max_queue_size=2048, max_export_batch_size=512)
    )
    trace.set_tracer_provider(tracer_provider)

    metric_exporter = OTLPMetricExporter(endpoint=config.otlp_endpoint, insecure=True)
    reader = PeriodicExportingMetricReader(exporter=metric_exporter)
    meter_provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(meter_provider)
