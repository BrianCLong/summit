from unittest.mock import MagicMock, patch

import pytest

from ingest.app.ingest import run_job
from ingest.app.models import IngestJobRequest


@pytest.mark.asyncio
@patch("ingest.app.ingest.emit_cost_event")
@patch("ingest.app.ingest._load_source")
async def test_run_job_emits_cost_event(mock_load_source, mock_emit_cost_event):
    # Arrange
    mock_load_source.return_value = '{"id": 1, "tenantId": "test-tenant"}'
    mock_stream = MagicMock()
    request = IngestJobRequest(
        source_type="json",
        source="dummy.json",
        schema_map={"id": "id", "tenantId": "tenantId"},
        redaction_rules=[],
        tenant_id="test-tenant",
        scope_id="test-scope",
    )
    job_id = "test-job-123"

    # Act
    await run_job(job_id, request, mock_stream)

    # Assert
    mock_emit_cost_event.assert_called_once_with(
        operation_type="ingest",
        tenant_id="test-tenant",
        scope_id="test-scope",
        correlation_id=job_id,
        dimensions={
            "io_bytes": 33,
            "objects_written": 1,
            "cpu_ms": pytest.approx(0, abs=100),
        },
    )
