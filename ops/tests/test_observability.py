from __future__ import annotations

import unittest

from ops import observability


class ObservabilityCorrelationTest(unittest.TestCase):
    def tearDown(self) -> None:
        observability._CORRELATION_ID.set(None)

    def test_header_seeds_correlation_id(self) -> None:
        cid = "abc-123"
        resolved = observability.get_correlation_id({"x-request-id": cid})
        self.assertEqual(resolved, cid)
        self.assertEqual(observability.get_correlation_id(), cid)

    def test_attach_correlation_header_generates_and_propagates(self) -> None:
        observability._CORRELATION_ID.set(None)
        headers = {}
        result = observability.attach_correlation_header(headers)
        self.assertIn("x-request-id", result)
        self.assertEqual(result["x-request-id"], observability.get_correlation_id())
        self.assertTrue(result["x-request-id"])  # non-empty

    def test_generate_correlation_id_overrides_previous(self) -> None:
        first = observability.generate_correlation_id()
        observability.generate_correlation_id()
        self.assertNotEqual(first, observability.get_correlation_id())


if __name__ == "__main__":  # pragma: no cover
    unittest.main()
