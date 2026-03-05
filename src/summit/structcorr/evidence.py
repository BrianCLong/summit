from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any, Iterable

SUITE_VERSION = "1.0.0"


def hash_payload(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _stable_json(data: Any) -> str:
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def write_artifacts(report: dict[str, Any], out_dir: Path, git_sha: str) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    findings = sorted(report.get("findings", []), key=lambda item: item["evidence_id"])
    metrics = report.get("metrics", {})

    report_doc = {"findings": findings}
    metrics_doc = dict(sorted(metrics.items(), key=lambda item: item[0]))
    stamp_doc = {"git_sha": git_sha, "suite_version": SUITE_VERSION}

    (out_dir / "report.json").write_text(_stable_json(report_doc) + "\n", encoding="utf-8")
    (out_dir / "metrics.json").write_text(_stable_json(metrics_doc) + "\n", encoding="utf-8")
    (out_dir / "stamp.json").write_text(_stable_json(stamp_doc) + "\n", encoding="utf-8")


def metric_rate(findings: Iterable[dict[str, Any]], kind: str) -> float:
    scoped = [finding for finding in findings if finding["kind"] == kind]
    if not scoped:
        return 1.0
    failures = sum(1 for finding in scoped if finding["severity"] == "fail")
    return round((len(scoped) - failures) / len(scoped), 6)
