import json
from pathlib import Path


def validate_promptspec(payload: dict) -> None:
    required_keys = {
        "id",
        "version",
        "description",
        "inputs_schema",
        "output_schema",
        "prompt_template",
        "policies"
    }
    policy_required = {"tools_allowed", "deny_guaranteed_earnings"}

    missing = required_keys - payload.keys()
    assert not missing, f"Missing required keys: {sorted(missing)}"

    assert isinstance(payload["inputs_schema"], dict)
    assert isinstance(payload["output_schema"], dict)

    policies = payload["policies"]
    assert isinstance(policies, dict)
    missing_policies = policy_required - policies.keys()
    assert not missing_policies, f"Missing policy keys: {sorted(missing_policies)}"

    extra_policy_keys = set(policies.keys()) - policy_required
    assert not extra_policy_keys, f"Unexpected policy keys: {sorted(extra_policy_keys)}"


def test_promptspecs_validate_against_schema() -> None:
    spec_dir = Path("promptspec/specs")
    specs = sorted(spec_dir.glob("*.json"))

    assert specs, "Expected promptspec definitions to exist."

    for spec in specs:
        data = json.loads(spec.read_text())
        validate_promptspec(data)
