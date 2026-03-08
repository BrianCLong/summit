from typing import Any, Dict, List

import yaml

from summit.audit.events import PolicyDecision, PromptEvent


class PolicyEngine:
    def __init__(self, config_path: str = "policies/prompt_policy.yaml"):
        self.config_path = config_path
        self.config = self._load_config()

    def _load_config(self) -> dict[str, Any]:
        try:
            with open(self.config_path) as f:
                return yaml.safe_load(f)
        except FileNotFoundError:
            # Fallback default if file missing (should not happen in prod)
            return {"default_action": "deny", "require": ["purpose"], "allowed_classifications": []}

    def evaluate(self, event: PromptEvent) -> PolicyDecision:
        reasons = []

        # Check required fields
        for field in self.config.get("require", []):
            if not getattr(event, field, None):
                reasons.append(f"MISSING_{field.upper()}")

        # Check classification
        if event.classification not in self.config.get("allowed_classifications", []):
            reasons.append("INVALID_CLASSIFICATION")

        # Check for secrets/PII in inputs (simulated by checking if we need to redact)
        # In a real flow, we'd redact first, then check reasons.
        # Here we assume the caller might want to know if policy would deny based on content.
        # But wait, the PromptEvent has `inputs_redacted`. If it's already redacted, we can't find secrets.
        # The flow should be: Input -> Redact -> Event(redacted) -> Policy Check?
        # Or: Input -> Policy Check (inc. redaction check) -> Event.
        # The prompt says: "Runtime Policy Gate... evaluate policy (config) + redaction result".

        # We'll assume the event passed in is the Candidate event.
        # If the input text is not available in the event (it only has redacted),
        # we assume the redaction happened and we check the *reasons* for redaction
        # if we had passed them along. But `PromptEvent` doesn't store "redaction reasons".
        # It stores `policy_decision`.

        # Let's assume this evaluate method is called BEFORE the event is finalized,
        # or it takes the raw input separately?
        # The `PromptEvent` structure in `events.py` has `policy_decision`.
        # So this method produces that decision.

        # Let's adjust: evaluate takes the raw input or the redaction result + event metadata.
        # But `evaluate(event: PromptEvent)` implies the event is partially formed.

        # Simpler approach matching the prompt requirements:
        # "default: if classification unknown OR purpose missing OR contains 'never-log fields' => deny or redact"

        action = "allow"

        if reasons:
            action = "deny"
            return PolicyDecision(action=action, reasons=reasons)

        # If we had access to the redaction reasons (e.g. if they were passed in), we would check them.
        # Since we don't have them in the signature, I'll rely on the caller to handle redaction status
        # OR I should update `PromptEvent` to carry `redaction_warnings` if needed.
        # For now, I'll stick to metadata checks.

        return PolicyDecision(action=action, reasons=["POLICY_PASSED"])

def evaluate_event_with_redaction(event: PromptEvent, redaction_reasons: list[str]) -> PolicyDecision:
    """
    Helper to evaluate policy considering redaction results.
    """
    engine = PolicyEngine()
    decision = engine.evaluate(event)

    if decision.action == "deny":
        return decision

    config = engine.config

    final_reasons = []
    action = "allow"

    # Check deny triggers from redaction
    for reason in redaction_reasons:
        if reason in config.get("deny_if_reasons", []):
            action = "deny"
            final_reasons.append(reason)
        elif reason in config.get("redact_if_reasons", []):
            if action != "deny":
                action = "redact"
            final_reasons.append(reason)

    if not final_reasons:
        final_reasons = ["POLICY_PASSED"]

    return PolicyDecision(action=action, reasons=final_reasons)
