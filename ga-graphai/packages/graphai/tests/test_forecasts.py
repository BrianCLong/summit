import pathlib
import sys

from fastapi.testclient import TestClient

sys.path.append(str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from main import app  # type: ignore

client = TestClient(app)


def test_indicator_forecast_endpoint():
    response = client.post(
        "/forecast/ioc",
        json={
            "observations": [
                {"date": "2025-08-01", "count": 5, "source": "rss"},
                {"date": "2025-08-02", "count": 7, "source": "telegram"},
                {"date": "2025-08-03", "count": 4, "source": "rss"}
            ],
            "horizon_days": 3,
            "exclude_sources": ["telegram"]
        }
    )
    assert response.status_code == 200
    body = response.json()
    assert body["excludedSources"] == ["telegram"]
    assert len(body["forecast"]) == 3
    assert body["history"][0]["date"] == "2025-08-01"


def test_community_risk_endpoint():
    response = client.post(
        "/forecast/community-risk",
        json={
            "metrics": [
                {
                    "week_start": "2025-08-04",
                    "sanctions_proximity": 0.6,
                    "infra_discoveries": 2,
                    "connectivity_growth": 0.4
                },
                {
                    "week_start": "2025-08-11",
                    "sanctions_proximity": 0.7,
                    "infra_discoveries": 1,
                    "connectivity_growth": 0.5
                }
            ],
            "horizon_weeks": 2,
            "removed_hubs": ["hub-1"]
        }
    )
    assert response.status_code == 200
    body = response.json()
    assert len(body["baseline"]) == 2
    assert len(body["forecast"]) == 2
    assert body["removedHubs"] == ["hub-1"]
    assert body["whatIf"][0]["delta"] <= 0
