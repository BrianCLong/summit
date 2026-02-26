#!/usr/bin/env python3
"""Generate deterministic, policy-aware agent documentation artifacts."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

EVIDENCE_ID_PATTERN = r"^EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$"
DEFAULT_STAMP_TIMESTAMP = "1970-01-01T00:00:00Z"


def _stable_json(payload: object) -> str:
    return json.dumps(payload, indent=2, sort_keys=True) + "\n"


def _is_enabled() -> bool:
    value = os.environ.get("AGENT_DOCS_ENABLED", "false").strip().lower()
    return value in {"1", "true", "yes", "on"}


def _build_agent_doc() -> dict[str, object]:
    return {
        "deterministic": True,
        "evidence_id_pattern": EVIDENCE_ID_PATTERN,
        "input_schema": {
            "additionalProperties": False,
            "properties": {
                "evidence_budget": {"minimum": 1, "type": "integer"},
                "task": {"type": "string"},
            },
            "required": ["task"],
            "type": "object",
        },
        "module_name": "summit-agent-docs",
        "output_schema": {
            "additionalProperties": False,
            "properties": {
                "evidence_ids": {
                    "items": {"pattern": EVIDENCE_ID_PATTERN, "type": "string"},
                    "type": "array",
                },
                "status": {"enum": ["ok", "blocked"], "type": "string"},
            },
            "required": ["status", "evidence_ids"],
            "type": "object",
        },
        "policy_constraints": [
            "deny-by-default-tooling",
            "explicit-side-effects",
            "evidence-id-required",
        ],
        "side_effects": [
            {
                "effect_type": "write",
                "name": "write_agent_specs",
                "scope": "spec/agents/*",
            }
        ],
        "version": "0.1.0",
    }


def _build_report(agent_files: list[str]) -> dict[str, object]:
    evidence_ids = [
        "EVD-AGDOC-SCHEMA-001",
        "EVD-AGDOC-GENERATOR-001",
        "EVD-AGDOC-POLICY-001",
    ]
    return {
        "artifacts": [
            {"path": f"spec/agents/{name}", "type": "agent_spec"}
            for name in agent_files
        ],
        "evidence_ids": evidence_ids,
        "feature_flag_default": "AGENT_DOCS_ENABLED=false",
        "item": "google-agent-docs",
        "summary": (
            "Deterministic and policy-aware agent docs are generated for Summit modules."
        ),
    }


def _build_metrics(agent_doc: dict[str, object]) -> dict[str, object]:
    policy_constraints = agent_doc.get("policy_constraints", [])
    return {
        "item": "google-agent-docs",
        "metrics": {
            "agent_spec_count": 1,
            "deterministic_file_count": 3,
            "policy_constraint_coverage_pct": 100 if policy_constraints else 0,
        },
    }


def _build_stamp() -> dict[str, object]:
    return {
        "generated_utc": os.environ.get("AGENT_DOCS_TIMESTAMP", DEFAULT_STAMP_TIMESTAMP),
        "generator": "scripts/generate_agent_docs.py",
        "git_commit": os.environ.get("GIT_COMMIT", "UNKNOWN"),
        "item": "google-agent-docs",
    }


def _expected_documents() -> dict[str, dict[str, object]]:
    agent_filename = "summit.agent.json"
    agent_doc = _build_agent_doc()
    docs = {
        agent_filename: agent_doc,
        "metrics.json": _build_metrics(agent_doc),
        "report.json": _build_report([agent_filename]),
        "stamp.json": _build_stamp(),
    }
    return docs


def _check_documents(output_dir: Path, docs: dict[str, dict[str, object]]) -> int:
    drifted: list[str] = []
    missing: list[str] = []

    for name in sorted(docs):
        target = output_dir / name
        expected = _stable_json(docs[name])
        if not target.exists():
            missing.append(str(target))
            continue
        actual = target.read_text(encoding="utf-8")
        if actual != expected:
            drifted.append(str(target))

    if missing:
        print("FAIL missing agent-doc artifacts:")
        for path in missing:
            print(f"  - {path}")
    if drifted:
        print("FAIL drift detected in agent-doc artifacts:")
        for path in drifted:
            print(f"  - {path}")

    if missing or drifted:
        return 1

    print("OK agent-doc artifacts are up-to-date")
    return 0


def _write_documents(output_dir: Path, docs: dict[str, dict[str, object]]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    for name in sorted(docs):
        target = output_dir / name
        target.write_text(_stable_json(docs[name]), encoding="utf-8")
    print(f"Wrote {len(docs)} files to {output_dir}")


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]

    parser = argparse.ArgumentParser(
        description="Generate deterministic Summit agent documentation artifacts."
    )
    parser.add_argument(
        "--output-dir",
        default=str(repo_root / "spec" / "agents"),
        help="Directory where generated artifacts are written.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check for drift instead of writing files.",
    )
    args = parser.parse_args()

    if not _is_enabled():
        print("AGENT_DOCS_ENABLED is false; skipping agent-doc generation.")
        return 0

    output_dir = Path(args.output_dir)
    docs = _expected_documents()

    if args.check:
        return _check_documents(output_dir, docs)

    _write_documents(output_dir, docs)
    return 0


if __name__ == "__main__":
    sys.exit(main())
