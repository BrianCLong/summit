import secrets
from pathlib import Path
from typing import Any

from .models import RunState


def build_preconditions(spec: dict[str, Any]) -> dict[str, Any]:
    required = ["legal_basis", "license_scope", "data_availability"]
    preconditions = {}
    missing: list[str] = []
    for key in required:
        value = spec.get("preconditions", {}).get(key)
        preconditions[key] = value
        if not value:
            missing.append(key)
    preconditions["status"] = "passed" if not missing else "failed"
    preconditions["missing"] = missing
    return preconditions


def build_postconditions(state: RunState, spec: dict[str, Any]) -> dict[str, Any]:
    kpis = spec.get("postconditions", {}).get("kpis", [])
    step_results = []
    for kpi in kpis:
        measurement = None
        measured = state.context
        for path_part in kpi.get("path", []):
            if not isinstance(measured, dict):
                measured = None
                break
            measured = measured.get(path_part)
        measurement = measured
        met = measurement is not None and measurement >= kpi.get("target")
        citations = [
            {
                "source": kpi.get("citation", "run.log"),
                "step": kpi.get("step", "assert_kpis"),
            }
        ]
        step_results.append(
            {
                "id": kpi.get("id"),
                "met": bool(met),
                "target": kpi.get("target"),
                "measurement": measurement,
                "citations": citations,
            }
        )
    status = "passed" if all(k.get("met") for k in step_results) else "failed"
    return {"kpis": step_results, "status": status}


def emit_proof_bundle(state: RunState, spec: dict[str, Any], proofs_dir: Path):
    proofs_dir.mkdir(parents=True, exist_ok=True)
    preconditions = build_preconditions(spec)
    postconditions = build_postconditions(state, spec)
    exports_allowed = preconditions["status"] == "passed" and postconditions["status"] == "passed"
    bundle = {
        "run_id": state.run_id,
        "runbook_id": state.runbook_id,
        "preconditions": preconditions,
        "postconditions": postconditions,
        "exports_allowed": exports_allowed,
    }
    if not exports_allowed:
        bundle["ombuds_review_token"] = secrets.token_hex(8)
    path = proofs_dir / f"{state.run_id}-proof.json"
    path.write_text(
        json_dumps(bundle),
        encoding="utf-8",
    )
    return path, bundle


def json_dumps(data: dict[str, Any]) -> str:
    try:
        import json

        return json.dumps(data, indent=2)
    except Exception as exc:  # pragma: no cover - defensive
        return f"{{'error': 'failed to serialize proof', 'details': '{exc}'}}"
