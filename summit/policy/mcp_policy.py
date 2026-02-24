from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

REQUIRED_IAM_SCOPE = "https://www.googleapis.com/auth/cloud-platform.read-only"
SUPPORTED_FILTER_OPS = {"=", "!=", ">", ">=", "<", "<=", "in"}


@dataclass(frozen=True)
class MCPPolicyConfig:
    allowed_tools: set[str] = field(default_factory=set)
    allowed_projects: set[str] = field(default_factory=set)
    max_rows: int = 100


@dataclass(frozen=True)
class MCPPolicyDecision:
    allowed: bool
    reasons: list[str]


def _is_scalar(value: Any) -> bool:
    return isinstance(value, (str, int, float, bool)) or value is None


def _validate_structured_query(payload: dict[str, Any]) -> list[str]:
    reasons: list[str] = []

    if "sql" in payload:
        reasons.append("sql_text_not_allowed")

    query = payload.get("query")
    if not isinstance(query, dict):
        reasons.append("query_must_be_object")
        return reasons

    table = query.get("table")
    columns = query.get("columns")
    if not isinstance(table, str) or not table.strip():
        reasons.append("query_table_required")
    if not isinstance(columns, list) or not columns or not all(isinstance(col, str) and col.strip() for col in columns):
        reasons.append("query_columns_required")

    filters = query.get("filters", [])
    if not isinstance(filters, list):
        reasons.append("query_filters_must_be_list")
        return reasons

    for idx, item in enumerate(filters):
        if not isinstance(item, dict):
            reasons.append(f"filter_{idx}_must_be_object")
            continue
        field_name = item.get("field")
        op = item.get("op")
        value = item.get("value")
        if not isinstance(field_name, str) or not field_name.strip():
            reasons.append(f"filter_{idx}_field_required")
        if op not in SUPPORTED_FILTER_OPS:
            reasons.append(f"filter_{idx}_op_not_supported")
        if not (_is_scalar(value) or (isinstance(value, list) and all(_is_scalar(v) for v in value))):
            reasons.append(f"filter_{idx}_value_not_scalar")

    return reasons


def evaluate_mcp_request(
    *,
    config: MCPPolicyConfig,
    project_id: str,
    tool_name: str,
    payload: dict[str, Any],
    iam_scopes: list[str] | None,
) -> MCPPolicyDecision:
    reasons: list[str] = []

    if tool_name not in config.allowed_tools:
        reasons.append(f"tool_not_allowed:{tool_name}")

    if project_id not in config.allowed_projects:
        reasons.append(f"project_not_allowed:{project_id}")

    if not isinstance(payload, dict):
        reasons.append("payload_must_be_object")
        return MCPPolicyDecision(allowed=False, reasons=sorted(set(reasons)))

    row_limit = payload.get("row_limit")
    if not isinstance(row_limit, int) or row_limit <= 0:
        reasons.append("row_limit_invalid")
    elif row_limit > config.max_rows:
        reasons.append("row_limit_exceeds_policy")

    reasons.extend(_validate_structured_query(payload))

    scopes = set(iam_scopes or [])
    if REQUIRED_IAM_SCOPE not in scopes:
        reasons.append("missing_required_iam_scope")

    deduped = sorted(set(reasons))
    return MCPPolicyDecision(allowed=len(deduped) == 0, reasons=deduped)
