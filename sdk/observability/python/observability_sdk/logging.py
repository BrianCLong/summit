import logging
import os
from pythonjsonlogger import jsonlogger


PII_TOKENS = ["email", "ssn", "card"]


class ObservabilityJsonFormatter(jsonlogger.JsonFormatter):
    def process_log_record(self, log_record):
        log_record["service.name"] = os.getenv("OTEL_SERVICE_NAME", "")
        log_record["deployment.environment"] = os.getenv("DEPLOY_ENV", "")
        trace_id = os.getenv("OTEL_TRACE_ID")
        span_id = os.getenv("OTEL_SPAN_ID")
        if trace_id:
            log_record["trace_id"] = trace_id
        if span_id:
            log_record["span_id"] = span_id

        message = str(log_record.get("message", ""))
        log_record["message"] = redact(message)
        return super().process_log_record(log_record)


def configure_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(ObservabilityJsonFormatter())
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers = [handler]


def redact(value: str) -> str:
    lower = value.lower()
    for token in PII_TOKENS:
        if token in lower:
            return value.replace(token, f"{token}:***redacted***")
    return value
