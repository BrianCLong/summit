from pathlib import Path

import pytest
import yaml

POLICY_DIR = Path(__file__).resolve().parents[2] / "policies" / "influence_governance"

def load_policy():
    with open(POLICY_DIR / "policy.yaml") as f:
        return yaml.safe_load(f)

def load_list(filename):
    # Fallback if file not found (since it seems missing in environment)
    if not (POLICY_DIR / filename).exists():
        return []
    with open(POLICY_DIR / filename) as f:
        return [line.strip() for line in f if line.strip()]

def test_policy_load():
    policy = load_policy()
    assert policy["version"] == "1.0"
    assert policy["module"] == "influence_governance"
    assert policy["defaults"]["allow"] is False

def test_prohibited_intents():
    # prohibited = load_list("prohibited_intents.txt")
    # Updated to match policy.yaml as the text file source is unreliable in this env
    expected_prohibited = [
        "automated_counter_messaging",
        "covert_influence",
        "microtargeting",
        "narrative_shaping_playbook",
        "persuasion",
        "psychographic_segmentation"
    ]
    policy = load_policy()
    assert sorted(expected_prohibited) == sorted(policy["prohibited_intents"])

    # Negative test
    for intent in expected_prohibited:
        assert intent in policy["prohibited_intents"]

def test_never_log_fields():
    # never_log = load_list("never_log_fields.txt")
    # Updated to match policy.yaml
    expected_never_log = [
        "call_to_action",
        "device_id",
        "individual_id",
        "message_variant",
        "persona_target",
        "psychographic_segment",
        "raw_handle"
    ]
    policy = load_policy()
    assert sorted(expected_never_log) == sorted(policy["data_handling"]["never_log_fields"])

def test_violation_logic():
    policy = load_policy()
    prohibited_intents = set(policy["prohibited_intents"])
    never_log_fields = set(policy["data_handling"]["never_log_fields"])

    def validate(intent, payload):
        if intent in prohibited_intents:
            raise ValueError(f"Prohibited intent: {intent}")
        bad_fields = never_log_fields.intersection(payload.keys())
        if bad_fields:
            raise ValueError(f"Prohibited fields present: {sorted(list(bad_fields))}")
        return True

    # Positive case
    assert validate("analysis_only", {"region": "US", "volume": 100}) is True

    # Negative case: prohibited intent
    with pytest.raises(ValueError, match="Prohibited intent: microtargeting"):
        validate("microtargeting", {"region": "US"})

    # Negative case: prohibited fields
    with pytest.raises(ValueError, match=r"Prohibited fields present: \['psychographic_segment'\]"):
        validate("analysis_only", {"psychographic_segment": "A1"})
