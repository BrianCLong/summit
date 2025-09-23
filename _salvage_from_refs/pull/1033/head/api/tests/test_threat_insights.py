from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from threat import router


import pytest


@pytest.mark.asyncio
async def test_threat_insights_endpoint():
    app = FastAPI()
    app.include_router(router)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/threat/insights", params={"target": "Phishing attack on Alice"}
        )
    assert resp.status_code == 200
    data = resp.json()
    assert "score" in data
    assert data["sentiment"] in {"negative", "neutral"}
    assert "origin" in data
    assert "related_actors" in data
