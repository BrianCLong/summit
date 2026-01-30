from pathlib import Path

import yaml

# Load prohibited items from policy.yaml
ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / "policies" / "influence_governance" / "policy.yaml"

def load_policy_config():
    try:
        with open(POLICY_PATH) as f:
            policy = yaml.safe_load(f)
            return (
                set(policy.get("prohibited_intents", [])),
                set(policy.get("data_handling", {}).get("never_log_fields", []))
            )
    except Exception:
        # Fallback to hardcoded defaults if policy file is missing
        return (
            {"persuasion", "microtargeting", "psychographic_segmentation", "automated_counter_messaging", "covert_influence", "narrative_shaping_playbook"},
            {"individual_id", "device_id", "raw_handle", "psychographic_segment", "persona_target", "message_variant", "call_to_action"}
        )

PROHIBITED_INTENTS, PROHIBITED_FIELDS = load_policy_config()

def validate_request_intent(intent: str) -> None:
    if intent in PROHIBITED_INTENTS:
        raise ValueError(f"Prohibited intent: {intent}")

def validate_payload_no_prohibited_fields(payload: dict) -> None:
    bad = PROHIBITED_FIELDS.intersection(payload.keys())
    if bad:
        raise ValueError(f"Prohibited fields present: {sorted(list(bad))}")
