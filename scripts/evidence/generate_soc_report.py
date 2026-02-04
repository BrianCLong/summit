#!/usr/bin/env python3
"""Generate SOC Evidence report (Markdown + PDF) from evidence bundle."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
from datetime import UTC, datetime, timedelta
from pathlib import Path


def read_json(path: Path) -> dict:
    with path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def normalize_status(value: str | None) -> str:
    if not value:
        return "unknown"
    val = value.strip().lower()
    if val in {"covered", "pass", "passed", "ok", "success"}:
        return "covered"
    if val in {"partial", "partially", "partial_covered", "partially_covered"}:
        return "partial"
    if val in {"deferred", "skipped", "not_covered"}:
        return "deferred"
    return val


def extract_controls(index_data: dict) -> list[dict]:
    candidates = []
    if isinstance(index_data.get("controls"), list):
        candidates = index_data["controls"]
    elif isinstance(index_data.get("entries"), list):
        candidates = index_data["entries"]
    elif isinstance(index_data.get("index"), list):
        candidates = index_data["index"]

    controls = []
    for item in candidates:
        if not isinstance(item, dict):
            continue
        control_id = item.get("id") or item.get("control_id") or item.get("control")
        if not control_id:
            continue
        status = normalize_status(str(item.get("status") or item.get("coverage") or item.get("result") or "unknown"))
        evidence = item.get("evidence") or item.get("artifacts") or []
        if isinstance(evidence, dict):
            evidence = [evidence]
        evidence_list = []
        for entry in evidence:
            if isinstance(entry, str):
                evidence_list.append({"path": entry})
            elif isinstance(entry, dict):
                evidence_list.append(entry)
        controls.append({
            "id": str(control_id),
            "status": status,
            "evidence": evidence_list,
        })
    return controls


def extract_exceptions(validation_data: dict) -> list[dict]:
    exceptions = validation_data.get("exceptions") or validation_data.get("waivers") or []
    if not isinstance(exceptions, list):
        return []
    normalized = []
    for item in exceptions:
        if not isinstance(item, dict):
            continue
        exception_id = item.get("id") or item.get("exception_id") or item.get("ticket") or "unknown"
        expires = item.get("expires") or item.get("expiry") or item.get("expiration")
        normalized.append({
            "id": str(exception_id),
            "expires": expires,
        })
    return normalized


def parse_date(date_str: str | None) -> datetime | None:
    if not date_str:
        return None
    try:
        if "T" in date_str:
            return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return datetime.fromisoformat(date_str + "T00:00:00+00:00")
    except ValueError:
        return None


def count_expiring(exceptions: list[dict], within_days: int) -> int:
    now = datetime.now(UTC)
    horizon = now + timedelta(days=within_days)
    count = 0
    for item in exceptions:
        expiry = parse_date(item.get("expires"))
        if expiry and expiry <= horizon:
            count += 1
    return count


def resolve_baseline(repo_root: Path, env: dict) -> tuple[str | None, str]:
    def git(cmd: list[str]) -> str:
        return subprocess.check_output(cmd, cwd=repo_root, text=True).strip()

    if not (repo_root / ".git").exists():
        return None, "none"

    try:
        tag = git(["git", "describe", "--tags", "--abbrev=0", "--match", "v*"])
        if tag:
            sha = git(["git", "rev-list", "-n", "1", tag])
            return sha, "tag"
    except subprocess.CalledProcessError:
        pass

    base_sha = env.get("GITHUB_BASE_SHA")
    if base_sha:
        return base_sha, "pr_base"

    try:
        sha = git(["git", "rev-parse", "HEAD~1"])
        return sha, "prior_main_commit"
    except subprocess.CalledProcessError:
        return None, "none"


def get_mapping_changes(repo_root: Path, baseline_sha: str | None) -> list[str]:
    if not baseline_sha or not (repo_root / ".git").exists():
        return []
    try:
        output = subprocess.check_output(
            [
                "git",
                "diff",
                "--name-only",
                f"{baseline_sha}..HEAD",
                "--",
                "compliance/control-map.yaml",
                "compliance/control-exceptions.yml",
            ],
            cwd=repo_root,
            text=True,
        ).strip()
    except subprocess.CalledProcessError:
        return []
    if not output:
        return []
    return sorted({line.strip() for line in output.splitlines() if line.strip()})


def select_primary_evidence(entry: dict) -> tuple[str, str]:
    evidence = entry.get("evidence") or []
    if not evidence:
        return "", ""
    first = evidence[0]
    if isinstance(first, dict):
        path = first.get("path") or first.get("artifact") or ""
        evidence_type = first.get("type") or Path(path).suffix.lstrip(".")
        return evidence_type, path
    if isinstance(first, str):
        return Path(first).suffix.lstrip("."), first
    return "", ""


def generate_markdown(report: dict) -> str:
    lines = []
    meta = report["meta"]
    summary = report["summary"]

    lines.append("# SOC Evidence Report")
    lines.append("")
    lines.append(f"**Repository:** {meta['repo']}")
    lines.append(f"**Branch:** {meta['branch']}")
    lines.append(f"**Commit:** {meta['sha']}")
    lines.append(f"**Generated (UTC):** {meta['generated_at']}")
    lines.append(f"**CI Run:** {meta['ci_run_url'] or 'N/A'}")
    lines.append(f"**Evidence Bundle:** {meta['bundle_id']}")
    lines.append("")

    lines.append("## Executive Summary")
    lines.append(f"- Required controls: {summary['total_controls']}")
    lines.append(f"- Covered: {summary['covered']} | Partial: {summary['partial']} | Deferred: {summary['deferred']}")
    lines.append(f"- Exceptions: {summary['exceptions_total']} (expiring <30d: {summary['exceptions_expiring_soon']})")
    lines.append(f"- Evidence integrity: {summary['integrity_status']}")
    if summary.get("security_highlights"):
        lines.append(f"- Security highlights: {summary['security_highlights']}")
    lines.append("")

    lines.append("## Coverage Summary")
    lines.append("| Control | Status | Primary Evidence | Evidence Ref | Notes |")
    lines.append("| --- | --- | --- | --- | --- |")
    for row in report["coverage_table"]:
        lines.append(f"| {row['control']} | {row['status']} | {row['primary_type']} | {row['primary_ref']} | {row['notes']} |")
    if report.get("coverage_truncated"):
        lines.append("")
        lines.append("_Coverage table truncated. See control_evidence_index.json for full listing._")
    lines.append("")

    lines.append("## Delta vs Baseline")
    delta = report["delta"]
    if delta["status"] == "unavailable":
        lines.append(f"Baseline unavailable: {delta['reason']}")
        if delta.get("mapping_changes"):
            lines.append("Control mapping changes detected:")
            for item in delta["mapping_changes"]:
                lines.append(f"- {item}")
    else:
        lines.append(f"Baseline SHA: {delta['baseline_sha']} ({delta['method']})")
        lines.append("")
        lines.append("**Newly Covered Controls**")
        if delta["newly_covered"]:
            for control in delta["newly_covered"]:
                lines.append(f"- {control}")
        else:
            lines.append("- none")
        lines.append("")
        lines.append("**Newly Deferred Controls**")
        if delta["newly_deferred"]:
            for control in delta["newly_deferred"]:
                lines.append(f"- {control}")
        else:
            lines.append("- none")
        lines.append("")
        lines.append("**Exception Changes**")
        if delta["exceptions_changed"]:
            for entry in delta["exceptions_changed"]:
                lines.append(f"- {entry}")
        else:
            lines.append("- none")
        lines.append("")
        lines.append("**Material Evidence Changes**")
        if delta["evidence_changes"]:
            for entry in delta["evidence_changes"]:
                lines.append(f"- {entry}")
        else:
            lines.append("- none")
    lines.append("")

    lines.append("## Evidence Artifacts Index")
    for artifact in report["artifacts"]:
        lines.append(f"- `{artifact}`")
    lines.append("")

    lines.append("## Pointers")
    lines.append("- Full control mapping: `control_evidence_index.json`")
    lines.append("- Evidence bundle root: see bundle path above")
    lines.append("- Verify integrity: `sha256sum -c checksums.sha256`")
    lines.append("")

    return "\n".join(lines)


def escape_pdf(text: str) -> str:
    return text.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def write_pdf(path: Path, lines: list[str]) -> None:
    max_lines = 40
    lines = lines[:max_lines]
    content_lines = ["BT", "/F1 10 Tf", "50 760 Td", "12 TL"]
    for line in lines:
        content_lines.append(f"({escape_pdf(line)}) Tj")
        content_lines.append("T*")
    content_lines.append("ET")
    content_stream = "\n".join(content_lines).encode("utf-8")

    objects = []
    objects.append(b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n")
    objects.append(b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n")
    objects.append(b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj\n")
    objects.append(b"4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n")
    objects.append(b"5 0 obj << /Length %d >> stream\n" % len(content_stream))
    objects.append(content_stream + b"\nendstream\nendobj\n")

    xref_positions = []
    pdf = bytearray()
    pdf.extend(b"%PDF-1.4\n")
    for obj in objects:
        xref_positions.append(len(pdf))
        pdf.extend(obj)

    xref_offset = len(pdf)
    pdf.extend(b"xref\n0 %d\n" % (len(objects) + 1))
    pdf.extend(b"0000000000 65535 f \n")
    for pos in xref_positions:
        pdf.extend(f"{pos:010d} 00000 n \n".encode("ascii"))
    pdf.extend(b"trailer << /Size %d /Root 1 0 R >>\n" % (len(objects) + 1))
    pdf.extend(b"startxref\n")
    pdf.extend(f"{xref_offset}\n".encode("ascii"))
    pdf.extend(b"%%EOF\n")

    path.write_bytes(pdf)


def build_report(
    evidence_dir: Path,
    baseline_dir: Path | None,
    baseline_sha: str | None,
    baseline_method: str,
    env: dict,
    repo_root: Path,
) -> dict:
    control_index = read_json(evidence_dir / "control_evidence_index.json")
    validation = read_json(evidence_dir / "validation_report.json")
    meta = read_json(evidence_dir / "meta.json")

    controls = extract_controls(control_index)
    controls_sorted = sorted(controls, key=lambda x: x["id"])

    covered = sum(1 for c in controls_sorted if c["status"] == "covered")
    partial = sum(1 for c in controls_sorted if c["status"] == "partial")
    deferred = sum(1 for c in controls_sorted if c["status"] == "deferred")

    exceptions = extract_exceptions(validation)
    expiring_soon = count_expiring(exceptions, 30)

    integrity_ok = (evidence_dir / "checksums.sha256").exists()
    validation_status = validation.get("status") or validation.get("result") or "unknown"

    coverage_table = []
    for entry in controls_sorted[:50]:
        primary_type, primary_ref = select_primary_evidence(entry)
        coverage_table.append({
            "control": entry["id"],
            "status": entry["status"],
            "primary_type": primary_type or "n/a",
            "primary_ref": primary_ref or "n/a",
            "notes": ""
        })

    coverage_truncated = len(controls_sorted) > 50

    delta = {
        "status": "unavailable",
        "reason": "No baseline available",
        "baseline_sha": None,
        "method": baseline_method,
        "newly_covered": [],
        "newly_deferred": [],
        "exceptions_changed": [],
        "evidence_changes": [],
        "mapping_changes": []
    }

    if baseline_dir and (baseline_dir / "control_evidence_index.json").exists():
        baseline_index = read_json(baseline_dir / "control_evidence_index.json")
        baseline_controls = {c["id"]: c for c in extract_controls(baseline_index)}
        current_controls = {c["id"]: c for c in controls_sorted}

        newly_covered = []
        newly_deferred = []
        for control_id, current in current_controls.items():
            baseline = baseline_controls.get(control_id)
            baseline_status = baseline["status"] if baseline else "unknown"
            if baseline_status != "covered" and current["status"] == "covered":
                newly_covered.append(control_id)
            if baseline_status == "covered" and current["status"] == "deferred":
                newly_deferred.append(control_id)

        baseline_validation = None
        if (baseline_dir / "validation_report.json").exists():
            baseline_validation = read_json(baseline_dir / "validation_report.json")
        baseline_exceptions = extract_exceptions(baseline_validation or {})
        baseline_exception_ids = {item["id"] for item in baseline_exceptions}
        current_exception_ids = {item["id"] for item in exceptions}

        exceptions_changed = []
        for item in sorted(current_exception_ids - baseline_exception_ids):
            exceptions_changed.append(f"Added exception {item}")
        for item in sorted(baseline_exception_ids - current_exception_ids):
            exceptions_changed.append(f"Removed exception {item}")

        evidence_changes = []
        keys = ["checksums.sha256", "validation_report.json"]
        for key in keys:
            current_exists = (evidence_dir / key).exists()
            baseline_exists = (baseline_dir / key).exists()
            if current_exists != baseline_exists:
                evidence_changes.append(f"{key} presence changed (baseline {baseline_exists} -> current {current_exists})")

        delta = {
            "status": "ok",
            "baseline_sha": baseline_sha,
            "method": baseline_method,
            "newly_covered": newly_covered[:20],
            "newly_deferred": newly_deferred[:20],
            "exceptions_changed": exceptions_changed[:20],
            "evidence_changes": evidence_changes[:20],
            "mapping_changes": []
        }
    elif baseline_sha:
        mapping_changes = get_mapping_changes(repo_root, baseline_sha)
        delta = {
            "status": "unavailable",
            "reason": "Baseline evidence bundle not found",
            "baseline_sha": baseline_sha,
            "method": baseline_method,
            "newly_covered": [],
            "newly_deferred": [],
            "exceptions_changed": [],
            "evidence_changes": [],
            "mapping_changes": mapping_changes[:20]
        }

    artifacts = [
        "control_evidence_index.json",
        "validation_report.json",
        "checksums.sha256",
        "meta.json"
    ]
    if isinstance(meta.get("sbom_paths"), list):
        artifacts.extend(meta.get("sbom_paths"))
    artifacts = sorted(dict.fromkeys(artifacts))

    repo = env.get("GITHUB_REPOSITORY", "unknown")
    run_id = env.get("GITHUB_RUN_ID")
    run_url = env.get("GITHUB_RUN_URL")
    if not run_url and run_id and repo and env.get("GITHUB_SERVER_URL"):
        run_url = f"{env.get('GITHUB_SERVER_URL')}/{repo}/actions/runs/{run_id}"

    report = {
        "meta": {
            "repo": repo,
            "branch": env.get("GITHUB_REF_NAME", "unknown"),
            "sha": meta.get("sha") or env.get("GITHUB_SHA") or "unknown",
            "generated_at": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "ci_run_url": run_url,
            "bundle_id": evidence_dir.name,
        },
        "summary": {
            "total_controls": len(controls_sorted),
            "covered": covered,
            "partial": partial,
            "deferred": deferred,
            "exceptions_total": len(exceptions),
            "exceptions_expiring_soon": expiring_soon,
            "integrity_status": "present" if integrity_ok else "missing",
            "security_highlights": validation.get("security_highlights")
        },
        "coverage_table": coverage_table,
        "coverage_truncated": coverage_truncated,
        "delta": delta,
        "artifacts": artifacts,
        "validation_status": validation_status,
    }

    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--evidence-dir", required=True)
    parser.add_argument("--baseline-dir")
    parser.add_argument("--baseline-sha")
    parser.add_argument("--baseline-method")
    parser.add_argument("--repo-root", default=str(Path.cwd()))
    args = parser.parse_args()

    repo_root = Path(args.repo_root)
    evidence_dir = Path(args.evidence_dir)

    if not evidence_dir.exists():
        raise SystemExit(f"Evidence directory not found: {evidence_dir}")

    baseline_sha = args.baseline_sha
    baseline_method = args.baseline_method or "none"

    if not baseline_sha:
        baseline_sha, baseline_method = resolve_baseline(repo_root, os.environ)

    baseline_dir = None
    if args.baseline_dir:
        baseline_dir = Path(args.baseline_dir)
    elif baseline_sha:
        candidate = evidence_dir.parent / baseline_sha
        if candidate.exists():
            baseline_dir = candidate

    report = build_report(
        evidence_dir,
        baseline_dir,
        baseline_sha,
        baseline_method,
        os.environ,
        repo_root,
    )
    markdown = generate_markdown(report)

    md_path = evidence_dir / "SOC_EVIDENCE_REPORT.md"
    pdf_path = evidence_dir / "SOC_EVIDENCE_REPORT.pdf"
    json_path = evidence_dir / "SOC_EVIDENCE_REPORT.json"

    write_text(md_path, markdown)
    write_text(json_path, json.dumps(report, indent=2))

    pdf_lines = [
        f"SOC Evidence Report - {report['meta']['repo']}",
        f"Commit: {report['meta']['sha']}",
        f"Generated: {report['meta']['generated_at']}",
        f"Status: {report['validation_status']}",
        f"Coverage: {report['summary']['covered']}/{report['summary']['total_controls']}",
        f"Exceptions: {report['summary']['exceptions_total']} (expiring <30d: {report['summary']['exceptions_expiring_soon']})",
        "",
        "Top deltas:",
    ]

    delta = report["delta"]
    if delta["status"] == "ok":
        for control in delta["newly_covered"][:10]:
            pdf_lines.append(f"+ Covered: {control}")
        for control in delta["newly_deferred"][:10]:
            pdf_lines.append(f"- Deferred: {control}")
    else:
        pdf_lines.append(f"Baseline: {delta['reason']}")

    pdf_lines.append("")
    pdf_lines.append("See SOC_EVIDENCE_REPORT.md for full details.")

    write_pdf(pdf_path, pdf_lines)


if __name__ == "__main__":
    main()
