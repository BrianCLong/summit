import os
import sys
from fastapi.testclient import TestClient
from fastapi import FastAPI

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from api.analytics import router

app = FastAPI()
app.include_router(router)
client = TestClient(app)


def test_extract_entities():
    resp = client.post("/v1/extract", json={"text": "Alice meets Bob"})
    assert resp.status_code == 200
    data = resp.json()
    assert "entities" in data


def test_linkify():
    payload = {
        "nodes": [{"id": "1", "type": "Person"}, {"id": "2", "type": "Person"}],
        "edges": [],
    }
    resp = client.post("/v1/linkify", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "suggestions" in data
