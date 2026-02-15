import pytest
import logging
import json
from unittest.mock import patch, MagicMock
from summit.telemetry.redaction import sanitize_event
from summit.telemetry.logging import configure_logging, JsonFormatter

def test_sanitize_event():
    data = {
        "user": "john@example.com",
        "nested": {"key": "sk-1234567890abcdef1234567890"},
        "list": ["jane@test.org"]
    }
    redacted = sanitize_event(data)
    assert redacted["user"] == "<EMAIL_REDACTED>"
    assert redacted["nested"]["key"] == "<API_KEY_REDACTED>"
    assert redacted["list"][0] == "<EMAIL_REDACTED>"

def test_logging_configuration():
    with patch("logging.StreamHandler") as MockHandler, \
         patch("logging.getLogger") as MockGetLogger:

        mock_logger = MagicMock()
        mock_logger.handlers = []
        MockGetLogger.return_value = mock_logger

        configure_logging()

        mock_logger.addHandler.assert_called()
        mock_logger.setLevel.assert_called_with(logging.INFO)

def test_json_formatter():
    formatter = JsonFormatter()
    record = logging.LogRecord("name", logging.INFO, "path", 1, "msg", None, None)

    # Trace context mocking might be needed if opentelemetry is active
    with patch("opentelemetry.trace.get_current_span") as mock_span:
        # Mock invalid span to keep it simple
        from opentelemetry import trace
        mock_span.return_value = trace.INVALID_SPAN

        log_output = formatter.format(record)
        parsed = json.loads(log_output)
        assert parsed["message"] == "msg"
        assert parsed["level"] == "INFO"
