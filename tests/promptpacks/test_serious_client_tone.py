import json
from pathlib import Path

from summit.promptpacks.serious_client_tone.evaluator import TRANSFORMATION_TEMPLATE
from summit.promptpacks.serious_client_tone.runner import run_fixtures


FIXTURE_DIR = Path("fixtures/serious_client_tone")
GOLDEN_DIR = Path("tests/golden/serious_client_tone")


def load_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def test_serious_client_tone_outputs_match_golden():
    fixtures = sorted(FIXTURE_DIR.glob("*.json"))
    report, metrics, profile = run_fixtures(fixtures)

    assert report == load_json(GOLDEN_DIR / "report.json")
    assert metrics == load_json(GOLDEN_DIR / "metrics.json")
    assert profile == load_json(GOLDEN_DIR / "profile.json")


def test_serious_client_tone_redaction():
    fixtures = sorted(FIXTURE_DIR.glob("*.json"))
    report, _, _ = run_fixtures(fixtures)
    serialized = json.dumps(report, sort_keys=True)

    assert "jodie@example.com" not in serialized
    assert "415-555-1234" not in serialized


def test_transformation_template_is_applied_when_missing():
    fixtures = sorted(FIXTURE_DIR.glob("*.json"))
    report, _, _ = run_fixtures(fixtures)
    newbie = next(item for item in report["results"] if item["input_id"] == "availability_newbie")

    assert newbie["transformation_first"]["present"] is False
    assert "transformation_first_template" in newbie["recommendations"]


def test_template_avoids_impersonation_language():
    lowered = TRANSFORMATION_TEMPLATE.lower()
    assert "impersonate" not in lowered
    assert "pretend" not in lowered
