from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Mapping

from .policy import EnterprisePolicy, EnterprisePolicyError, parse_enterprise_policy


@dataclass(frozen=True)
class EnforcementResult:
    provider: str
    workspace_bound: bool
    policy_status: str
    controls: tuple[str, ...]

    def to_report(self) -> dict[str, Any]:
        return {
            "provider": self.provider,
            "workspace_bound": self.workspace_bound,
            "policy_status": self.policy_status,
            "controls": list(self.controls),
        }


class GeminiEnterpriseAdapter:
    PROVIDER_ID = "google_gemini_enterprise"

    def __init__(self, workspace_id: str | None = None):
        self.workspace_id = workspace_id

    def supports_enterprise_controls(self) -> bool:
        return True

    def enforce_policy(self, raw_policy: Mapping[str, Any] | None) -> EnforcementResult:
        if not self.workspace_id:
            raise EnterprisePolicyError("Workspace ID required for enterprise adapter")

        policy: EnterprisePolicy = parse_enterprise_policy(raw_policy)
        return EnforcementResult(
            provider=self.PROVIDER_ID,
            workspace_bound=policy.workspace_bound,
            policy_status=policy.policy_status,
            controls=policy.controls,
        )

    def write_deterministic_report(self, output_path: str | Path, raw_policy: Mapping[str, Any] | None) -> dict[str, Any]:
        result = self.enforce_policy(raw_policy)
        payload = result.to_report()
        destination = Path(output_path)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        return payload
