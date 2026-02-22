import asyncio
import os
import sys

import pytest

from summit.acp.client import AcpClient
from summit.acp.transport_stdio import StdioNdjsonTransport


async def _run_test():
    # Path to mock server
    mock_server_path = os.path.join(os.path.dirname(__file__), "mock_server.py")
    cmd = [sys.executable, "-u", mock_server_path]

    transport = StdioNdjsonTransport(cmd)
    client = AcpClient(transport)

    notifications = []
    def handler(msg):
        notifications.append(msg)

    client.set_notification_handler(handler)

    await client.start()

    # 1. Initialize
    res = await client.send_request("initialize", {"client": "summit"})
    assert "capabilities" in res

    # 2. New Session
    res = await client.send_request("session/new", {"cwd": "/tmp"})
    assert res["sessionId"] == "sess-123"

    # Wait for notification (simulated in mock)
    for _ in range(10):
        if len(notifications) > 0:
            break
        await asyncio.sleep(0.1)

    assert len(notifications) > 0
    assert notifications[0]["method"] == "session/update"

    # 3. Shutdown
    await client.send_request("shutdown")

    await client.close()

def test_acp_e2e_mock():
    asyncio.run(_run_test())
