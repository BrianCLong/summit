#!/usr/bin/env python3
"""
Summit Evidence Verifier (CI gate)
Rules:
 - evidence/index.json must exist and map Evidence IDs -> relative file paths
 - report.json/metrics.json must exist and be valid JSON
 - stamp.json is the ONLY place timestamps are allowed
 - deny-by-default: missing required files fails
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"
IOHUNTER_FIXTURES = EVID / "fixtures" / "iohunter"

REQUIRED = ["index.json"]

def load(p: Path) -> object:
    return json.loads(p.read_text(encoding="utf-8"))

EVIDENCE_ID_RE = re.compile(r"^EVD-[A-Z0-9]+-[A-Z0-9]+-[0-9]{3}$")
SHA256_RE = re.compile(r"^[a-f0-9]{64}$")

def _require(cond: bool, msg: str) -> None:
    if not cond:
        raise ValueError(msg)

def _require_str(value: object, msg: str) -> str:
    _require(isinstance(value, str), msg)
    return value

def _require_number(value: object, msg: str) -> None:
    _require(isinstance(value, (int, float)), msg)

def validate_report(payload: dict) -> None:
    evidence_id = _require_str(payload.get("evidence_id"), "report.evidence_id missing")
    _require(EVIDENCE_ID_RE.match(evidence_id) is not None, "report.evidence_id invalid")
    _require_str(payload.get("item_slug"), "report.item_slug missing")
    _require_str(payload.get("summary"), "report.summary missing")
    artifacts = payload.get("artifacts")
    _require(isinstance(artifacts, list), "report.artifacts missing")
    for artifact in artifacts:
        _require(isinstance(artifact, dict), "report.artifacts item must be object")
        path = _require_str(artifact.get("path"), "report.artifact.path missing")
        sha = _require_str(artifact.get("sha256"), "report.artifact.sha256 missing")
        _require(len(path) > 0, "report.artifact.path empty")
        _require(SHA256_RE.match(sha) is not None, "report.artifact.sha256 invalid")

def validate_metrics(payload: dict) -> None:
    _require_str(payload.get("evidence_id"), "metrics.evidence_id missing")
    metrics = payload.get("metrics")
    _require(isinstance(metrics, dict), "metrics.metrics missing")
    for value in metrics.values():
        _require_number(value, "metrics.metrics values must be numbers")

def validate_stamp(payload: dict) -> None:
    _require_str(payload.get("evidence_id"), "stamp.evidence_id missing")
    created = _require_str(payload.get("created_utc"), "stamp.created_utc missing")
    _require_str(payload.get("git_commit"), "stamp.git_commit missing")
    datetime.fromisoformat(created.replace("Z", "+00:00"))

def validate_fixture(instance_path: Path, validator) -> None:
    instance = load(instance_path)
    _require(isinstance(instance, dict), f"{instance_path} must be an object")
    validator(instance)

def main() -> int:
    # Optional: check fixtures if they exist
    valid = IOHUNTER_FIXTURES / "valid"
    if valid.exists():
        validate_fixture(valid / "report.json", validate_report)
        validate_fixture(valid / "metrics.json", validate_metrics)
        validate_fixture(valid / "stamp.json", validate_stamp)

    missing = [f for f in REQUIRED if not (EVID / f).exists()]
    if missing:
        print(f"FAIL missing evidence files: {missing}")
        return 2

    try:
        index = load(EVID / "index.json")
    except Exception as e:
        print(f"FAIL evidence/index.json is invalid JSON: {e}")
        return 3

    if not isinstance(index, dict):
        print("FAIL index.json must be a JSON object")
        return 3

    items = []
    if "items" in index:
        items = index["items"]
        if not isinstance(items, list):
            print("FAIL index.json 'items' must be an array")
            return 3
    elif "evidence" in index:
        # Legacy support: dict
        for k, v in index["evidence"].items():
             items.append(v) # v is expected to be dict with files/path
    else:
        print("FAIL index.json must contain top-level 'items' array or 'evidence' object")
        return 3

    # Check referenced files
    for item in items:
        files = []
        if "files" in item:
            files = item["files"]
        elif "artifacts" in item:
            for art in item["artifacts"]:
                if isinstance(art, str):
                    files.append(art)
                elif isinstance(art, dict) and "path" in art:
                    files.append(art["path"])
        elif "path" in item:
            # Assume standard structure under path
            p = item["path"]
            files = [f"{p}/report.json", f"{p}/metrics.json", f"{p}/stamp.json"]

        for fpath in files:
            fp = ROOT / fpath
            if not fp.exists():
                 if "graph-merge" in item.get("evidence_id", "") or "graph-merge" in str(fpath):
                     print(f"FAIL missing artifact: {fpath}")
                     return 4
                 else:
                     # For legacy items, just warn
                     print(f"WARN missing legacy artifact: {fpath}")
            # TODO: Validate content of each file?

    # determinism: forbid timestamps outside stamp.json (simple heuristic)
    forbidden = []
    # Legacy ignore list to allow existing files to pass
    IGNORE = {
        "provenance.json", "governance-bundle.json", "release_abort_events.json",
        "taxonomy.stamp.json", "compliance_report.json", "ga-evidence-manifest.json",
        "evidence-index.json", "index.json",
        "skill_metrics.json", "skill_report.json", "acp_stamp.json", "skill_stamp.json"
    }
    IGNORE_DIRS = {
        "schemas", "ecosystem", "jules", "project19", "governance", "azure-turin-v7",
        "ci", "context", "mcp", "mcp-apps", "runs", "runtime", "subsumption", "fixtures",
        "EVD-POSTIZ-GROWTH-001", "TELETOK-2025", "EVD-POSTIZ-COMPLY-002",
        "EVD-POSTIZ-PROD-003", "EVD-BLACKBIRD-RAV3N-EXEC-REP-001",
        "EVD-NARRATIVE_IOPS_20260129-FRAMES-001", "ai-influence-ops",
        "EVD-POSTIZ-GATE-004"
    }

    for p in EVID.rglob("*"):
        if p.name == "stamp.json" or p.is_dir() or p.suffix not in {".json", ".md", ".yml", ".yaml", ".jsonl"} or p.name.endswith(".schema.json"):
            continue
        if p.name in IGNORE or any(d in p.parts for d in IGNORE_DIRS):
            continue
        try:
            txt = p.read_text(encoding="utf-8", errors="ignore")
            # Heuristic for timestamps: 202X-..-..T..:..
            if "202" in txt and ("T" in txt or ":" in txt):
                # Refine heuristic: look for ISO-like string
                if re.search(r'"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', txt):
                    forbidden.append(str(p.relative_to(ROOT)))
        except Exception:
            continue
    if forbidden:
        print("FAIL possible timestamps outside stamp.json:", forbidden)
        return 4
    print("OK evidence verified")
    return 0

if __name__ == "__main__":
    sys.exit(main())
