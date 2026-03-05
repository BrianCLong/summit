from __future__ import annotations

import os
import subprocess
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .evidence import hash_payload, metric_rate, write_artifacts
from .validators.json_contract import validate_json_contract
from .validators.latex_compile import validate_latex_sandbox
from .validators.md_table import validate_markdown_table
from .validators.sql_parse import validate_sql_structure


@dataclass(frozen=True)
class Finding:
    evidence_id: str
    kind: str
    rule: str
    severity: str
    message: str
    meta: dict[str, Any]


_KIND_VALIDATORS = {
    "json": validate_json_contract,
    "sql": validate_sql_structure,
    "md_table": lambda payload, _contract=None: validate_markdown_table(payload),
    "latex": validate_latex_sandbox,
}


_KIND_PREFIX = {
    "json": "SC-JS",
    "sql": "SC-SQL",
    "md_table": "SC-MD",
    "latex": "SC-TEX",
}


def _git_sha() -> str:
    try:
        return (
            subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True)
            .strip()
            .lower()
        )
    except (subprocess.CalledProcessError, FileNotFoundError):
        return "unknown"


def run_structcorr(payloads: list[dict[str, Any]], out_dir: Path | None = None) -> dict[str, Any]:
    if os.getenv("SUMMIT_STRUCTCORR", "0") != "1":
        return {"findings": [], "metrics": {"enabled": 0}}

    finding_rows: list[dict[str, Any]] = []
    id_counter = 1
    for item in payloads:
        kind = item["kind"]
        validator = _KIND_VALIDATORS[kind]
        payload = item["payload"]
        contract = item.get("contract", {})
        result_rows = validator(payload, contract)

        for row in result_rows:
            finding = Finding(
                evidence_id=f"{_KIND_PREFIX[kind]}-{id_counter:04d}",
                kind=kind,
                rule=row["rule"],
                severity=row["severity"],
                message=row["message"],
                meta={**row.get("meta", {}), "payload_sha256": hash_payload(payload)},
            )
            finding_rows.append(asdict(finding))
            id_counter += 1

    metrics = {
        "total_findings": len(finding_rows),
        "json_schema_pass_rate": metric_rate(finding_rows, "json"),
        "sql_parse_pass_rate": metric_rate(finding_rows, "sql"),
        "md_table_integrity_rate": metric_rate(finding_rows, "md_table"),
        "latex_compile_pass_rate": metric_rate(finding_rows, "latex"),
        "fail_count": sum(1 for row in finding_rows if row["severity"] == "fail"),
        "enabled": 1,
    }
    report = {"findings": finding_rows, "metrics": metrics}

    destination = out_dir or Path("artifacts/structcorr")
    write_artifacts(report, destination, _git_sha())
    return report
