#!/usr/bin/env python3
"""
Incident Evidence Pack Generator

Collects operational artifacts (logs, traces, config snapshots, metrics, and deployment metadata)
into a timestamped incident evidence pack that ships both JSON and HTML summaries.
"""

from __future__ import annotations

import argparse
import json
import shutil
import subprocess
from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


@dataclass
class EvidenceEntry:
    category: str
    source: Path
    stored_path: Path
    size_bytes: int
    sha256: str


@dataclass
class EvidencePack:
    incident_id: str
    severity: str
    output_root: Path
    logs: list[Path] = field(default_factory=list)
    traces: list[Path] = field(default_factory=list)
    configs: list[Path] = field(default_factory=list)
    metrics_file: Path | None = None
    metrics_baseline: Path | None = None
    deploy_metadata: Path | None = None
    notes: str | None = None

    def __post_init__(self) -> None:
        timestamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        self.pack_dir = self.output_root / f"incident-{self.incident_id}-{timestamp}"
        self.attachments_dir = self.pack_dir / "attachments"

    def generate(self) -> Path:
        self.pack_dir.mkdir(parents=True, exist_ok=True)
        self.attachments_dir.mkdir(parents=True, exist_ok=True)

        evidence_entries: list[EvidenceEntry] = []
        evidence_entries.extend(self._capture_category("logs", self.logs, {"*.log", "*.out"}))
        evidence_entries.extend(
            self._capture_category("traces", self.traces, {"*.json", "*.trace", "*.otlp"})
        )
        evidence_entries.extend(
            self._capture_category("configs", self.configs, {"*.json", "*.yaml", "*.yml"})
        )

        metrics = self._load_metrics()
        deploy = self._load_deploy_metadata()

        summary = {
            "pack_id": self.pack_dir.name,
            "incident_id": self.incident_id,
            "severity": self.severity,
            "created_at": datetime.now(UTC).isoformat(),
            "notes": self.notes or "",
            "paths": {
                "root": str(self.pack_dir),
                "attachments": str(self.attachments_dir),
            },
            "artifacts": self._to_artifact_map(evidence_entries),
            "metrics": metrics,
            "deployment": deploy,
        }

        summary_path = self.pack_dir / "evidence-pack.json"
        summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True))

        html_path = self.pack_dir / "evidence-pack.html"
        html_path.write_text(self._render_html(summary))

        return self.pack_dir

    def _capture_category(
        self, name: str, sources: Iterable[Path], patterns: set[str]
    ) -> list[EvidenceEntry]:
        entries: list[EvidenceEntry] = []
        destination = self.attachments_dir / name
        destination.mkdir(parents=True, exist_ok=True)

        for source in sources:
            if not source.exists():
                continue

            if source.is_dir():
                for pattern in patterns:
                    for path in source.rglob(pattern):
                        entries.append(self._copy_file(name, path, destination / path.name))
            else:
                entries.append(self._copy_file(name, source, destination / source.name))

        return entries

    def _copy_file(self, category: str, source: Path, target: Path) -> EvidenceEntry:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        return EvidenceEntry(
            category=category,
            source=source,
            stored_path=target.relative_to(self.pack_dir),
            size_bytes=target.stat().st_size,
            sha256=self._hash_file(target),
        )

    def _load_metrics(self) -> dict[str, Any]:
        current = self._read_json(self.metrics_file) if self.metrics_file else None
        baseline = self._read_json(self.metrics_baseline) if self.metrics_baseline else None
        delta = self._compute_metric_delta(current, baseline)

        return {
            "current": current or {},
            "baseline": baseline or {},
            "delta": delta,
        }

    def _compute_metric_delta(
        self, current: dict[str, Any] | None, baseline: dict[str, Any] | None
    ) -> dict[str, float]:
        delta: dict[str, float] = {}
        if not current or not baseline:
            return delta

        for key, value in current.items():
            if isinstance(value, (int, float)) and isinstance(baseline.get(key), (int, float)):
                delta[key] = value - float(baseline[key])
        return delta

    def _load_deploy_metadata(self) -> dict[str, Any]:
        if self.deploy_metadata:
            data = self._read_json(self.deploy_metadata)
            if data is not None:
                return data

        return {
            "git": {
                "commit": self._git(["rev-parse", "HEAD"]),
                "branch": self._git(["rev-parse", "--abbrev-ref", "HEAD"]),
                "tag": self._git(["describe", "--tags", "--abbrev=0"], allow_failure=True),
            }
        }

    def _git(self, args: list[str], allow_failure: bool = False) -> str:
        try:
            result = subprocess.run(
                ["git", *args],
                check=not allow_failure,
                capture_output=True,
                text=True,
                cwd=self.output_root,
            )
            if result.returncode != 0 and allow_failure:
                return ""
            return result.stdout.strip()
        except (FileNotFoundError, subprocess.CalledProcessError):
            return ""

    def _to_artifact_map(self, entries: list[EvidenceEntry]) -> dict[str, list[dict[str, Any]]]:
        categorized: dict[str, list[dict[str, Any]]] = {}
        for entry in entries:
            categorized.setdefault(entry.category, []).append(
                {
                    "source": str(entry.source),
                    "stored_path": str(entry.stored_path),
                    "size_bytes": entry.size_bytes,
                    "sha256": entry.sha256,
                }
            )
        return categorized

    def _render_html(self, summary: dict[str, Any]) -> str:
        artifacts = summary.get("artifacts", {})
        metrics = summary.get("metrics", {})
        deploy = summary.get("deployment", {})

        def render_artifacts() -> str:
            sections = []
            for category, files in artifacts.items():
                if not files:
                    continue
                rows = "".join(
                    f"<tr><td>{file['source']}</td><td>{file['stored_path']}</td><td>{file['size_bytes']}</td><td>{file['sha256']}</td></tr>"
                    for file in files
                )
                sections.append(
                    f"<h3>{category.title()}</h3><table><tr><th>Source</th><th>Stored</th><th>Size (bytes)</th><th>SHA-256</th></tr>{rows}</table>"
                )
            return "".join(sections) or "<p>No artifacts captured.</p>"

        metrics_rows = "".join(
            f"<tr><td>{k}</td><td>{v}</td><td>{metrics.get('baseline', {}).get(k, '')}</td><td>{metrics.get('delta', {}).get(k, '')}</td></tr>"
            for k, v in (metrics.get("current") or {}).items()
            if isinstance(v, (int, float))
        )
        metrics_table = (
            "<h3>Metrics</h3><table><tr><th>Name</th><th>Current</th><th>Baseline</th><th>Delta</th></tr>"
            f"{metrics_rows}</table>"
            if metrics_rows
            else "<p>No metrics provided.</p>"
        )

        deploy_section = (
            f"<pre>{json.dumps(deploy, indent=2)}</pre>" if deploy else "<p>No deploy metadata.</p>"
        )

        return f"""<!doctype html>
<html lang=\"en\">
<head>
  <meta charset=\"utf-8\" />
  <title>Incident Evidence Pack {summary.get("incident_id")}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 1.5rem; }}
    table {{ border-collapse: collapse; width: 100%; margin-bottom: 1rem; }}
    th, td {{ border: 1px solid #ddd; padding: 8px; }}
    th {{ background-color: #f4f4f4; text-align: left; }}
  </style>
</head>
<body>
  <h1>Incident Evidence Pack</h1>
  <p><strong>Incident:</strong> {summary.get("incident_id")} | <strong>Severity:</strong> {summary.get("severity")}</p>
  <p><strong>Generated:</strong> {summary.get("created_at")}</p>
  <p><strong>Notes:</strong> {summary.get("notes")}</p>
  <h2>Artifacts</h2>
  {render_artifacts()}
  {metrics_table}
  <h3>Deployment</h3>
  {deploy_section}
</body>
</html>"""

    def _hash_file(self, path: Path) -> str:
        import hashlib

        sha = hashlib.sha256()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                sha.update(chunk)
        return sha.hexdigest()

    def _read_json(self, path: Path | None) -> dict[str, Any] | None:
        if path is None:
            return None
        if not path.exists():
            return None
        try:
            with path.open() as f:
                return json.load(f)
        except json.JSONDecodeError:
            return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Incident evidence pack generator")
    parser.add_argument("--incident-id", required=True, help="Incident identifier or ticket number")
    parser.add_argument("--severity", default="unknown", help="Incident severity level")
    parser.add_argument(
        "--logs", nargs="*", type=Path, default=[Path("logs")], help="Log file paths or directories"
    )
    parser.add_argument(
        "--traces",
        nargs="*",
        type=Path,
        default=[Path("ops/otel"), Path("traces")],
        help="Trace export paths",
    )
    parser.add_argument(
        "--configs",
        nargs="*",
        type=Path,
        default=[Path("config"), Path("ops/config"), Path("server/config")],
        help="Config snapshot locations",
    )
    parser.add_argument("--metrics", type=Path, help="Path to current metrics JSON snapshot")
    parser.add_argument(
        "--metrics-baseline", type=Path, help="Optional baseline metrics JSON for delta calculation"
    )
    parser.add_argument("--deploy-metadata", type=Path, help="Deploy metadata JSON (optional)")
    parser.add_argument(
        "--output-root",
        type=Path,
        default=Path("artifacts/evidence-packs"),
        help="Where to write packs",
    )
    parser.add_argument("--notes", type=str, help="Free-form notes or trigger description")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    pack = EvidencePack(
        incident_id=args.incident_id,
        severity=args.severity,
        output_root=args.output_root,
        logs=args.logs,
        traces=args.traces,
        configs=args.configs,
        metrics_file=args.metrics,
        metrics_baseline=args.metrics_baseline,
        deploy_metadata=args.deploy_metadata,
        notes=args.notes,
    )
    pack_dir = pack.generate()
    print(f"✅ Evidence pack created at {pack_dir}")


if __name__ == "__main__":
    main()
