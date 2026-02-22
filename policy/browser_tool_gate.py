"""Deny-by-default browser tool gate for WebMCP evidence."""

from __future__ import annotations

from typing import Any

_BLOCKED_EVENT_TYPES = {"execute_inline_script", "external_post"}


def evaluate_browser_session(session: dict[str, Any], origin_allowlist: set[str]) -> dict[str, Any]:
    origin = session.get("origin", "")
    if origin not in origin_allowlist:
        return {"allow": False, "reason": "origin_not_allowlisted"}

    for action in session.get("actions", []):
        action_type = action.get("type", "")
        if action_type in _BLOCKED_EVENT_TYPES:
            return {"allow": False, "reason": f"blocked_action:{action_type}"}

        payload_str = str(action.get("payload", "")).lower()
        if "<script" in payload_str:
            return {"allow": False, "reason": "prompt_injection_pattern"}

    return {"allow": True, "reason": "pass"}
