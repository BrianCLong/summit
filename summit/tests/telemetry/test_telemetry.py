import pytest
from unittest.mock import patch, MagicMock
from summit.telemetry.instrumentation import SummitTelemetry, get_telemetry

def test_singleton():
    t1 = SummitTelemetry()
    t2 = SummitTelemetry()
    assert t1 is t2
    assert get_telemetry() is t1

def test_initialize(capsys):
    with patch("summit.telemetry.instrumentation.TracerProvider") as MockTracerProvider,          patch("summit.telemetry.instrumentation.OTLPSpanExporter") as MockSpanExporter,          patch("summit.telemetry.instrumentation.BatchSpanProcessor") as MockBatchSpanProcessor,          patch("summit.telemetry.instrumentation.trace") as mock_trace,          patch("summit.telemetry.instrumentation.metrics") as mock_metrics,          patch("summit.telemetry.instrumentation.OTLPMetricExporter") as MockMetricExporter,          patch("summit.telemetry.instrumentation.PeriodicExportingMetricReader") as MockMetricReader,          patch("summit.telemetry.instrumentation.MeterProvider") as MockMeterProvider,          patch("os.getenv", return_value="http://localhost:4318"):

        telemetry = SummitTelemetry()
        # Reset initialized state for test
        telemetry._initialized = False

        telemetry.initialize()

        MockTracerProvider.assert_called()
        MockSpanExporter.assert_called()
        MockBatchSpanProcessor.assert_called()
        mock_trace.set_tracer_provider.assert_called()

        MockMetricExporter.assert_called()
        MockMetricReader.assert_called()
        MockMeterProvider.assert_called()
        mock_metrics.set_meter_provider.assert_called()

        assert telemetry._initialized is True

        # Test re-initialization warning
        with patch("summit.telemetry.instrumentation.logger") as mock_logger:
            telemetry.initialize()
            mock_logger.warning.assert_called_with("Telemetry already initialized")

def test_accessors():
    telemetry = SummitTelemetry()
    with patch("summit.telemetry.instrumentation.trace.get_tracer") as mock_get_tracer,          patch("summit.telemetry.instrumentation.metrics.get_meter") as mock_get_meter:

        _ = telemetry.tracer
        mock_get_tracer.assert_called_with("summit")

        _ = telemetry.meter
        mock_get_meter.assert_called_with("summit")
