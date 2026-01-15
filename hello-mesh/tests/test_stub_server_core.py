import json
import sys
import threading
import time
import unittest
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.stub_server_core import create_server  # noqa: E402


class StubServerCoreTest(unittest.TestCase):
    def setUp(self) -> None:
        self.server = create_server(0, "test-svc")
        self.port = self.server.server_address[1]
        self.thread = threading.Thread(
            target=self.server.serve_forever, kwargs={"poll_interval": 0.1}, daemon=True
        )
        self.thread.start()
        # Give the server a moment to bind
        time.sleep(0.1)

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)

    def _get_json(self, path: str):
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}{path}") as resp:
            body = resp.read()
            return resp.status, json.loads(body)

    def _get_metrics(self) -> str:
        with urllib.request.urlopen(f"http://127.0.0.1:{self.port}/metrics") as resp:
            return resp.read().decode()

    def test_health_endpoint_returns_ok(self) -> None:
        status, payload = self._get_json("/healthz")
        self.assertEqual(status, 200)
        self.assertEqual(payload["service"], "test-svc")
        self.assertEqual(payload["status"], "ok")

    def test_metrics_reflect_requests(self) -> None:
        # Trigger a couple of requests
        self._get_json("/healthz")
        self._get_json("/readyz")
        text = self._get_metrics()
        self.assertIn('hello_mesh_uptime_seconds{service="test-svc"}', text)
        self.assertIn(
            'http_requests_total{service="test-svc",method="GET",path="/healthz"} 1', text
        )
        self.assertIn('http_requests_total{service="test-svc",method="GET",path="/readyz"} 1', text)

    def test_manifest_endpoint_returns_stubbed_payload(self) -> None:
        status, payload = self._get_json("/manifest/abc123")
        self.assertEqual(status, 200)
        self.assertEqual(payload["claim_id"], "abc123")
        self.assertEqual(payload["merkle_root"], "stub-abc123")
        self.assertEqual(payload["service"], "test-svc")

        metrics = self._get_metrics()
        self.assertIn(
            'http_requests_total{service="test-svc",method="GET",path="/manifest/abc123"} 1',
            metrics,
        )


if __name__ == "__main__":
    unittest.main()
