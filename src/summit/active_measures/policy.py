from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PolicyDecision:
    allowed: bool
    reason: str

def check_investigative_support_only(requested_actions: list[str]) -> PolicyDecision:
    # Deny-by-default: no enforcement/targeting actions.
    forbidden = {"takedown", "harass", "dox", "target_individual"}
    if any(a in forbidden for a in requested_actions):
        return PolicyDecision(False, "forbidden_action")
    return PolicyDecision(True, "ok")

def check_never_log_fields(fields: list[str]) -> PolicyDecision:
    never_log = {"raw_user_id", "raw_post_text", "email", "phone"}
    if any(f in never_log for f in fields):
        return PolicyDecision(False, "never_log_field_present")
    return PolicyDecision(True, "ok")
