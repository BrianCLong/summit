"""Detect dependency and version drift between two package reports."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def _load(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def main() -> int:
    parser = argparse.ArgumentParser(description="Compare two package-report.json files")
    parser.add_argument("baseline", type=Path)
    parser.add_argument("candidate", type=Path)
    parser.add_argument("--out", type=Path, default=Path("artifacts/drift-report.json"))
    args = parser.parse_args()

    base = _load(args.baseline)
    cand = _load(args.candidate)

    base_deps = base["package"]["dependencies"]
    cand_deps = cand["package"]["dependencies"]

    added = sorted(dep for dep in cand_deps if dep not in base_deps)
    removed = sorted(dep for dep in base_deps if dep not in cand_deps)
    changed = sorted(dep for dep in cand_deps if dep in base_deps and cand_deps[dep] != base_deps[dep])

    drift_report = {
        "baseline_evidence": base.get("evidence_id"),
        "candidate_evidence": cand.get("evidence_id"),
        "version_changed": base["package"]["version"] != cand["package"]["version"],
        "dependencies_added": added,
        "dependencies_removed": removed,
        "dependencies_changed": changed,
    }

    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(json.dumps(drift_report, sort_keys=True, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps(drift_report))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
