#!/usr/bin/env python3
import json
import threading
import time
import http.client
from contextlib import closing
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from app import SERVICE_NAME, create_server  # type: ignore


class ServerThread(threading.Thread):
    def __init__(self, port: int):
        super().__init__(daemon=True)
        self.server = create_server("127.0.0.1", port)

    @property
    def port(self) -> int:
        return self.server.server_address[1]

    def run(self) -> None:
        self.server.serve_forever()

    def stop(self) -> None:
        self.server.shutdown()
        self.server.server_close()


def _get_json(port: int, path: str) -> dict:
    with closing(http.client.HTTPConnection("127.0.0.1", port)) as conn:
        conn.request("GET", path)
        response = conn.getresponse()
        body = response.read().decode()
        return response.status, json.loads(body)


def test_healthz_returns_ok():
    thread = ServerThread(0)
    thread.start()
    time.sleep(0.05)
    status, body = _get_json(thread.port, "/healthz")
    thread.stop()

    assert status == 200
    assert body["service"] == SERVICE_NAME
    assert body["status"] == "ok"


def test_manifest_echoes_id():
    thread = ServerThread(0)
    thread.start()
    time.sleep(0.05)
    status, body = _get_json(thread.port, "/manifest/abc123")
    thread.stop()

    assert status == 200
    assert body["manifest_id"] == "abc123"


def test_metrics_counts_requests():
    thread = ServerThread(0)
    thread.start()
    time.sleep(0.05)
    _get_json(thread.port, "/healthz")
    _get_json(thread.port, "/readyz")

    with closing(http.client.HTTPConnection("127.0.0.1", thread.port)) as conn:
        conn.request("GET", "/metrics")
        response = conn.getresponse()
        metrics_body = response.read().decode()

    thread.stop()

    assert "http_requests_total" in metrics_body
    assert "/healthz" in metrics_body
    assert "/readyz" in metrics_body
