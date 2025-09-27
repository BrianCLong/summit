import pytest
from httpx import ASGITransport, AsyncClient

from cognitive_insights_engine.sentiment_service import model, router
from cognitive_insights_engine.sentiment_service.main import app


@pytest.mark.asyncio
async def test_analyze_endpoint(monkeypatch):
    async def fake_fetch(driver, entity_id):
        return ["n1", "n2"]

    async def fake_analyze(self, text, neighbours):
        return {
            "sentiment": "positive",
            "score": 0.9,
            "influence_map": {n: 0.45 for n in neighbours},
        }

    monkeypatch.setattr(router, "fetch_neighbour_entities", fake_fetch)
    monkeypatch.setattr(model.LLMGraphSentimentModel, "analyze", fake_analyze)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post("/sentiment/analyze", json={"entity_id": "e1", "text": "hello"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["sentiment"] == "positive"
    assert data["influence_map"] == {"n1": 0.45, "n2": 0.45}
