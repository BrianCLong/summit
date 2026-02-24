from __future__ import annotations

import json

from summit.adapters.mcp.gcp_managed import GCPManagedMCPAdapter, ManagedModeConfig
from summit.evidence.mcp_evidence import emit_mcp_evidence
from summit.policy.mcp_policy import MCPPolicyConfig, REQUIRED_IAM_SCOPE


def _allowed_policy(project_id: str = "demo-project") -> MCPPolicyConfig:
    return MCPPolicyConfig(
        allowed_tools={"cloudsql.select_rows"},
        allowed_projects={project_id},
        max_rows=50,
    )


def _payload(row_limit: int = 10) -> dict:
    return {
        "query": {
            "table": "accounts",
            "columns": ["account_id", "status"],
            "filters": [{"field": "status", "op": "=", "value": "active"}],
        },
        "row_limit": row_limit,
    }


def test_feature_flag_defaults_to_deny():
    adapter = GCPManagedMCPAdapter(
        endpoint="https://mock-gcp-mcp.local",
        project_id="demo-project",
        policy_config=_allowed_policy(),
        mode_config=ManagedModeConfig(enabled=False),
    )
    result = adapter.query("cloudsql.select_rows", _payload(), iam_scopes=[REQUIRED_IAM_SCOPE])

    assert result["status"] == "denied"
    assert result["reasons"] == ["feature_flag_disabled"]


def test_policy_blocks_unauthorized_tool():
    adapter = GCPManagedMCPAdapter(
        endpoint="https://mock-gcp-mcp.local",
        project_id="demo-project",
        policy_config=_allowed_policy(),
        mode_config=ManagedModeConfig(enabled=True),
    )
    result = adapter.query("cloudsql.delete_rows", _payload(), iam_scopes=[REQUIRED_IAM_SCOPE])

    assert result["status"] == "denied"
    assert "tool_not_allowed:cloudsql.delete_rows" in result["reasons"]


def test_policy_blocks_sql_text_payload():
    adapter = GCPManagedMCPAdapter(
        endpoint="https://mock-gcp-mcp.local",
        project_id="demo-project",
        policy_config=_allowed_policy(),
        mode_config=ManagedModeConfig(enabled=True),
    )
    payload = _payload()
    payload["sql"] = "SELECT * FROM accounts"

    result = adapter.query("cloudsql.select_rows", payload, iam_scopes=[REQUIRED_IAM_SCOPE])

    assert result["status"] == "denied"
    assert "sql_text_not_allowed" in result["reasons"]


def test_policy_blocks_missing_iam_scope():
    adapter = GCPManagedMCPAdapter(
        endpoint="https://mock-gcp-mcp.local",
        project_id="demo-project",
        policy_config=_allowed_policy(),
        mode_config=ManagedModeConfig(enabled=True),
    )
    result = adapter.query("cloudsql.select_rows", _payload(), iam_scopes=[])

    assert result["status"] == "denied"
    assert "missing_required_iam_scope" in result["reasons"]


def test_adapter_result_is_deterministic_for_same_input():
    adapter = GCPManagedMCPAdapter(
        endpoint="https://mock-gcp-mcp.local",
        project_id="demo-project",
        policy_config=_allowed_policy(),
        mode_config=ManagedModeConfig(enabled=True),
    )
    first = adapter.query("cloudsql.select_rows", _payload(), iam_scopes=[REQUIRED_IAM_SCOPE])
    second = adapter.query("cloudsql.select_rows", _payload(), iam_scopes=[REQUIRED_IAM_SCOPE])

    assert first == second
    assert first["status"] == "ok"
    assert first["evidence_id"].startswith("EVIDENCE:MCP:GCP:demo-project:")


def test_row_limit_is_enforced_by_policy():
    adapter = GCPManagedMCPAdapter(
        endpoint="https://mock-gcp-mcp.local",
        project_id="demo-project",
        policy_config=_allowed_policy(),
        mode_config=ManagedModeConfig(enabled=True),
    )

    result = adapter.query("cloudsql.select_rows", _payload(row_limit=1000), iam_scopes=[REQUIRED_IAM_SCOPE])

    assert result["status"] == "denied"
    assert "row_limit_exceeds_policy" in result["reasons"]


def test_evidence_files_are_deterministic_except_stamp(tmp_path):
    adapter = GCPManagedMCPAdapter(
        endpoint="https://mock-gcp-mcp.local",
        project_id="demo-project",
        policy_config=_allowed_policy(),
        mode_config=ManagedModeConfig(enabled=True),
    )
    result = adapter.query("cloudsql.select_rows", _payload(), iam_scopes=[REQUIRED_IAM_SCOPE])

    out_dir = tmp_path / "ev"
    emit_mcp_evidence(
        output_dir=str(out_dir),
        run_id="run-1",
        git_commit="abc123",
        adapter_result=result,
        created_at="2026-01-01T00:00:00Z",
    )

    report_first = json.loads((out_dir / "report.json").read_text())
    metrics_first = json.loads((out_dir / "metrics.json").read_text())

    emit_mcp_evidence(
        output_dir=str(out_dir),
        run_id="run-1",
        git_commit="abc123",
        adapter_result=result,
        created_at="2026-01-01T00:00:00Z",
    )

    report_second = json.loads((out_dir / "report.json").read_text())
    metrics_second = json.loads((out_dir / "metrics.json").read_text())
    stamp = json.loads((out_dir / "stamp.json").read_text())

    assert report_first == report_second
    assert metrics_first == metrics_second
    assert stamp["created_at"] == "2026-01-01T00:00:00Z"
