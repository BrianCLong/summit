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

def add_open_telemetry_spans(logger, log_method, event_dict):
    """
    Structlog processor to inject OpenTelemetry trace_id and span_id into log events.
    """
    span = trace.get_current_span()
    # span is always returned, even if it's a NoOpSpan

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
