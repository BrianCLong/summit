import pytest
from unittest.mock import MagicMock, patch
from summit.observability import add_open_telemetry_spans
from opentelemetry import trace
from opentelemetry.trace import SpanContext, TraceFlags

def test_add_open_telemetry_spans_no_span():
    # Test case when no span is active
    logger = MagicMock()
    log_method = "info"
    event_dict = {"key": "value"}

    with patch("opentelemetry.trace.get_current_span", return_value=None):
        result = add_open_telemetry_spans(logger, log_method, event_dict)
        assert result == event_dict
        assert "trace_id" not in result

def test_add_open_telemetry_spans_with_span():
    # Test case when a span is active
    logger = MagicMock()
    log_method = "info"
    event_dict = {"key": "value"}

    mock_span = MagicMock()
    # Mock a valid span context
    trace_id = 0xdeadbeefdeadbeefdeadbeefdeadbeef
    span_id = 0xdeadbeefdeadbeef
    context = SpanContext(trace_id, span_id, is_remote=False)
    mock_span.get_span_context.return_value = context

    with patch("opentelemetry.trace.get_current_span", return_value=mock_span):
        result = add_open_telemetry_spans(logger, log_method, event_dict)
        assert "trace_id" in result
        assert "span_id" in result
