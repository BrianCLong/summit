import unittest
from unittest.mock import MagicMock, patch
import datetime
import json
from audit_ingestion import IngestionAuditor

class TestIngestionAuditor(unittest.TestCase):
    def setUp(self):
        self.auditor = IngestionAuditor()
        # Mocking connections
        self.auditor.pg_conn = MagicMock()
        self.auditor.neo4j_driver = MagicMock()

    def test_audit_temporal_gaps(self):
        # Sample data with gaps
        mock_data = [
            {
                "collection_id": "coll-1",
                "created_at": datetime.datetime(2025, 1, 1, 10, 0, 0),
                "prev_ts": datetime.datetime(2025, 1, 1, 9, 0, 0),
                "gap_interval": datetime.timedelta(hours=1)
            },
            {
                "collection_id": "coll-1",
                "created_at": datetime.datetime(2025, 1, 3, 10, 0, 0),
                "prev_ts": datetime.datetime(2025, 1, 1, 10, 0, 0),
                "gap_interval": datetime.timedelta(days=2)
            }
        ]

        # Filter for gaps > 24h as the query would do
        filtered_gaps = [g for g in mock_data if g["gap_interval"] > datetime.timedelta(hours=24)]

        with patch.object(self.auditor, 'run_pg_query', return_value=filtered_gaps):
            self.auditor.audit_temporal_gaps()

            metrics = self.auditor.results["metrics"]["temporal_gaps"]
            self.assertEqual(metrics["count"], 1)
            self.assertEqual(len(metrics["details"]), 1)
            self.assertIn("2 days", metrics["details"][0]["gap_interval"])

    def test_generate_reports(self):
        self.auditor.results["metrics"] = {
            "incomplete_docs": {"count": 5},
            "duplicate_docs": {"count": 2},
            "embedding_health": {"null_count": 1, "zero_magnitude_count": 0}
        }
        self.auditor.results["flags"] = [{"severity": "HIGH", "message": "Test flag"}]

        with patch("builtins.open", unittest.mock.mock_open()) as mocked_file:
            self.auditor.generate_reports()

            # Verify file write calls
            self.assertTrue(mocked_file.called)

            # Check JSON write content
            handle = mocked_file()
            all_writes = "".join(call.args[0] for call in handle.write.call_args_list)
            self.assertIn('"count": 5', all_writes)
            self.assertIn('Test flag', all_writes)

    def test_entity_yield(self):
        mock_yield = [
            {"source_id": "s1", "labels": ["MediaSource"], "entity_count": 10},
            {"source_id": "s2", "labels": ["MediaSource"], "entity_count": 0}
        ]

        with patch.object(self.auditor, 'run_neo4j_query', return_value=mock_yield):
            self.auditor.audit_entity_yield()

            metrics = self.auditor.results["metrics"]["entity_yield"]
            self.assertEqual(len(metrics), 2)

            # Verify low yield flag (average yield = 5, but logic checks if any yield exists)
            # Actually logic checks if average yield < 1
            # (10 + 0) / 2 = 5, so no flag should be added
            flags = [f for f in self.auditor.results["flags"] if "Low average entity yield" in f["message"]]
            self.assertEqual(len(flags), 0)

            # Test low yield flag
            self.auditor.results["flags"] = []
            with patch.object(self.auditor, 'run_neo4j_query', return_value=[{"entity_count": 0.5}]):
                self.auditor.audit_entity_yield()
                flags = [f for f in self.auditor.results["flags"] if "Low average entity yield" in f["message"]]
                self.assertEqual(len(flags), 1)

if __name__ == "__main__":
    unittest.main()
