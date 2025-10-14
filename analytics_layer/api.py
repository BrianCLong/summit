"""HTTP API for the threat analytics layer."""
from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Dict, Iterable, List, Optional, Tuple

from .data_models import ExternalMeasurement, InternalSignal, WorldEventTrigger
from .metrics import ExplainableMetricsEngine
from .pipeline import DataFusionPipeline
from .threat_index import RealTimeThreatIndexCalculator


@dataclass
class ThreatIndexResponse:
    threat_index: float
    confidence: float
    components: Dict[str, float]
    metrics: Dict[str, float]

    def as_json(self) -> str:
        return json.dumps(asdict(self))


class ThreatIndexService:
    """Service orchestrating the data fusion, metrics, and threat index calculations."""

    def __init__(
        self,
        pipeline: Optional[DataFusionPipeline] = None,
        metrics_engine: Optional[ExplainableMetricsEngine] = None,
        calculator: Optional[RealTimeThreatIndexCalculator] = None,
    ) -> None:
        self._pipeline = pipeline or DataFusionPipeline()
        self._metrics_engine = metrics_engine or ExplainableMetricsEngine()
        self._calculator = calculator or RealTimeThreatIndexCalculator()

    def compute_from_payload(self, payload: Dict[str, Iterable[Dict[str, object]]]) -> ThreatIndexResponse:
        external = [ExternalMeasurement.from_dict(item) for item in payload.get("external_measurements", [])]
        internal = [InternalSignal.from_dict(item) for item in payload.get("internal_signals", [])]
        events = [WorldEventTrigger.from_dict(item) for item in payload.get("world_events", [])]

        snapshot = self._pipeline.fuse(external, internal, events)
        metrics = self._metrics_engine.compute(snapshot)
        state = self._calculator.update(snapshot, metrics)
        return ThreatIndexResponse(
            threat_index=state.value,
            confidence=state.confidence,
            components=state.components,
            metrics=metrics.as_dict(),
        )


class _ThreatIndexRequestHandler(BaseHTTPRequestHandler):
    service: ThreatIndexService = ThreatIndexService()

    def do_POST(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        if self.path != "/threat-index":
            self.send_error(HTTPStatus.NOT_FOUND, "Endpoint not found")
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length) if content_length else b"{}"
        try:
            payload = json.loads(raw_body.decode("utf-8"))
        except json.JSONDecodeError:
            self.send_error(HTTPStatus.BAD_REQUEST, "Invalid JSON payload")
            return

        try:
            response = self.service.compute_from_payload(payload)
        except Exception as exc:  # broad exception to ensure error response
            self.send_error(HTTPStatus.BAD_REQUEST, str(exc))
            return

        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "application/json")
        body = response.as_json().encode("utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format: str, *args: object) -> None:  # noqa: A003 - method signature fixed
        return  # Suppress default logging during tests


def create_http_server(host: str = "127.0.0.1", port: int = 8080, service: Optional[ThreatIndexService] = None) -> HTTPServer:
    """Instantiate an HTTP server bound to the analytics service."""

    handler_class = type(
        "ThreatIndexRequestHandler",
        (_ThreatIndexRequestHandler,),
        {"service": service or ThreatIndexService()},
    )
    return HTTPServer((host, port), handler_class)
