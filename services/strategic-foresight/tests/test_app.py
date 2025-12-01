"""
Tests for Strategic Foresight AI Suite
"""

import pytest
from fastapi.testclient import TestClient

from app import app, TimeHorizon, TrendType, ThreatLevel


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthEndpoints:
    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "strategic-foresight"

    def test_metrics_endpoint(self, client):
        response = client.get("/metrics")
        assert response.status_code == 200
        assert "strategic_foresight" in response.text


class TestForesightAnalysis:
    def test_analyze_basic(self, client):
        response = client.post("/analyze", json={
            "domain": "technology",
            "focus_areas": ["AI", "cloud"],
            "competitors": ["CompetitorA", "CompetitorB"],
            "time_horizon": "medium_term",
            "scenario_count": 3,
            "include_partnerships": True
        })
        assert response.status_code == 200
        data = response.json()

        assert "analysis_id" in data
        assert data["domain"] == "technology"
        assert len(data["trends"]) > 0
        assert len(data["threats"]) > 0
        assert len(data["partnerships"]) > 0
        assert len(data["scenarios"]) == 3
        assert len(data["recommendations"]) > 0
        assert "executive_summary" in data
        assert data["processing_time_ms"] > 0

    def test_analyze_minimal(self, client):
        response = client.post("/analyze", json={
            "domain": "finance"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["domain"] == "finance"

    def test_analyze_without_partnerships(self, client):
        response = client.post("/analyze", json={
            "domain": "defense",
            "include_partnerships": False
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["partnerships"]) == 0


class TestTrends:
    def test_get_trends(self, client):
        response = client.post("/trends", json={
            "domain": "healthcare",
            "indicators": ["AI adoption", "digital health"],
            "time_horizon": "long_term"
        })
        assert response.status_code == 200
        trends = response.json()

        assert len(trends) > 0
        for trend in trends:
            assert "trend_id" in trend
            assert "title" in trend
            assert 0 <= trend["confidence"] <= 1
            assert 0 <= trend["impact_score"] <= 10


class TestThreats:
    def test_get_threats(self, client):
        response = client.post("/threats?domain=technology", json=[
            "Microsoft", "Google", "Amazon"
        ])
        assert response.status_code == 200
        threats = response.json()

        assert len(threats) == 3
        for threat in threats:
            assert "threat_id" in threat
            assert threat["competitor"] in ["Microsoft", "Google", "Amazon"]
            assert threat["threat_level"] in ["low", "medium", "high", "critical"]


class TestPartnerships:
    def test_get_partnerships(self, client):
        response = client.post("/partnerships?domain=technology")
        assert response.status_code == 200
        partnerships = response.json()

        assert len(partnerships) > 0
        for partnership in partnerships:
            assert "opportunity_id" in partnership
            assert "partner" in partnership
            assert 0 <= partnership["strategic_fit_score"] <= 1


class TestScenarios:
    def test_get_scenarios(self, client):
        response = client.post("/scenarios", json={
            "base_conditions": {"market": "growing"},
            "variables": ["regulation", "competition", "technology"],
            "scenario_count": 3
        })
        assert response.status_code == 200
        scenarios = response.json()

        assert len(scenarios) == 3
        for scenario in scenarios:
            assert "scenario_id" in scenario
            assert "name" in scenario
            assert 0 <= scenario["probability"] <= 1


class TestPivots:
    def test_get_pivot_opportunities(self, client):
        response = client.post("/pivots", json={
            "current_position": "Enterprise software",
            "capabilities": ["AI/ML", "Cloud", "Security"],
            "market_signals": ["Government digitization", "Defense modernization"]
        })
        assert response.status_code == 200
        pivots = response.json()

        assert len(pivots) > 0
        for pivot in pivots:
            assert "pivot_id" in pivot
            assert "direction" in pivot
            assert 0 <= pivot["feasibility_score"] <= 1


class TestValidation:
    def test_invalid_scenario_count(self, client):
        response = client.post("/scenarios", json={
            "base_conditions": {},
            "variables": ["x"],
            "scenario_count": 20  # Max is 10
        })
        assert response.status_code == 422

    def test_missing_required_field(self, client):
        response = client.post("/analyze", json={})
        assert response.status_code == 422
