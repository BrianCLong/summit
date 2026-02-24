import json
from pathlib import Path

from summit_narrative.governance.policy_engine import evaluate_intervention

FIXTURES = Path("src/summit_narrative/governance/opa/tests/fixtures.json")


def test_policy_fixtures():
    fixtures = json.loads(FIXTURES.read_text())
    for fixture in fixtures.values():
        decision = evaluate_intervention(fixture["intervention"])
        assert decision.decision == fixture["expect"]


def test_external_publish_requires_approval():
    decision = evaluate_intervention(
        {"channel": "external_publish", "simulate_only": False, "human_approval": False}
    )
    assert decision.decision == "deny"


def test_simulate_only_allowed():
    decision = evaluate_intervention({"channel": "internal_review", "simulate_only": True})
    assert decision.decision == "allow"
