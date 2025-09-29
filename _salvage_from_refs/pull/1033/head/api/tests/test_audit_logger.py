import json
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from audit_logger import AuditLoggerMiddleware


class DummyRedis:
    def __init__(self):
        self.messages = []

    def publish(self, channel: str, message: str):
        self.messages.append((channel, message))


import pytest


@pytest.mark.asyncio
async def test_audit_middleware_publishes():
    app = FastAPI()
    dummy = DummyRedis()
    app.add_middleware(AuditLoggerMiddleware, redis_client=dummy)

    @app.get("/graph/nodes")
    async def read_nodes():
        return {"status": "ok"}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/graph/nodes", headers={"X-Role": "analyst"})
    assert resp.status_code == 200
    assert dummy.messages
    channel, payload = dummy.messages[0]
    data = json.loads(payload)
    assert data["user_role"] == "analyst"
    assert data["operation"] == "read"
    assert data["db"] == "neo4j"
