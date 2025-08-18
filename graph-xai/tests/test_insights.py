import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.mark.asyncio
async def test_insight_nodes():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/insights/session123")
    assert res.status_code == 200
    data = res.json()
    assert data["session"] == "session123"
    assert len(data["nodes"]) == 5


@pytest.mark.asyncio
async def test_overlay_toggle():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/overlay", json={"state": "on"})
    assert res.status_code == 200
    assert res.json()["status"] == "on"
