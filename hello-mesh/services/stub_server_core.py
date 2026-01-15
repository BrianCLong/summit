"""Shared stub server for hello-mesh services.

Provides predictable health/readiness/metrics endpoints with structured logging.
"""

from __future__ import annotations

import json
import logging
import os
import signal
import sys
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

logger = logging.getLogger("hello_mesh.stub")
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    stream=sys.stdout,
)


class _StubServerState:
    def __init__(self, service_name: str) -> None:
        self.service_name = service_name
        self.start_time = time.time()
        self._lock = threading.Lock()
        self._request_counts: dict[tuple[str, str], int] = {}

    def record(self, method: str, path: str) -> None:
        with self._lock:
            self._request_counts[(method, path)] = self._request_counts.get((method, path), 0) + 1

    def metrics_text(self) -> str:
        uptime = time.time() - self.start_time
        lines = [
            "# HELP hello_mesh_uptime_seconds Service uptime in seconds",
            "# TYPE hello_mesh_uptime_seconds gauge",
            f'hello_mesh_uptime_seconds{{service="{self.service_name}"}} {uptime:.2f}',
            "# HELP http_requests_total Total HTTP requests received by stub",
            "# TYPE http_requests_total counter",
        ]
        with self._lock:
            for (method, path), count in sorted(self._request_counts.items()):
                lines.append(
                    f'http_requests_total{{service="{self.service_name}",method="{method}",path="{path}"}} {count}'
                )
        return "\n".join(lines) + "\n"


def _handler_factory(state: _StubServerState):
    class StubRequestHandler(BaseHTTPRequestHandler):
        server_version = "hello-mesh-stub/1.0"

        def _read_body(self) -> bytes:
            length = int(self.headers.get("Content-Length", "0"))
            return self.rfile.read(length) if length else b""

        def _write_json(
            self, payload: dict[str, object], status: HTTPStatus = HTTPStatus.OK
        ) -> None:
            body = json.dumps(payload).encode()
            self.send_response(status)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def _write_metrics(self) -> None:
            metrics_body = state.metrics_text().encode()
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/plain; version=0.0.4")
            self.send_header("Content-Length", str(len(metrics_body)))
            self.end_headers()
            self.wfile.write(metrics_body)

        def _handle(self) -> None:
            path = self.path.split("?", 1)[0]
            body = self._read_body()
            state.record(self.command, path)
            logger.info(
                "%s %s from %s len=%d", self.command, path, self.client_address[0], len(body)
            )

            if path in ("/healthz", "/readyz"):
                self._write_json({"service": state.service_name, "status": "ok"})
                return

            if path == "/metrics":
                self._write_metrics()
                return

            if path.startswith("/manifest/"):
                claim_id = path.split("/", 2)[2] if path.count("/") >= 2 else ""
                manifest = {
                    "claim_id": claim_id,
                    "merkle_root": f"stub-{claim_id}" if claim_id else "stub",
                    "service": state.service_name,
                    "status": "ok",
                }
                self._write_json(manifest)
                return

            response = {
                "service": state.service_name,
                "status": "ok",
                "path": path,
                "method": self.command,
                "received_bytes": len(body),
                "timestamp": time.time(),
            }
            self._write_json(response)

        def do_GET(self) -> None:
            self._handle()

        def do_POST(self) -> None:
            self._handle()

        def do_PUT(self) -> None:
            self._handle()

        def do_DELETE(self) -> None:
            self._handle()

        def log_message(self, format: str, *args) -> None:
            # Silence default stderr logging; we emit structured logs instead.
            return

    return StubRequestHandler


def create_server(port: int, service_name: str) -> ThreadingHTTPServer:
    state = _StubServerState(service_name)
    handler = _handler_factory(state)
    return ThreadingHTTPServer(("0.0.0.0", port), handler)


def _run() -> None:
    service_name = os.getenv("SERVICE_NAME", "svc")
    port = int(os.getenv("PORT", "8080"))
    server = create_server(port, service_name)

    def shutdown(signum, _frame):
        logger.info("received signal %s, shutting down", signum)
        server.shutdown()

    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)

    logger.info("[%s] listening on :%s", service_name, port)
    server.serve_forever(poll_interval=0.5)


if __name__ == "__main__":
    _run()
