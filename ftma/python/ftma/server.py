"""Reference HTTP server exposing the FTMA coordinator."""

from __future__ import annotations

import json
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Dict, Tuple

from . import Coordinator


class FtmaRequestHandler(BaseHTTPRequestHandler):
    coordinator: Coordinator | None = None

    def _json_response(self, status: HTTPStatus, payload: Dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status.value)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        if self.path != "/status":
            self._json_response(HTTPStatus.NOT_FOUND, {"error": "not found"})
            return
        coord = self.__class__.coordinator
        if coord is None:
            self._json_response(HTTPStatus.SERVICE_UNAVAILABLE, {"status": "uninitialized"})
            return
        self._json_response(
            HTTPStatus.OK,
            {
                "status": "ready",
                "dimension": coord.dimension,
                "scale": coord.scale,
            },
        )

    def do_POST(self) -> None:  # noqa: N802 - required by BaseHTTPRequestHandler
        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length)
        try:
            payload = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._json_response(HTTPStatus.BAD_REQUEST, {"error": "invalid JSON"})
            return

        if self.path == "/register":
            self._handle_register(payload)
        elif self.path == "/finalize":
            self._handle_finalize(payload)
        else:
            self._json_response(HTTPStatus.NOT_FOUND, {"error": "not found"})

    def _handle_register(self, payload: Dict) -> None:
        coord = self.__class__.coordinator
        if coord is None:
            self._json_response(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "coordinator not configured"})
            return
        try:
            client_id = int(payload["client_id"])
            metrics = [float(v) for v in payload["metrics"]]
        except (KeyError, TypeError, ValueError):
            self._json_response(HTTPStatus.BAD_REQUEST, {"error": "invalid register payload"})
            return
        try:
            masked = coord.register_client(client_id, metrics)
        except Exception as exc:  # pragma: no cover - defensive
            self._json_response(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        self._json_response(HTTPStatus.OK, {"masked": masked})

    def _handle_finalize(self, payload: Dict) -> None:
        coord = self.__class__.coordinator
        if coord is None:
            self._json_response(HTTPStatus.SERVICE_UNAVAILABLE, {"error": "coordinator not configured"})
            return
        try:
            active = [int(v) for v in payload["active_clients"]]
        except (KeyError, TypeError, ValueError):
            self._json_response(HTTPStatus.BAD_REQUEST, {"error": "invalid finalize payload"})
            return
        try:
            result = coord.finalize(active)
        except Exception as exc:  # pragma: no cover - defensive
            self._json_response(HTTPStatus.BAD_REQUEST, {"error": str(exc)})
            return
        self._json_response(
            HTTPStatus.OK,
            {
                "sum": result.sum,
                "mean": result.mean,
                "variance": result.variance,
                "participants": result.participants,
                "survivors": result.survivors,
            },
        )


def serve(host: str = "127.0.0.1", port: int = 8080, *, num_clients: int, threshold: int, dimension: int, scale: int = 1_000_000) -> Tuple[str, int]:
    """Start the FTMA reference server and return the bound address."""

    FtmaRequestHandler.coordinator = Coordinator(num_clients, threshold, dimension, scale)
    server = ThreadingHTTPServer((host, port), FtmaRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:  # pragma: no cover - interactive use
        pass
    finally:
        server.server_close()
    return server.server_address


__all__ = ["serve", "FtmaRequestHandler"]
