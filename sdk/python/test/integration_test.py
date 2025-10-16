from unittest.mock import patch

import pytest
from maestro_sdk.client import MaestroClient  # For high-level helpers
from maestro_sdk.maestro_orchestration_api_client.api.runs import get_run_by_id
from maestro_sdk.maestro_orchestration_api_client.client import AuthenticatedClient

BASE_URL = "http://localhost:3000"  # Assuming dev stub runs on port 3000
TEST_RUN_ID = "test-run-123"  # A dummy run ID for testing


@pytest.fixture
def mock_httpx_client():
    with patch("httpx.AsyncClient") as mock_client:
        yield mock_client.return_value


@pytest.mark.asyncio
async def test_get_run_by_id(mock_httpx_client):
    mock_httpx_client.request.return_value.json.return_value = {
        "id": TEST_RUN_ID,
        "status": "SUCCESS",
        "pipeline": "test-pipeline",
    }
    mock_httpx_client.request.return_value.raise_for_status.return_value = None

    client = AuthenticatedClient(base_url=BASE_URL)
    run = await get_run_by_id.asyncio(client=client, run_id=TEST_RUN_ID)
    assert run.id == TEST_RUN_ID
    assert run.status == "SUCCESS"
    mock_httpx_client.request.assert_called_once_with("GET", f"{BASE_URL}/runs/{TEST_RUN_ID}")


@pytest.mark.asyncio
async def test_tail_run_logs(mock_httpx_client):
    mock_httpx_client.request.return_value.text = "log line 1\nlog line 2"
    mock_httpx_client.request.return_value.raise_for_status.return_value = None

    maestro_client = MaestroClient(base_url=BASE_URL)
    logs = await maestro_client.tail_logs(TEST_RUN_ID)
    assert "log line 1" in logs
    mock_httpx_client.request.assert_called_once_with(
        "GET", f"{BASE_URL}/api/maestro/v1/runs/{TEST_RUN_ID}/logs?stream=true"
    )


@pytest.mark.asyncio
async def test_start_run(mock_httpx_client):
    mock_httpx_client.request.return_value.json.return_value = {
        "id": "new-run-456",
        "status": "QUEUED",
        "pipeline": "new-pipeline",
    }
    mock_httpx_client.request.return_value.raise_for_status.return_value = None

    maestro_client = MaestroClient(base_url=BASE_URL)
    run = await maestro_client.start_run(pipeline_id="new-pipeline")
    assert run["id"] == "new-run-456"
    assert run["status"] == "QUEUED"
    mock_httpx_client.request.assert_called_once()  # Check if request was made
