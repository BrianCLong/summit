"""Logging configuration for the RAG service with OpenTelemetry forwarding."""

from __future__ import annotations

import json
import logging
import os
import socket
from datetime import datetime
from typing import Any, Dict, MutableMapping, Optional

from opentelemetry import _logs as otel_logs
from opentelemetry import trace
from opentelemetry.sdk._logs import LoggerProvider, LoggingHandler
from opentelemetry.sdk._logs.export import BatchLogRecordProcessor, OTLPLogExporter
from opentelemetry.sdk.resources import Resource

_LOGGER_PROVIDER: Optional[LoggerProvider] = None

_STANDARD_LOG_KEYS = {
    'name',
    'msg',
    'args',
    'levelname',
    'levelno',
    'pathname',
    'filename',
    'module',
    'exc_info',
    'exc_text',
    'stack_info',
    'lineno',
    'funcName',
    'created',
    'msecs',
    'relativeCreated',
    'thread',
    'threadName',
    'processName',
    'process',
}

_SENSITIVE_KEYS = (
    'password',
    'secret',
    'token',
    'authorization',
    'apikey',
    'api_key',
    'ssn',
    'card',
    'email',
)


def configure_logging() -> logging.Logger:
    """Configure structured logging with optional OpenTelemetry forwarding."""

    service_name = os.getenv('OTEL_SERVICE_NAME', 'rag-service')
    environment = os.getenv('DEPLOYMENT_ENV') or os.getenv('NODE_ENV', 'development')
    log_level = os.getenv('LOG_LEVEL', 'INFO').upper()

    logger = logging.getLogger(service_name)
    logger.setLevel(log_level)
    logger.handlers.clear()
    logger.propagate = False

    sanitizing_filter = SanitizingFilter()

    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(log_level)
    stream_handler.addFilter(sanitizing_filter)
    stream_handler.setFormatter(JsonFormatter(service_name, environment))
    logger.addHandler(stream_handler)

    provider = _build_logger_provider(service_name, environment)
    if provider is not None:
        otel_handler = LoggingHandler(level=getattr(logging, log_level, logging.INFO), logger_provider=provider)
        otel_handler.addFilter(sanitizing_filter)
        logger.addHandler(otel_handler)

    return logger


def shutdown_logging() -> None:
    """Flush and shutdown the OpenTelemetry log provider, if configured."""

    global _LOGGER_PROVIDER
    if _LOGGER_PROVIDER is not None:
        _LOGGER_PROVIDER.shutdown()
        _LOGGER_PROVIDER = None


class JsonFormatter(logging.Formatter):
    """Serialize log records as JSON with basic field enrichment."""

    def __init__(self, service_name: str, environment: str) -> None:
        super().__init__()
        self.service_name = service_name
        self.environment = environment

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            'timestamp': datetime.utcfromtimestamp(record.created).isoformat(timespec='milliseconds') + 'Z',
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
            'service': self.service_name,
            'environment': self.environment,
        }

        span = trace.get_current_span()
        span_context = span.get_span_context()
        if span_context.trace_id:
            log_entry['trace_id'] = format(span_context.trace_id, '032x')
            log_entry['span_id'] = format(span_context.span_id, '016x')

        if record.exc_info:
            log_entry['exception'] = self.formatException(record.exc_info)

        extras = _extract_extras(record)
        if extras:
            log_entry['extra'] = extras

        return json.dumps(log_entry, default=str)


class SanitizingFilter(logging.Filter):
    """Scrub sensitive fields before they reach handlers."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: D401
        record.msg = _sanitize_value(record.msg, 'message')
        if record.args:
            record.args = tuple(_sanitize_value(arg, 'arg') for arg in record.args)

        for key in set(vars(record)) - _STANDARD_LOG_KEYS:
            setattr(record, key, _sanitize_value(getattr(record, key), key))

        return True


def _build_logger_provider(service_name: str, environment: str) -> Optional[LoggerProvider]:
    global _LOGGER_PROVIDER

    if _LOGGER_PROVIDER is not None:
        return _LOGGER_PROVIDER

    endpoint = _resolve_logs_endpoint()
    if not endpoint:
        return None

    headers = _parse_headers(
        os.getenv('OTEL_EXPORTER_OTLP_LOGS_HEADERS') or os.getenv('OTEL_EXPORTER_OTLP_HEADERS') or ''
    )

    resource = Resource.create(
        {
            'service.name': service_name,
            'deployment.environment': environment,
            'service.instance.id': os.getenv('HOSTNAME', socket.gethostname()),
        }
    )

    provider = LoggerProvider(resource=resource)
    exporter = OTLPLogExporter(endpoint=endpoint, headers=headers or None)
    provider.add_log_record_processor(BatchLogRecordProcessor(exporter))
    otel_logs.set_logger_provider(provider)
    _LOGGER_PROVIDER = provider
    return provider


def _resolve_logs_endpoint() -> Optional[str]:
    explicit = os.getenv('OTEL_EXPORTER_OTLP_LOGS_ENDPOINT')
    if explicit:
        return explicit.rstrip('/')

    generic = os.getenv('OTEL_EXPORTER_OTLP_ENDPOINT')
    if not generic:
        return None

    base = generic.rstrip('/')
    return f'{base}/v1/logs' if not base.endswith('/v1/logs') else base


def _parse_headers(raw: str) -> Dict[str, str]:
    headers: Dict[str, str] = {}
    for entry in (item.strip() for item in raw.split(',') if item.strip()):
        key, _, value = entry.partition('=')
        if key and value:
            headers[key.strip()] = value.strip()
    return headers


def _extract_extras(record: logging.LogRecord) -> Dict[str, Any]:
    extras: Dict[str, Any] = {}
    for key in set(vars(record)) - _STANDARD_LOG_KEYS:
        value = getattr(record, key)
        extras[key] = value
    return extras


def _sanitize_value(value: Any, key: str, seen: Optional[MutableMapping[int, Any]] = None) -> Any:
    key_lower = key.lower()
    if any(pattern in key_lower for pattern in _SENSITIVE_KEYS):
        return '[REDACTED]'

    if value is None or isinstance(value, (bool, int, float, str)):
        return value

    if isinstance(value, bytes):
        return '[BYTES]'

    if isinstance(value, datetime):
        return value.isoformat()

    if isinstance(value, Exception):
        return {'type': type(value).__name__, 'message': str(value)}

    if isinstance(value, dict):
        seen = seen or {}
        pointer = id(value)
        if pointer in seen:
            return '[Circular]'
        seen[pointer] = True
        return {k: _sanitize_value(v, k, seen) for k, v in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [_sanitize_value(item, key, seen) for item in value]

    if hasattr(value, '__dict__'):
        return _sanitize_value(vars(value), key, seen)

    return str(value)
