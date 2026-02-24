from __future__ import annotations

import hashlib
import json
import os
from dataclasses import dataclass
from typing import Any, Callable

from summit.policy.mcp_policy import MCPPolicyConfig, evaluate_mcp_request


DEFAULT_ALLOWED_TOOLS = {
    "alloydb.select_rows",
    "cloudsql.select_rows",
    "spanner.select_rows",
}


def _stable_hash(payload: dict[str, Any]) -> str:
    raw = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(raw).hexdigest()


@dataclass(frozen=True)
class ManagedModeConfig:
    mode: str = "managed"
    enabled: bool = False


class GCPManagedMCPAdapter:
    """Clean-room abstraction for Google Cloud Managed MCP Server."""

    def __init__(
        self,
        endpoint: str,
        project_id: str,
        *,
        policy_config: MCPPolicyConfig | None = None,
        executor: Callable[[str, dict[str, Any]], dict[str, Any]] | None = None,
        mode_config: ManagedModeConfig | None = None,
    ):
        self.endpoint = endpoint
        self.project_id = project_id
        self.policy_config = policy_config or MCPPolicyConfig(
            allowed_tools=set(DEFAULT_ALLOWED_TOOLS),
            allowed_projects={project_id},
            max_rows=100,
        )
        self.executor = executor
        env_enabled = os.getenv("SUMMIT_GCP_MANAGED_MCP_ENABLED", "0") == "1"
        self.mode_config = mode_config or ManagedModeConfig(enabled=env_enabled, mode="managed")

    def query(
        self,
        tool_name: str,
        payload: dict[str, Any],
        *,
        iam_scopes: list[str] | None = None,
    ) -> dict[str, Any]:
        if not self.mode_config.enabled:
            return {
                "status": "denied",
                "reasons": ["feature_flag_disabled"],
                "project_id": self.project_id,
                "tool_name": tool_name,
                "mode": self.mode_config.mode,
            }

        decision = evaluate_mcp_request(
            config=self.policy_config,
            project_id=self.project_id,
            tool_name=tool_name,
            payload=payload,
            iam_scopes=iam_scopes,
        )
        if not decision.allowed:
            return {
                "status": "denied",
                "reasons": decision.reasons,
                "project_id": self.project_id,
                "tool_name": tool_name,
                "mode": self.mode_config.mode,
            }

        capped_limit = min(payload["row_limit"], self.policy_config.max_rows)
        request = {
            "endpoint": self.endpoint,
            "project_id": self.project_id,
            "tool_name": tool_name,
            "payload": {
                "query": payload["query"],
                "row_limit": capped_limit,
            },
            "mode": self.mode_config.mode,
        }

        response = self.executor(tool_name, request) if self.executor else self._mock_execute(request)

        evidence_hash = _stable_hash(
            {
                "project_id": self.project_id,
                "tool_name": tool_name,
                "mode": self.mode_config.mode,
                "payload": request["payload"],
                "rows": response.get("rows", []),
            }
        )[:12]
        evidence_id = f"EVIDENCE:MCP:GCP:{self.project_id}:{evidence_hash}"

        rows = response.get("rows", [])
        return {
            "status": "ok",
            "evidence_id": evidence_id,
            "project_id": self.project_id,
            "tool_name": tool_name,
            "mode": self.mode_config.mode,
            "row_count": len(rows),
            "rows": rows,
            "policy": {
                "deny_by_default": True,
                "max_rows": self.policy_config.max_rows,
            },
        }

    def _mock_execute(self, request: dict[str, Any]) -> dict[str, Any]:
        query = request["payload"]["query"]
        row_limit = request["payload"]["row_limit"]
        columns = sorted(query["columns"])

        mock_row = {column: f"mock_{column}_value" for column in columns}
        rows = [mock_row for _ in range(min(row_limit, 2))]

        return {
            "source": request["endpoint"],
            "rows": rows,
        }
