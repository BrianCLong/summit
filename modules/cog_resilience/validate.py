import os
from typing import Any, Dict, Set

import yaml

# Resolve path relative to this file to allow execution from anywhere
_MODULE_DIR = os.path.dirname(os.path.abspath(__file__))
# Go up two levels: modules/cog_resilience -> modules -> root
_REPO_ROOT = os.path.abspath(os.path.join(_MODULE_DIR, "..", ".."))
POLICY_YAML_FILE = os.path.join(_REPO_ROOT, "policies", "cog_resilience", "policy.yaml")

def load_policy_config() -> dict[str, Any]:
    if not os.path.exists(POLICY_YAML_FILE):
        raise FileNotFoundError(f"Policy file not found: {POLICY_YAML_FILE}")
    with open(POLICY_YAML_FILE) as f:
        return yaml.safe_load(f)

# Cache configuration on import
_POLICY_CONFIG = load_policy_config()

def load_prohibited_intents() -> set[str]:
    return set(_POLICY_CONFIG.get("prohibited_intents", []))

def load_never_log_fields() -> set[str]:
    return set(_POLICY_CONFIG.get("data_handling", {}).get("never_log_fields", []))

_PROHIBITED_INTENTS = load_prohibited_intents()
_NEVER_LOG_FIELDS = load_never_log_fields()

def validate_intent(intent: str) -> None:
    """
    Validates that the intent is allowed and not prohibited.
    Raises ValueError if invalid.
    """
    if intent in _PROHIBITED_INTENTS:
        raise ValueError(f"Prohibited intent: {intent}")

    allowed = _POLICY_CONFIG.get("allowed_intents", [])
    if intent not in allowed:
        # Check default allow policy
        if not _POLICY_CONFIG.get("defaults", {}).get("allow", False):
            raise ValueError(f"Intent not explicitly allowed and default is deny: {intent}")

def validate_no_prohibited_fields(payload: dict[str, Any]) -> None:
    """
    Validates that the payload does not contain any prohibited fields.
    Raises ValueError if prohibited fields are found.
    """
    bad = _NEVER_LOG_FIELDS.intersection(payload.keys())
    if bad:
        raise ValueError(f"Prohibited fields present: {sorted(list(bad))}")

def validate_compliance(intent: str, payload: dict[str, Any]) -> None:
    """
    Convenience function to validate both intent and payload.
    """
    validate_intent(intent)
    validate_no_prohibited_fields(payload)
