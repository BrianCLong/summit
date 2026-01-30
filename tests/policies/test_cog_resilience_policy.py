import os

import pytest
import yaml

POLICY_DIR = "policies/cog_resilience"

def load_policy():
    with open(os.path.join(POLICY_DIR, "policy.yaml")) as f:
        return yaml.safe_load(f)

def test_policy_structure():
    policy = load_policy()
    assert policy["version"] == "1.0"
    assert policy["module"] == "cog_resilience"
    assert policy["defaults"]["allow"] is False
    assert "allowed_intents" in policy
    assert "prohibited_intents" in policy
    assert "data_handling" in policy

def test_prohibited_intents_content():
    policy = load_policy()
    intents = set(policy["prohibited_intents"])
    expected = {
        "persuasion",
        "microtargeting",
        "psychographic_segmentation",
        "counter_messaging_automation",
        "narrative_shaping_playbook",
        "flooding_or_amplification_tactics"
    }
    assert expected.issubset(intents)

def test_never_log_fields_content():
    policy = load_policy()
    fields = set(policy["data_handling"]["never_log_fields"])
    expected = {
        "individual_id",
        "device_id",
        "raw_handle",
        "psychographic_segment",
        "persona_target",
        "message_variant",
        "call_to_action"
    }
    assert expected.issubset(fields)

def test_deny_by_default_simulation():
    policy = load_policy()
    prohibited = set(policy["prohibited_intents"])

    def check_intent(intent):
        if intent in prohibited:
            return False
        if intent in policy["allowed_intents"]:
            return True
        return policy["defaults"]["allow"]

    assert check_intent("analysis_only") is True
    assert check_intent("persuasion") is False
    assert check_intent("unknown_intent") is False

def test_prohibited_fields_simulation():
    policy = load_policy()
    never_log = set(policy["data_handling"]["never_log_fields"])

    def check_payload(payload):
        keys = set(payload.keys())
        if keys.intersection(never_log):
            return False
        return True

    assert check_payload({"value": 1.0, "time_bucket": "2023"}) is True
    assert check_payload({"value": 1.0, "psychographic_segment": "vulnerable"}) is False
