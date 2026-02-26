#!/usr/bin/env python3
"""Emit deterministic maestro spec bundle artifacts from interview input."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from agents.maestro.interview_engine import build_spec_bundle


def _stable_json(data: Any) -> str:
    return f"{json.dumps(data, indent=2, sort_keys=True)}\n"


def _sha256_hex(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _slugify(value: str) -> str:
    cleaned = []
    for char in value.strip().lower():
        if char.isalnum() or char in {"-", "_"}:
            cleaned.append(char)
        elif char in {" ", "/", "."}:
            cleaned.append("-")
    slug = "".join(cleaned).strip("-")
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug or "maestro-spec"


def _report_for_bundle(bundle: dict[str, Any], slug: str) -> dict[str, Any]:
    checks = {
        "all_sections_present": all(
            isinstance(bundle.get(section), list) and bool(bundle.get(section))
            for section in (
                "functional_requirements",
                "non_functional_requirements",
                "data_model",
                "agent_design",
                "interfaces",
                "risk_analysis",
                "acceptance_criteria",
            )
        ),
        "requirements_have_ids": all(
            isinstance(item.get("id"), str) and item["id"].startswith("REQ-")
            for item in bundle.get("requirement_index", [])
        ),
        "open_questions_captured": isinstance(bundle.get("open_questions"), list),
        "jules_and_codex_seeds_generated": bool(bundle.get("jules_tasks"))
        and bool(bundle.get("codex_tasks")),
        "dod_score_meets_threshold": bool(bundle["definition_of_done"]["passing"]),
        "blocking_questions_resolved": not any(
            question.get("blocking") for question in bundle.get("open_questions", [])
        ),
    }

    status = "pass" if all(checks.values()) else "fail"
    return {
        "evidence_id": "EVD-MAESTRO-SPEC-001",
        "slug": slug,
        "status": status,
        "checks": checks,
        "scorecard": bundle["definition_of_done"],
        "blocking_open_question_ids": [
            question["id"]
            for question in bundle.get("open_questions", [])
            if question.get("blocking")
        ],
    }


def _metrics_for_bundle(bundle: dict[str, Any], slug: str) -> dict[str, Any]:
    return {
        "evidence_id": "EVD-MAESTRO-SPEC-001",
        "slug": slug,
        "metrics": {
            "requirements_total": len(bundle.get("requirement_index", [])),
            "open_questions_total": len(bundle.get("open_questions", [])),
            "jules_tasks_total": len(bundle.get("jules_tasks", [])),
            "codex_tasks_total": len(bundle.get("codex_tasks", [])),
            "contradiction_total": len(bundle["diagnostics"].get("contradictions", [])),
            "ambiguity_hits_total": len(bundle["diagnostics"].get("ambiguity_hits", [])),
            "unknown_hits_total": len(bundle["diagnostics"].get("unknown_hits", [])),
            "dod_total": bundle["definition_of_done"]["total"],
        },
    }


def emit_spec_bundle(
    input_path: Path,
    output_root: Path,
    slug: str | None = None,
    timestamp_override: str | None = None,
) -> Path:
    payload = json.loads(input_path.read_text(encoding="utf-8"))
    bundle = build_spec_bundle(payload)

    resolved_slug = slug or _slugify(str(payload.get("title") or payload.get("scope") or "maestro-spec"))
    out_dir = output_root / resolved_slug
    out_dir.mkdir(parents=True, exist_ok=True)

    report = _report_for_bundle(bundle, resolved_slug)
    metrics = _metrics_for_bundle(bundle, resolved_slug)

    spec_text = _stable_json(bundle)
    report_text = _stable_json(report)
    metrics_text = _stable_json(metrics)

    (out_dir / "spec_bundle.json").write_text(spec_text, encoding="utf-8")
    (out_dir / "report.json").write_text(report_text, encoding="utf-8")
    (out_dir / "metrics.json").write_text(metrics_text, encoding="utf-8")

    generated_at = timestamp_override or datetime.now(timezone.utc).isoformat()
    stamp = {
        "evidence_id": "EVD-MAESTRO-SPEC-001",
        "slug": resolved_slug,
        "generated_at": generated_at,
        "hashes": {
            "spec_bundle_sha256": _sha256_hex(spec_text),
            "report_sha256": _sha256_hex(report_text),
            "metrics_sha256": _sha256_hex(metrics_text),
        },
    }
    (out_dir / "stamp.json").write_text(_stable_json(stamp), encoding="utf-8")

    return out_dir


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Emit deterministic maestro spec bundle artifacts")
    parser.add_argument("--input", required=True, help="Path to interview input JSON")
    parser.add_argument("--output-root", default="artifacts/maestro", help="Output root directory")
    parser.add_argument("--slug", default=None, help="Optional output slug override")
    parser.add_argument(
        "--timestamp",
        default=None,
        help="Optional timestamp override (used for repeatable tests)",
    )
    return parser.parse_args()


def main() -> None:
    args = _parse_args()
    out_dir = emit_spec_bundle(
        input_path=Path(args.input),
        output_root=Path(args.output_root),
        slug=args.slug,
        timestamp_override=args.timestamp,
    )
    print(out_dir.as_posix())


if __name__ == "__main__":
    main()
