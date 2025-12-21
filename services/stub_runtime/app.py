#!/usr/bin/env python3
"""Reusable stub server for hello-mesh bootstrap services."""
from __future__ import annotations

import json
import logging
import os
import signal
import socket
import threading
import time
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Tuple
from urllib.parse import urlparse

SERVICE_NAME = os.getenv("SERVICE_NAME", "svc")
SERVICE_VERSION = os.getenv("SERVICE_VERSION", "v0.1.0")
PORT = int(os.getenv("PORT", "8080"))
LOG_REQUEST_BODY = os.getenv("LOG_REQUEST_BODY", "false").lower() == "true"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)

_metrics_lock = threading.Lock()
_metrics: Dict[Tuple[str, str], Dict[str, float]] = {}


def _record_metric(method: str, path: str, duration: float) -> None:
    key = (method, path)
    with _metrics_lock:
        entry = _metrics.setdefault(key, {"count": 0, "duration_sum": 0.0})
        entry["count"] += 1
        entry["duration_sum"] += duration


def _metrics_payload() -> str:
    lines = ["# HELP http_requests_total Total HTTP requests received", "# TYPE http_requests_total counter"]
    with _metrics_lock:
        for (method, path), entry in _metrics.items():
            lines.append(
                f'http_requests_total{{service="{SERVICE_NAME}",method="{method}",path="{path}"}} {entry["count"]}'
            )
        lines.append("# HELP http_request_duration_seconds_sum Cumulative request duration seconds")
        lines.append("# TYPE http_request_duration_seconds_sum gauge")
        for (method, path), entry in _metrics.items():
            lines.append(
                "http_request_duration_seconds_sum{service=\"%s\",method=\"%s\",path=\"%s\"} %.6f"
                % (SERVICE_NAME, method, path, entry["duration_sum"])
            )
    return "\n".join(lines) + "\n"


class StubHandler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, format: str, *args) -> None:  # noqa: A003 - BaseHTTPRequestHandler api
        logging.info("%s - %s", self.address_string(), format % args)

    def _json_response(self, status: HTTPStatus, payload: Dict[str, object]) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _text_response(self, status: HTTPStatus, body: str) -> None:
        encoded = body.encode()
        self.send_response(status.value)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _manifest_payload(self, manifest_id: str) -> Dict[str, object]:
        return {
            "service": SERVICE_NAME,
            "manifest_id": manifest_id,
            "status": "ok",
            "timestamp": time.time(),
        }

    def _read_body(self) -> bytes:
        length = int(self.headers.get("content-length", "0"))
        return self.rfile.read(length) if length else b""

    def do_GET(self) -> None:  # noqa: N802 - inherited name
        self._handle_request()

    def do_POST(self) -> None:  # noqa: N802 - inherited name
        self._handle_request()

    def _handle_request(self) -> None:
        start = time.perf_counter()
        parsed = urlparse(self.path)
        path = parsed.path
        body = self._read_body()
        if LOG_REQUEST_BODY and body:
            logging.info("%s %s body=%s", self.command, path, body.decode(errors="replace"))

        if path in ("/healthz", "/readyz"):
            response = {"service": SERVICE_NAME, "version": SERVICE_VERSION, "status": "ok"}
            self._json_response(HTTPStatus.OK, response)
            status_code = HTTPStatus.OK
        elif path.startswith("/manifest/"):
            manifest_id = path.split("/", 2)[2]
            payload = self._manifest_payload(manifest_id)
            self._json_response(HTTPStatus.OK, payload)
            status_code = HTTPStatus.OK
        elif path == "/metrics":
            self._text_response(HTTPStatus.OK, _metrics_payload())
            status_code = HTTPStatus.OK
        else:
            response = {
                "service": SERVICE_NAME,
                "path": path,
                "method": self.command,
                "version": SERVICE_VERSION,
                "status": "ok",
            }
            self._json_response(HTTPStatus.OK, response)
            status_code = HTTPStatus.OK

        duration = time.perf_counter() - start
        _record_metric(self.command, path, duration)
        self.log_message("\"%s %s\" %s %.4fs", self.command, path, status_code, duration)


def _configure_socket(server: ThreadingHTTPServer) -> None:
    server.socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)


def create_server(host: str = "0.0.0.0", port: int = PORT) -> ThreadingHTTPServer:
    server = ThreadingHTTPServer((host, port), StubHandler)
    _configure_socket(server)
    return server


def run_server() -> None:
    server = create_server()

    def _graceful_shutdown(signum: int, frame) -> None:  # type: ignore[override]
        logging.info("Received signal %s, shutting down", signum)
        server.shutdown()

    for sig in (signal.SIGTERM, signal.SIGINT):
        signal.signal(sig, _graceful_shutdown)

    logging.info("[%s] listening on :%s", SERVICE_NAME, PORT)
    try:
        server.serve_forever()
    finally:
        server.server_close()


if __name__ == "__main__":
    run_server()
