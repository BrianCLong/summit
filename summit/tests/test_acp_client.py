import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from summit.acp.client import AcpClient

@pytest.fixture
def mock_transport():
    transport = MagicMock()
    transport.start = AsyncMock()
    transport.send = AsyncMock()
    transport.recv_lines = MagicMock()
    transport.close = AsyncMock()
    return transport

@pytest.mark.asyncio
async def test_acp_client_start(mock_transport):
    client = AcpClient(mock_transport)
    async def empty_iter():
        if False: yield
    mock_transport.recv_lines.return_value = empty_iter()

    await client.start()
    mock_transport.start.assert_called_once()
    await client.close()

@pytest.mark.asyncio
async def test_acp_client_send_request(mock_transport):
    client = AcpClient(mock_transport)
    # Mock send to return a future? No, transport.send is awaited.

    await client.send_notification("test_method", {"param": 1})
    client._transport.send.assert_called_once()
    args = client._transport.send.call_args[0][0]
    assert args["method"] == "test_method"
    assert args["params"] == {"param": 1}

@pytest.mark.asyncio
async def test_acp_client_close(mock_transport):
    client = AcpClient(mock_transport)
    # Use a real task that can be cancelled
    async def dummy_task():
        try:
            await asyncio.sleep(1)
        except asyncio.CancelledError:
            pass

    task = asyncio.create_task(dummy_task())
    client._listen_task = task

    await client.close()

    assert task.cancelled() or task.done()
    mock_transport.close.assert_called()
