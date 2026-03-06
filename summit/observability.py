import os
import structlog
import logging
import sys
from fastapi import FastAPI
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.semconv.resource import ResourceAttributes
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.logging import LoggingInstrumentor
from prometheus_fastapi_instrumentator import Instrumentator
from prometheus_client import Counter, Histogram, Gauge

class Metrics:
    """
    Central definition of Summit platform custom metrics.
    """
    # Agent Metrics
    tasks_completed = Counter(
        "summit_agent_tasks_completed_total",
        "Total number of tasks successfully completed by Summit agents",
        ["agent_id", "task_type"]
    )
    tasks_failed = Counter(
        "summit_agent_tasks_failed_total",
        "Total number of tasks failed by Summit agents",
        ["agent_id", "task_type"]
    )
    recapture_success_rate = Gauge(
        "summit_agent_recapture_success_rate",
        "Current success rate of agent recapture mechanisms",
        ["agent_id"]
    )

    # Flow Metrics
    flow_duration = Histogram(
        "summit_flow_duration_seconds",
        "Duration of Summit flows/cycles in seconds",
        ["flow_name"],
        buckets=[0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0, 60.0, 120.0]
    )
    pr_creation = Counter(
        "summit_flow_pr_creation_total",
        "Total number of Pull Requests created by Summit flows",
        ["repository"]
    )
    autonomous_fixes = Counter(
        "summit_flow_autonomous_fixes_total",
        "Total number of autonomous fixes applied by Summit",
        ["fix_type"]
    )

    # Predictive Metrics
    forecast_accuracy = Gauge(
        "summit_predictive_forecast_accuracy",
        "Accuracy score of the predictive foresight engine (0.0 to 1.0)",
        ["model_version"]
    )
    hotspot_lead_time = Gauge(
        "summit_predictive_hotspot_lead_time_seconds",
        "Lead time in seconds for detecting hotspots before they occur",
        ["hotspot_type"]
    )

def add_open_telemetry_spans(logger, log_method, event_dict):
    """
    Structlog processor to inject OpenTelemetry trace_id and span_id into log events.
    """
    span = trace.get_current_span()
    if not span:
        return event_dict

    span_context = span.get_span_context()
    if span_context.is_valid:
        event_dict["trace_id"] = format(span_context.trace_id, "032x")
        event_dict["span_id"] = format(span_context.span_id, "016x")
    return event_dict

def setup_observability(app: FastAPI):
    service_name = os.getenv("OTEL_SERVICE_NAME", "summit-ai")

    # --- Logging Setup ---
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            add_open_telemetry_spans, # Inject Trace IDs
            structlog.processors.JSONRenderer(),
        ],
        context_class=dict,
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    # Configure standard logging to output JSON
    # This ensures uvicorn and other libraries logs are formatted as JSON
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(structlog.stdlib.ProcessorFormatter(
        processor=structlog.processors.JSONRenderer(),
    ))

    root_logger = logging.getLogger()
    root_logger.handlers = [handler]
    root_logger.setLevel(logging.INFO)

    # --- OpenTelemetry Setup ---
    resource = Resource.create(attributes={
        ResourceAttributes.SERVICE_NAME: service_name,
    })

    tracer_provider = TracerProvider(resource=resource)

    # Configure OTLP Exporter if endpoint is provided
    otlp_endpoint = os.getenv("OTEL_EXPORTER_OTLP_TRACES_ENDPOINT")
    if otlp_endpoint:
        # OTLPSpanExporter defaults to http/protobuf
        otlp_exporter = OTLPSpanExporter(endpoint=otlp_endpoint)
        span_processor = BatchSpanProcessor(otlp_exporter)
        tracer_provider.add_span_processor(span_processor)

    trace.set_tracer_provider(tracer_provider)

    # Instrument FastAPI for distributed tracing
    FastAPIInstrumentor.instrument_app(app, tracer_provider=tracer_provider)

    # Instrument Logging to inject trace IDs
    # set_logging_format=False because we handle formatting via structlog
    LoggingInstrumentor().instrument(set_logging_format=False)

    # --- Prometheus Setup ---
    # Expose /metrics endpoint for Prometheus scraping
    # We rely on Prometheus config to attach service labels via 'job' or 'service' label in scrape config
    Instrumentator().instrument(app).expose(app)

    logger = structlog.get_logger()
    logger.info("Observability initialized", service_name=service_name, otlp_endpoint=otlp_endpoint)
