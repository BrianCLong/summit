#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summit.adapters.mcp.gcp_managed import GCPManagedMCPAdapter, ManagedModeConfig
from summit.evidence.mcp_evidence import emit_mcp_evidence
from summit.policy.mcp_policy import MCPPolicyConfig, REQUIRED_IAM_SCOPE


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run GCP managed MCP clean-room probe.")
    parser.add_argument("--endpoint", default="https://mock-gcp-mcp.local")
    parser.add_argument("--project-id", default="demo-project")
    parser.add_argument("--tool-name", default="cloudsql.select_rows")
    parser.add_argument("--table", default="accounts")
    parser.add_argument("--columns", default="account_id,status")
    parser.add_argument("--row-limit", type=int, default=10)
    parser.add_argument("--run-id", default="mcp-gcp-probe")
    parser.add_argument("--git-commit", default=os.getenv("GIT_COMMIT", "unknown"))
    parser.add_argument("--output-dir", default="artifacts/mcp/gcp_probe")
    parser.add_argument("--mode", choices=["managed", "self-hosted"], default="managed")
    parser.add_argument("--enable-feature", action="store_true")
    return parser.parse_args()


def _build_payload(args: argparse.Namespace) -> dict[str, Any]:
    columns = [col.strip() for col in args.columns.split(",") if col.strip()]
    return {
        "query": {
            "table": args.table,
            "columns": columns,
            "filters": [],
        },
        "row_limit": args.row_limit,
    }


def main() -> int:
    args = _parse_args()

    policy = MCPPolicyConfig(
        allowed_tools={args.tool_name},
        allowed_projects={args.project_id},
        max_rows=100,
    )

    adapter = GCPManagedMCPAdapter(
        endpoint=args.endpoint,
        project_id=args.project_id,
        policy_config=policy,
        mode_config=ManagedModeConfig(enabled=args.enable_feature, mode=args.mode),
    )

    payload = _build_payload(args)
    result = adapter.query(
        args.tool_name,
        payload,
        iam_scopes=[REQUIRED_IAM_SCOPE],
    )

    files = emit_mcp_evidence(
        output_dir=args.output_dir,
        run_id=args.run_id,
        git_commit=args.git_commit,
        adapter_result=result,
    )

    output = {
        "status": result.get("status"),
        "evidence_id": result.get("evidence_id"),
        "files": files,
        "mode": args.mode,
        "feature_enabled": args.enable_feature,
    }
    print(json.dumps(output, indent=2, sort_keys=True))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
