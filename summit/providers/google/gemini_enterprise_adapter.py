from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from .policy import enforce_admin_policy


class GeminiEnterpriseAdapter:
    """Minimal enterprise-aware Gemini adapter with deterministic reporting."""

    PROVIDER_ID = "google_gemini_enterprise"

    def __init__(
        self,
        workspace_id: str | None,
        admin_policy: dict[str, Any] | None = None,
        enterprise_flag: bool | None = None,
    ) -> None:
        self.workspace_id = workspace_id
        self.admin_policy = admin_policy
        self.enterprise_flag = (
            enterprise_flag
            if enterprise_flag is not None
            else _env_flag("FEATURE_GEMINI_ENTERPRISE")
        )

    def supports_enterprise_controls(self) -> bool:
        return True

    def is_enabled(self) -> bool:
        return self.enterprise_flag

    def compile_report(self) -> dict[str, Any]:
        policy_result = enforce_admin_policy(self.admin_policy)
        controls = [
            {
                "id": evidence_id,
                "status": "deny" if not policy_result.allowed else "allow",
            }
            for evidence_id in policy_result.violations
        ]

        return {
            "provider": self.PROVIDER_ID,
            "workspace_bound": bool(self.workspace_id),
            "policy_status": policy_result.policy_status,
            "controls": controls,
        }

    def write_report(self, report_path: str | Path) -> None:
        report = self.compile_report()
        report_file = Path(report_path)
        report_file.parent.mkdir(parents=True, exist_ok=True)
        report_file.write_text(
            json.dumps(report, sort_keys=True, indent=2) + "\n",
            encoding="utf-8",
        )


def _env_flag(name: str) -> bool:
    value = os.environ.get(name, "")
    return value.lower() in {"1", "true", "yes", "on"}
