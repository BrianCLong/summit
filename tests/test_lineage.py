import unittest
import json
import os
import uuid
from lineage.openlineage_producer import OpenLineageProducer
from provenance.exporter import ProvenanceExporter

class TestLineage(unittest.TestCase):
    def setUp(self):
        self.log_file = "lineage_events_test.log"
        if os.path.exists(self.log_file):
            os.remove(self.log_file)

        # Override log file for producer
        self.producer = OpenLineageProducer()
        # Mocking the emit to write to our test log
        self.producer.emit = self._mock_emit

    def _mock_emit(self, event_type, job_name, run_id, inputs=None, outputs=None, job_facets=None, run_facets=None):
        event = {
            "eventType": event_type,
            "job": {"name": job_name},
            "run": {"runId": run_id},
            "inputs": inputs or [],
            "outputs": outputs or []
        }
        with open(self.log_file, "a") as f:
            f.write(json.dumps(event) + "\n")

    def test_openlineage_emission(self):
        run_id = str(uuid.uuid4())
        self.producer.start_job("test_job", run_id)
        self.producer.complete_job("test_job", run_id)

        with open(self.log_file, "r") as f:
            lines = f.readlines()

        self.assertEqual(len(lines), 2)
        event1 = json.loads(lines[0])
        self.assertEqual(event1["eventType"], "START")
        self.assertEqual(event1["job"]["name"], "test_job")

    def test_prov_export(self):
        exporter = ProvenanceExporter()
        slsa_path = "provenance/sample-provenance.intoto.jsonl"
        output_path = "provenance/test-prov-export.json"

        exporter.export_from_slsa(slsa_path, output_path)

        self.assertTrue(os.path.exists(output_path))
        with open(output_path, "r") as f:
            data = json.load(f)

        self.assertIn("entity", data)
        self.assertIn("activity", data)
        self.assertIn("wasGeneratedBy", data)

if __name__ == "__main__":
    unittest.main()
