import uuid
from unittest.mock import MagicMock, patch

import pytest
from intelgraph_py.lineage.openlineage_producer import OpenLineageProducer
from openlineage.client.event_v2 import RunEvent, RunState


class TestOpenLineageProducer:
    @patch("intelgraph_py.lineage.openlineage_producer.OpenLineageClient.from_environment")
    def test_emit_start(self, mock_from_env):
        mock_client_instance = MagicMock()
        mock_from_env.return_value = mock_client_instance

        producer = OpenLineageProducer()

        run_id = str(uuid.uuid4())
        producer.emit_start(job_name="test_job", run_id=run_id, inputs=[{"name": "input_1"}])

        mock_client_instance.emit.assert_called_once()
        args, _ = mock_client_instance.emit.call_args
        event = args[0]
        assert isinstance(event, RunEvent)
        assert event.eventType == RunState.START
        assert event.job.name == "test_job"
        assert len(event.inputs) == 1
        assert event.inputs[0].name == "input_1"

    @patch("intelgraph_py.lineage.openlineage_producer.OpenLineageClient.from_environment")
    def test_emit_complete(self, mock_from_env):
        mock_client_instance = MagicMock()
        mock_from_env.return_value = mock_client_instance

        producer = OpenLineageProducer()

        run_id = str(uuid.uuid4())
        producer.emit_complete(job_name="test_job", run_id=run_id)

        mock_client_instance.emit.assert_called_once()
        args, _ = mock_client_instance.emit.call_args
        event = args[0]
        assert event.eventType == RunState.COMPLETE
