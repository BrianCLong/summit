import pytest
from summit.influence.decoy_grid import DecoyNarrativeEngine, CounterTerrainMapper, DecoySaturationScore

def test_generate_decoy():
    engine = DecoyNarrativeEngine()
    result = engine.generate_decoy("Election Fraud")
    assert result["id"] == "decoy_election_fraud"
    assert result["target"] == "Election Fraud"
    assert result["type"] == "decoy"
    assert "Election Fraud" in result["content"]

def test_map_terrain():
    mapper = CounterTerrainMapper()

    # Check default terrain values
    result = mapper.map_terrain()
    assert "adversary_footholds" in result
    assert "friendly_terrain" in result
    assert isinstance(result["adversary_footholds"], list)
    assert isinstance(result["friendly_terrain"], list)
    assert len(result["adversary_footholds"]) == 0
    assert len(result["friendly_terrain"]) == 0

    # Add dummy data and test
    mapper.adversary_footholds.append({"id": "adv_node_1"})
    mapper.friendly_terrain.append({"id": "friend_node_1"})

    result2 = mapper.map_terrain()
    assert len(result2["adversary_footholds"]) == 1
    assert result2["adversary_footholds"][0]["id"] == "adv_node_1"
    assert len(result2["friendly_terrain"]) == 1
    assert result2["friendly_terrain"][0]["id"] == "friend_node_1"

def test_decoy_saturation_score():
    assert DecoySaturationScore(5, 10) == 0.5
    assert DecoySaturationScore(0, 10) == 0.0
    assert DecoySaturationScore(5, 0) == 0.0
    assert DecoySaturationScore(5, -5) == 0.0

from fastapi.testclient import TestClient
from summit.main import app

client = TestClient(app)

def test_api_deploy_decoy():
    response = client.post("/api/narrative/deploy-decoy", json={"target_narrative": "fake_news"})
    assert response.status_code == 200
    assert response.json()["id"] == "decoy_fake_news"
    assert response.json()["target"] == "fake_news"
    assert response.json()["type"] == "decoy"

def test_api_terrain_map():
    response = client.get("/api/narrative/terrain-map")
    assert response.status_code == 200
    data = response.json()
    assert "adversary_footholds" in data
    assert "friendly_terrain" in data
