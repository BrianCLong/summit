from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Callable

import yaml

from src.connectors.archiving.submit import run as archive_submit
from src.core.chrono_checklist import run as chrono_checklist
from src.core.geo_hints import run as geo_hints
from src.core.hash import run as hash_inputs
from src.core.metadata import run as metadata_extract
from src.core.normalize import run as normalize_case
from src.core.reverse_image_query_plan import run as reverse_image_prepare
from src.evidence.bundle import emit_bundle
from src.evidence.capture_targets import run as capture_targets
from src.evidence.evid import derive_evid

_STEP_MAP: dict[str, Callable[[dict[str, Any]], dict[str, Any]]] = {
    "core.normalize": normalize_case,
    "core.hash": hash_inputs,
    "evidence.capture_targets": capture_targets,
    "connector.archiving.submit": archive_submit,
    "core.reverse_image.query_plan": reverse_image_prepare,
    "core.metadata.extract": metadata_extract,
    "core.geo.hints": geo_hints,
    "core.chrono.shadow_checklist": chrono_checklist,
}


def _resolve_ref(expr: str, ctx: dict[str, Any]) -> Any:
    path = expr.split(".")
    cur: Any = ctx
    for index, part in enumerate(path):
        if isinstance(cur, dict) and part in cur:
            cur = cur[part]
            continue
        if isinstance(cur, dict):
            joined = ".".join(path[index:])
            if joined in cur:
                return cur[joined]
        raise KeyError(expr)
    return cur


def _resolve_value(value: Any, ctx: dict[str, Any]) -> Any:
    if isinstance(value, str):
        full_match = re.fullmatch(r"\$\{(.+)}", value)
        if full_match:
            return _resolve_ref(full_match.group(1), ctx)
    if isinstance(value, dict):
        return {k: _resolve_value(v, ctx) for k, v in value.items()}
    if isinstance(value, list):
        return [_resolve_value(v, ctx) for v in value]
    return value


def _condition_allows(when: str | None, ctx: dict[str, Any]) -> bool:
    if not when:
        return True
    condition = when.strip().replace("${", "").replace("}", "")
    if "==" in condition:
        left, right = [part.strip() for part in condition.split("==", 1)]
        left_value = _resolve_ref(left, ctx)
        expected = right.lower() == "true"
        return bool(left_value) is expected
    return False


def run_workflow(workflow_path: str, input_payload: dict[str, Any]) -> dict[str, Any]:
    workflow = yaml.safe_load(Path(workflow_path).read_text(encoding="utf-8"))
    ctx: dict[str, Any] = {
        "inputs": input_payload,
        "feature_flags": workflow.get("feature_flags", {}),
        "steps": {},
    }

    for step in workflow["steps"]:
        if not _condition_allows(step.get("when"), ctx):
            ctx["steps"][step["id"]] = {"out": {}}
            continue
        args = _resolve_value(step.get("args", {}), ctx)
        if step["kind"] == "evidence.emit_bundle":
            case_id = args["case_id"]
            media_url = args["media_url"]
            file_hash = args["input_hashes"].get("file_sha256", "")
            evid = derive_evid(case_id, media_url, file_hash)
            report = {
                "case_id": case_id,
                "media_url": media_url,
                "findings": {
                    "reverse_image_plan": args["reverse_image_plan"],
                    "geo_hints": args["geo_hints"],
                    "chrono_checklist": args["chrono_checklist"],
                },
                "human_steps": [
                    "Open manual reverse-image links and record outcomes.",
                    "Fill chrono checklist fields before final chronolocation judgment.",
                ],
            }
            provenance = {
                "evid": evid,
                "steps": [s["id"] for s in workflow["steps"]],
                "hashes": args["input_hashes"],
                "tool_registry_ref": args["tool_registry_ref"],
            }
            out = emit_bundle(workflow["evidence"]["output_dir"], evid, report, provenance)
        else:
            out = _STEP_MAP[step["kind"]](args)
        ctx["steps"][step["id"]] = {"out": out}

    return {"steps": ctx["steps"], "feature_flags": ctx["feature_flags"]}


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("workflow")
    parser.add_argument("--input", required=True)
    parsed = parser.parse_args()
    data = json.loads(Path(parsed.input).read_text(encoding="utf-8"))
    result = run_workflow(parsed.workflow, data)
    print(json.dumps(result, indent=2, sort_keys=True))
