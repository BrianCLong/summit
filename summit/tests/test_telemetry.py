import pytest
from unittest.mock import patch, MagicMock
from summit.telemetry.instrumentation import SummitTelemetry, get_telemetry

def test_telemetry_singleton():
    t1 = get_telemetry()
    t2 = get_telemetry()
    assert t1 is t2

def test_telemetry_initialization():
    # Reset singleton
    SummitTelemetry._instance = None

    with patch("summit.telemetry.instrumentation.TracerProvider") as MockTracerProvider, \
         patch("opentelemetry.trace.set_tracer_provider"), \
         patch("opentelemetry.metrics.set_meter_provider"):

        t = get_telemetry()
        t.initialize(service_name="test-service")

        assert t._initialized is True
        MockTracerProvider.assert_called()

        # Second init should warn
        with patch("summit.telemetry.instrumentation.logger") as mock_logger:
            t.initialize()
            mock_logger.warning.assert_called_with("Telemetry already initialized")

def test_telemetry_properties():
    SummitTelemetry._instance = None
    with patch("opentelemetry.trace.get_tracer") as mock_get_tracer, \
         patch("opentelemetry.metrics.get_meter") as mock_get_meter:

        t = get_telemetry()
        _ = t.tracer
        mock_get_tracer.assert_called_with("summit")

        _ = t.meter
        mock_get_meter.assert_called_with("summit")

def test_telemetry_otlp_exception():
    SummitTelemetry._instance = None
    with patch.dict("os.environ", {"OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4317"}, clear=True), \
         patch("summit.telemetry.instrumentation.OTLPSpanExporter", side_effect=Exception("Failed Trace")), \
         patch("summit.telemetry.instrumentation.logger") as mock_logger, \
         patch("summit.telemetry.instrumentation.TracerProvider"), \
         patch("opentelemetry.trace.set_tracer_provider"), \
         patch("opentelemetry.metrics.set_meter_provider"):

         t = get_telemetry()
         t.initialize()

         # Check if error logger was called
         args, _ = mock_logger.error.call_args
         assert "Failed to initialize OTLP Trace Exporter" in args[0]
