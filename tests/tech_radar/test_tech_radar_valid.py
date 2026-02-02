import json
from pathlib import Path


def test_tech_radar_schema() -> None:
    data = json.loads(Path("docs/tech-radar/nato-cogwar-techradar.json").read_text())
    assert data["item_slug"] == "nato-cogwar-techfamilies"
    assert data["scope"] == "defensive-only"
    assert data["families"]
    for family in data["families"]:
        assert "name" in family
        assert "evidence_id" in family
