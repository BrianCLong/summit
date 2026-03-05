#!/usr/bin/env python3
"""Emit deterministic Maestro spec artifacts from a structured interview input."""

from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Any

SCHEMA_VERSION = "1.0"
REQUIRED_SECTIONS = [
    "scope",
    "functional_requirements",
    "non_functional_requirements",
    "data_model",
    "agent_design",
    "interfaces",
    "risk_analysis",
    "acceptance_criteria",
]


def canonical_dumps(payload: Any) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def _hash_payload(payload: Any) -> str:
    return hashlib.sha256(canonical_dumps(payload).encode("utf-8")).hexdigest()


def _assign_requirement_ids(items: list[dict[str, Any]], section_code: str) -> list[dict[str, Any]]:
    assigned: list[dict[str, Any]] = []
    for index, req in enumerate(items, start=1):
        req_id = req.get("id") or f"REQ-{section_code}-{index:03d}"
        assigned.append(
            {
                "id": req_id,
                "statement": req["statement"],
                "priority": req.get("priority", "should"),
            }
        )
    return sorted(assigned, key=lambda r: r["id"])


def _load(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    for section in REQUIRED_SECTIONS:
        if section not in data:
            raise ValueError(f"missing required section: {section}")
    return data


def build_spec(interview_data: dict[str, Any]) -> dict[str, Any]:
    spec: dict[str, Any] = {"spec_version": SCHEMA_VERSION}
    for section in REQUIRED_SECTIONS:
        payload = interview_data[section]
        section_code = section.upper()
        requirements = _assign_requirement_ids(payload.get("requirements", []), section_code)
        section_value = {
            "summary": payload["summary"],
            "requirements": requirements,
        }
        if section == "risk_analysis":
            section_value["risks"] = sorted(payload.get("risks", []), key=lambda risk: risk.get("id", ""))
        spec[section] = section_value

    spec["open_questions"] = sorted(interview_data.get("open_questions", []), key=lambda q: q["id"])
    spec["jules_tasks"] = sorted(interview_data.get("jules_tasks", []), key=lambda t: t["id"])
    spec["codex_tasks"] = sorted(interview_data.get("codex_tasks", []), key=lambda t: t["id"])
    return spec


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(canonical_dumps(payload) + "\n", encoding="utf-8")


def emit_artifacts(input_path: Path, output_dir: Path, mode: str) -> Path:
    interview_data = _load(input_path)
    spec = build_spec(interview_data)
    artifact_hash = _hash_payload({"mode": mode, "spec": spec})
    artifact_id = f"maestro-spec.{artifact_hash[:12]}"

    root = output_dir / artifact_id
    spec_bundle = {
        "metadata": {
            "artifact_id": artifact_id,
            "mode": mode,
            "schema_version": SCHEMA_VERSION,
        },
        "spec": spec,
    }
    report = {
        "artifact_id": artifact_id,
        "checks": {
            "all_requirements_have_ids": all(
                req.get("id")
                for section in REQUIRED_SECTIONS
                for req in spec[section].get("requirements", [])
            ),
            "all_sections_present": all(section in spec for section in REQUIRED_SECTIONS),
            "open_questions_captured": isinstance(spec["open_questions"], list),
            "task_seeds_generated": bool(spec["jules_tasks"]) and bool(spec["codex_tasks"]),
        },
    }
    metrics = {
        "artifact_id": artifact_id,
        "open_question_count": len(spec["open_questions"]),
        "requirement_count": sum(len(spec[section]["requirements"]) for section in REQUIRED_SECTIONS),
        "jules_task_count": len(spec["jules_tasks"]),
        "codex_task_count": len(spec["codex_tasks"]),
    }
    stamp = {
        "artifact_id": artifact_id,
        "input_sha256": _hash_payload(interview_data),
        "spec_sha256": _hash_payload(spec),
        "schema_version": SCHEMA_VERSION,
        "mode": mode,
    }

    write_json(root / "spec_bundle.json", spec_bundle)
    write_json(root / "report.json", report)
    write_json(root / "metrics.json", metrics)
    write_json(root / "stamp.json", stamp)
    return root


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Emit deterministic Maestro spec bundle artifacts")
    parser.add_argument("input", type=Path, help="Interview JSON input path")
    parser.add_argument("artifact_root", type=Path, help="Artifact root directory")
    parser.add_argument(
        "--mode",
        default="standard",
        choices=["standard", "adversarial", "mvs", "compliance"],
        help="Interview mode",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    artifact_dir = emit_artifacts(args.input, args.artifact_root, args.mode)
    print(str(artifact_dir / "spec_bundle.json"))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
