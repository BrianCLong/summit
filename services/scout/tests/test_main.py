import os
import pytest
from fastapi.testclient import TestClient

from scout.src.main import app, is_enabled

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200

def test_is_enabled_missing_key(monkeypatch):
    monkeypatch.setattr("scout.src.main.FLAGSMITH_ENV_KEY", None)
    monkeypatch.delenv("SCOUT_SEARCH_FORCE_DISABLE", raising=False)
    assert not is_enabled("search.scout")

def test_is_enabled_kill_switch(monkeypatch):
    monkeypatch.setattr("scout.src.main.FLAGSMITH_ENV_KEY", "some_key")
    monkeypatch.setenv("SCOUT_SEARCH_FORCE_DISABLE", "true")
    assert not is_enabled("search.scout")

def test_upsert_disabled(monkeypatch):
    monkeypatch.setenv("SCOUT_SEARCH_FORCE_DISABLE", "true")
    response = client.post("/index/testcol/upsert", json={"documents": [{"text": "test"}]})
    assert response.status_code == 403
    assert response.json()["detail"] == "search.scout disabled"

def test_upsert_enabled(monkeypatch):
    monkeypatch.setenv("SCOUT_SEARCH_FORCE_DISABLE", "false")
    monkeypatch.setattr("scout.src.main.is_enabled", lambda flag: True)
    response = client.post("/index/testcol/upsert", json={"documents": [{"text": "test"}]})
    assert response.status_code == 200
    assert response.json()["indexed"] == 1
