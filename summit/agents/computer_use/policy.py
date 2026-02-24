from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any


class PolicyViolation(RuntimeError):
    """Raised when a task step violates computer-use policy."""


DENY_ACTIONS = {
    "fetch_url",
    "http_request",
    "network_call",
    "open_socket",
}

DEFAULT_ALLOW_ACTIONS = {
    "click",
    "extract_text",
    "open_page",
    "read_state",
    "type_text",
    "wait",
    "write_file",
}


@dataclass(frozen=True)
class ComputerUsePolicy:
    name: str
    allow_actions: frozenset[str]

    @classmethod
    def from_plan(cls, plan: dict[str, Any]) -> "ComputerUsePolicy":
        policy = plan.get("policy")
        if not isinstance(policy, dict) or not policy.get("name"):
            raise PolicyViolation("policy declaration is required")

        raw_allow = policy.get("allow_actions")
        if raw_allow is None:
            allow_actions = frozenset(DEFAULT_ALLOW_ACTIONS)
        else:
            allow_actions = frozenset(str(action) for action in raw_allow)

        return cls(name=str(policy["name"]), allow_actions=allow_actions)

    def validate_step(self, step: dict[str, Any], sandbox_root: Path) -> None:
        action = str(step.get("action", ""))
        if action in DENY_ACTIONS:
            raise PolicyViolation(f"network action denied: {action}")
        if action not in self.allow_actions:
            raise PolicyViolation(f"action not allowlisted: {action}")

        if action == "write_file":
            target = step.get("target")
            if not isinstance(target, str) or not target.strip():
                raise PolicyViolation("write_file requires a non-empty target path")
            target_path = Path(target).expanduser()
            if not target_path.is_absolute():
                target_path = (sandbox_root / target_path).resolve()
            sandbox = sandbox_root.resolve()
            if sandbox not in target_path.parents and target_path != sandbox:
                raise PolicyViolation(
                    f"write_file target is outside sandbox: {target_path}"
                )
