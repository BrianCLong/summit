from typing import Any, Protocol

try:
    from opentelemetry import metrics  # type: ignore

    _HAS_OTEL = True
except ImportError:
    _HAS_OTEL = False
    metrics = None


class Counter(Protocol):
    def add(self, amount: int | float, attributes: dict[str, Any] | None = None) -> None: ...


class Histogram(Protocol):
    def record(self, amount: int | float, attributes: dict[str, Any] | None = None) -> None: ...


class NoOpCounter:
    def add(self, amount: int | float, attributes: dict[str, Any] | None = None) -> None:
        pass


class NoOpHistogram:
    def record(self, amount: int | float, attributes: dict[str, Any] | None = None) -> None:
        pass


def counter(name: str) -> Counter:
    """Returns a counter metric instrument.
    Real instruments when OTel available; otherwise no-op.
    """
    if _HAS_OTEL and metrics:
        meter = metrics.get_meter(__name__)
        return meter.create_counter(name)
    return NoOpCounter()


def histogram(name: str) -> Histogram:
    """Returns a histogram metric instrument.
    Real instruments when OTel available; otherwise no-op.
    """
    if _HAS_OTEL and metrics:
        meter = metrics.get_meter(__name__)
        return meter.create_histogram(name)
    return NoOpHistogram()
