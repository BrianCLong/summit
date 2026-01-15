import contextlib
from collections.abc import Generator
from typing import Any

try:
    from opentelemetry import trace  # type: ignore

    _HAS_OTEL = True
except ImportError:
    _HAS_OTEL = False
    trace = None


@contextlib.contextmanager
def start_span(name: str, **attrs: Any) -> Generator[Any, None, None]:
    """
    Start a span with the given name and attributes.
    If OpenTelemetry is available, create a real span.
    Otherwise, return a no-op context manager.
    """
    if _HAS_OTEL and trace:
        tracer = trace.get_tracer(__name__)
        with tracer.start_as_current_span(name, attributes=attrs) as span:
            yield span
    else:
        yield None
