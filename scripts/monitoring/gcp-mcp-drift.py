#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from summit.policy.mcp_policy import MCPPolicyConfig, evaluate_mcp_request

CURRENT_SIGNATURE = {
    "endpoint_schema": "https://{region}-managed-mcp.googleapis.com/v1/{project}/tools/{tool}:query",
    "tools": {
        "alloydb.select_rows": ["query", "row_limit"],
        "cloudsql.select_rows": ["query", "row_limit"],
        "spanner.select_rows": ["query", "row_limit"],
    },
    "policy_contract": {
        "deny_by_default": True,
        "requires_structured_query": True,
        "max_rows": 100,
    },
}


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def _policy_regression_check() -> dict[str, Any]:
    config = MCPPolicyConfig(
        allowed_tools={"cloudsql.select_rows"},
        allowed_projects={"drift-project"},
        max_rows=100,
    )
    unauthorized = evaluate_mcp_request(
        config=config,
        project_id="drift-project",
        tool_name="cloudsql.delete_rows",
        payload={"query": {"table": "t", "columns": ["id"], "filters": []}, "row_limit": 1},
        iam_scopes=["https://www.googleapis.com/auth/cloud-platform.read-only"],
    )
    return {
        "deny_by_default_enforced": not unauthorized.allowed,
        "reasons": unauthorized.reasons,
    }


def _compute_drift(baseline: dict[str, Any], current: dict[str, Any]) -> dict[str, Any]:
    endpoint_changed = baseline.get("endpoint_schema") != current.get("endpoint_schema")

    tool_drift: list[str] = []
    baseline_tools = baseline.get("tools", {})
    current_tools = current.get("tools", {})
    for tool_name in sorted(set(baseline_tools) | set(current_tools)):
        if baseline_tools.get(tool_name) != current_tools.get(tool_name):
            tool_drift.append(tool_name)

    policy_drift: list[str] = []
    baseline_policy = baseline.get("policy_contract", {})
    current_policy = current.get("policy_contract", {})
    for key in sorted(set(baseline_policy) | set(current_policy)):
        if baseline_policy.get(key) != current_policy.get(key):
            policy_drift.append(key)

    return {
        "endpoint_schema_changed": endpoint_changed,
        "tool_signature_mismatch": tool_drift,
        "policy_regression_keys": policy_drift,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Detect drift for Summit GCP managed MCP integration.")
    parser.add_argument("--baseline", default="artifacts/mcp/gcp/baseline_signature.json")
    parser.add_argument("--output", default="artifacts/mcp/gcp/drift_report.json")
    parser.add_argument("--write-baseline", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    baseline_path = Path(args.baseline)
    output_path = Path(args.output)

    current = dict(CURRENT_SIGNATURE)
    current["policy_runtime_check"] = _policy_regression_check()

    if args.write_baseline:
        _write_json(baseline_path, CURRENT_SIGNATURE)

    if baseline_path.exists():
        baseline = _load_json(baseline_path)
        drift = _compute_drift(baseline, CURRENT_SIGNATURE)
        mismatches = []
        if drift["endpoint_schema_changed"]:
            mismatches.append("endpoint_schema")
        if drift["tool_signature_mismatch"]:
            mismatches.append("tool_signature")
        if drift["policy_regression_keys"]:
            mismatches.append("policy_contract")
    else:
        baseline = {}
        drift = {
            "endpoint_schema_changed": False,
            "tool_signature_mismatch": [],
            "policy_regression_keys": [],
        }
        mismatches = ["baseline_missing"]

    policy_runtime = current["policy_runtime_check"]
    if not policy_runtime["deny_by_default_enforced"]:
        mismatches.append("deny_by_default_regressed")

    report = {
        "component": "gcp_managed_mcp",
        "baseline_path": str(baseline_path),
        "drift": drift,
        "policy_runtime_check": policy_runtime,
        "mismatches": sorted(set(mismatches)),
        "status": "drift_detected" if mismatches and mismatches != ["baseline_missing"] else "ok",
        "dry_run": args.dry_run,
    }
    _write_json(output_path, report)
    print(json.dumps(report, indent=2, sort_keys=True))

    if args.dry_run:
        return 0

    if mismatches and mismatches != ["baseline_missing"]:
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
