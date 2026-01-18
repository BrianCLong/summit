import unittest
import os
import json
from sync.postgres_provenance_sync import PostgresProvenanceSync
from sync.graph.graph_ingest import LineageGraphIngest

class TestSyncGraph(unittest.TestCase):
    def test_postgres_sync(self):
        sync = PostgresProvenanceSync()
        output_path = "provenance/test_postgres_sync.json"
        sync.sync_to_file("test_table", output_path)

        self.assertTrue(os.path.exists(output_path))
        with open(output_path, "r") as f:
            data = json.load(f)

        self.assertGreater(len(data), 0)
        self.assertEqual(data[0]["tuple_id"], 1)

    def test_graph_ingest_mock(self):
        # We use the mock behavior since Neo4j isn't running
        ingestor = LineageGraphIngest()

        # Test ingesting postgres lineage
        ingestor.ingest_postgres_lineage("provenance/postgres_lineage.json")

        # Test ingesting OpenLineage events
        # Create a dummy log file
        dummy_log = "test_lineage_events.log"
        with open(dummy_log, "w") as f:
            f.write(json.dumps({
                "eventType": "START",
                "eventTime": "2026-01-18T00:00:00Z",
                "run": {"runId": "run1"},
                "job": {"name": "job1", "namespace": "ns1"},
                "inputs": [],
                "outputs": []
            }) + "\n")

        ingestor.ingest_openlineage_events(dummy_log)
        if os.path.exists(dummy_log):
            os.remove(dummy_log)

if __name__ == "__main__":
    unittest.main()
