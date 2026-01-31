import os
import sys
import unittest
from unittest.mock import MagicMock, patch

# Add repo root to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

try:
    from maestro.lineage.openlineage_producer import OpenLineageProducer
except ImportError:
    OpenLineageProducer = None

class TestOpenLineageProducer(unittest.TestCase):
    def setUp(self):
        if not OpenLineageProducer:
            self.skipTest("OpenLineageProducer could not be imported")
        self.mock_client = MagicMock()
        self.producer = OpenLineageProducer(client=self.mock_client)

    def test_emit_start(self):
        import uuid
        run_id = str(uuid.uuid4())
        self.producer.emit_start(run_id=run_id, job_name="test-job")
        self.mock_client.emit.assert_called_once()
        event = self.mock_client.emit.call_args[0][0]
        self.assertEqual(str(event.run.runId), run_id)
        self.assertEqual(event.job.name, "test-job")
        # eventType is an Enum in newer versions, but comparing name or value usually works
        # Depending on version, eventType might be RunState.START object
        self.assertIn("START", str(event.eventType))

    def test_emit_complete(self):
        import uuid
        run_id = str(uuid.uuid4())
        self.producer.emit_complete(run_id=run_id, job_name="test-job")
        self.mock_client.emit.assert_called_once()
        event = self.mock_client.emit.call_args[0][0]
        self.assertIn("COMPLETE", str(event.eventType))

    def test_emit_fail(self):
        import uuid
        run_id = str(uuid.uuid4())
        self.producer.emit_fail(run_id=run_id, job_name="test-job")
        self.mock_client.emit.assert_called_once()
        event = self.mock_client.emit.call_args[0][0]
        self.assertIn("FAIL", str(event.eventType))
