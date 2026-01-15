#!/usr/bin/env python3
"""Compare SBOM vulnerability deltas against budgets and risk exceptions.

This script compares the current SBOM vulnerability report with the last green
baseline on ``origin/main`` and enforces per-severity budgets defined in
``.maestro/ci_budget.json``. It also supports a dual-approval risk acceptance
workflow using signed exception files under ``artifacts/exceptions/<sha>.json``
and surfaces impending expiry alerts.
"""

import argparse
import datetime as dt
import json
import os
import subprocess
import sys
from collections.abc import Iterable
from pathlib import Path
from urllib.parse import urlparse

SEVERITY_ORDER = ["critical", "high", "medium", "low", "unknown"]
DEFAULT_BUDGET = {"critical": 0, "high": 5, "medium": 10, "low": 50, "unknown": 0}


class BudgetError(Exception):
    pass


def load_json(path: Path) -> dict:
    """Load JSON from disk with a helpful error on failure."""

    try:
        with path.open("r", encoding="utf-8") as handle:
            return json.load(handle)
    except FileNotFoundError as exc:
        raise FileNotFoundError(f"File not found: {path}") from exc


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--report",
        default=os.environ.get("SBOM_REPORT", "security/sbom/vulnerabilities.json"),
        help="Path to current vulnerability report (JSON).",
    )
    parser.add_argument(
        "--baseline",
        default=None,
        help="Path to baseline report. If missing, will attempt git show origin/main:<path>.",
    )
    parser.add_argument(
        "--budget",
        default=os.environ.get("CI_BUDGET", ".maestro/ci_budget.json"),
        help="Budget configuration path.",
    )
    parser.add_argument(
        "--exceptions-dir",
        default=os.environ.get("EXCEPTIONS_DIR", "artifacts/exceptions"),
        help="Directory containing signed exception JSON files.",
    )
    parser.add_argument(
        "--sha",
        default=os.environ.get("GITHUB_SHA"),
        help="Commit SHA used for locating exception file (defaults to HEAD).",
    )
    parser.add_argument(
        "--alert-window-days",
        type=int,
        default=int(os.environ.get("EXCEPTION_ALERT_WINDOW", "7")),
        help="Days before expiry to emit alerts.",
    )
    parser.add_argument(
        "--output-json",
        default=os.environ.get("DIFF_BUDGET_OUTPUT"),
        help="Optional JSON summary output path.",
    )
    return parser.parse_args()


def _read_git_file(path: str) -> dict:
    try:
        output = subprocess.check_output(
            ["git", "show", f"origin/main:{path}"], stderr=subprocess.DEVNULL
        )
    except subprocess.CalledProcessError:
        raise FileNotFoundError(f"Unable to read baseline from origin/main:{path}")
    return json.loads(output.decode("utf-8"))


def load_report(path: Path, fallback_git: bool = True, prefer_git: bool = False) -> list[dict]:
    data = None
    if prefer_git:
        try:
            data = _read_git_file(str(path))
        except FileNotFoundError:
            data = None
    if data is None and path.exists():
        data = load_json(path)
    if data is None and fallback_git:
        data = _read_git_file(str(path))
    if data is None:
        raise FileNotFoundError(f"Report not found: {path}")
    return extract_vulnerabilities(data)


def extract_vulnerabilities(data: object) -> list[dict]:
    """Normalize vulnerabilities from various scanners."""
    vulns: list[dict] = []

    def _append(vuln_obj: dict):
        vid = vuln_obj.get("id") or vuln_obj.get("VulnerabilityID")
        sev = vuln_obj.get("severity") or vuln_obj.get("Severity")
        if not vid and "vulnerability" in vuln_obj:
            nested = vuln_obj.get("vulnerability") or {}
            vid = nested.get("id")
            sev = sev or nested.get("severity")
        vulns.append({"id": vid or "UNKNOWN", "severity": (sev or "UNKNOWN").lower()})

    if isinstance(data, list):
        for entry in data:
            if isinstance(entry, dict):
                _append(entry)
    elif isinstance(data, dict):
        if "matches" in data:  # grype-like
            for match in data.get("matches", []):
                vuln_data = match.get("vulnerability", {})
                _append({"id": vuln_data.get("id"), "severity": vuln_data.get("severity")})
        elif "vulnerabilities" in data:
            for vuln in data.get("vulnerabilities", []):
                _append(vuln)
        else:
            # Treat dictionary values as vulnerability entries if they look like dicts
            for value in data.values():
                if isinstance(value, dict) and ("id" in value or "severity" in value):
                    _append(value)
    return vulns


def count_by_severity(vulns: Iterable[dict]) -> dict[str, int]:
    counts = dict.fromkeys(SEVERITY_ORDER, 0)
    for vuln in vulns:
        sev = str(vuln.get("severity", "unknown")).lower()
        sev = sev if sev in counts else "unknown"
        counts[sev] += 1
    return counts


def load_budgets(path: Path) -> dict[str, int]:
    data = load_json(path)
    budgets = data.get("security", {}).get("sbomSeverityBudget", {})
    merged = {**DEFAULT_BUDGET, **{k.lower(): v for k, v in budgets.items()}}
    return merged


def load_exceptions(
    exceptions_dir: Path, sha: str, alert_window_days: int
) -> tuple[set[str], list[str]]:
    alerts: list[str] = []
    if not sha:
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"]).decode().strip()
    path = exceptions_dir / f"{sha}.json"
    if not path.exists():
        return set(), []
    data = load_json(path)
    if not data.get("signed", False):
        alerts.append(f"Exception file {path} is not signed; ignoring.")
        return set(), alerts

    accepted: set[str] = set()
    now = dt.datetime.now(dt.UTC)
    window = dt.timedelta(days=alert_window_days)
    for entry in data.get("exceptions", []):
        vuln_id = entry.get("vulnId") or entry.get("id")
        justification = entry.get("justification")
        ticket = entry.get("ticket")
        approvals = entry.get("approvals", {})
        expiry_raw = entry.get("expiry") or entry.get("expiresAt")
        missing_fields = [
            name
            for name, value in {
                "vulnId": vuln_id,
                "justification": justification,
                "ticket": ticket,
                "security_approval": approvals.get("security"),
                "platform_approval": approvals.get("platform"),
                "expiry": expiry_raw,
            }.items()
            if not value
        ]
        if missing_fields:
            alerts.append(
                f"Incomplete exception for {vuln_id or 'unknown'} (missing {', '.join(missing_fields)}); skipping."
            )
            continue

        parsed_ticket = urlparse(str(ticket))
        if parsed_ticket.scheme not in {"http", "https"} or not parsed_ticket.netloc:
            alerts.append(f"Invalid ticket URL for {vuln_id}: {ticket!r}; expected http(s) URL.")
            continue

        try:
            expiry = dt.datetime.fromisoformat(str(expiry_raw).replace("Z", "+00:00"))
            if expiry.tzinfo is None:
                expiry = expiry.replace(tzinfo=dt.UTC)
        except Exception:
            alerts.append(f"Invalid expiry '{expiry_raw}' for {vuln_id}; skipping.")
            continue

        if expiry <= now:
            alerts.append(f"Exception for {vuln_id} expired on {expiry_raw}; not applying.")
            continue
        if expiry - now <= window:
            alerts.append(
                f"Exception for {vuln_id} expires on {expiry_raw}; renew before it blocks."
            )
        accepted.add(str(vuln_id))
    return accepted, alerts


def filter_exceptions(vulns: list[dict], accepted_ids: set[str]) -> list[dict]:
    if not accepted_ids:
        return vulns
    return [v for v in vulns if str(v.get("id")) not in accepted_ids]


def delta_counts(current: dict[str, int], baseline: dict[str, int]) -> dict[str, int]:
    return {sev: current.get(sev, 0) - baseline.get(sev, 0) for sev in SEVERITY_ORDER}


def evaluate(deltas: dict[str, int], budget: dict[str, int]) -> tuple[bool, list[str]]:
    errors: list[str] = []
    if deltas.get("critical", 0) > 0:
        errors.append(f"Blocking: {deltas['critical']} new critical vulnerabilities detected.")
    for sev, delta in deltas.items():
        allowed = budget.get(sev, DEFAULT_BUDGET.get(sev, 0))
        if delta > allowed:
            errors.append(f"Budget exceeded for {sev}: delta {delta} > allowed {allowed}.")
    return not errors, errors


def format_summary(
    baseline: dict[str, int], current: dict[str, int], deltas: dict[str, int], alerts: list[str]
) -> str:
    lines = ["Severity summary (baseline -> current, delta):"]
    for sev in SEVERITY_ORDER:
        lines.append(
            f"- {sev.title()}: {baseline.get(sev, 0)} -> {current.get(sev, 0)} (Δ {deltas.get(sev, 0)})"
        )
    if alerts:
        lines.append("Alerts:")
        lines.extend([f"* {msg}" for msg in alerts])
    return "\n".join(lines)


def write_json_summary(
    path: Path,
    baseline: dict[str, int],
    current: dict[str, int],
    deltas: dict[str, int],
    ok: bool,
    alerts: list[str],
    errors: list[str],
) -> None:
    payload = {
        "ok": ok,
        "baseline": baseline,
        "current": current,
        "deltas": deltas,
        "alerts": alerts,
        "errors": errors,
        "budgetPath": str(Path(os.environ.get("CI_BUDGET", ".maestro/ci_budget.json"))),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        json.dump(payload, handle, indent=2)


def main():
    args = parse_args()
    report_path = Path(args.report)
    baseline_path = Path(args.baseline or args.report)

    try:
        current_vulns = load_report(report_path)
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    try:
        baseline_vulns = load_report(
            baseline_path,
            fallback_git=True,
            prefer_git=args.baseline is None,
        )
    except FileNotFoundError:
        print(
            f"WARN: baseline report {baseline_path} not found locally or in origin/main; using empty baseline.",
            file=sys.stderr,
        )
        baseline_vulns = []

    accepted_ids, alerts = load_exceptions(
        Path(args.exceptions_dir), args.sha, args.alert_window_days
    )
    filtered_current = filter_exceptions(current_vulns, accepted_ids)

    baseline_counts = count_by_severity(baseline_vulns)
    current_counts = count_by_severity(filtered_current)
    deltas = delta_counts(current_counts, baseline_counts)

    try:
        budgets = load_budgets(Path(args.budget))
    except FileNotFoundError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)

    ok, errors = evaluate(deltas, budgets)

    print(format_summary(baseline_counts, current_counts, deltas, alerts))

    if args.output_json:
        write_json_summary(
            Path(args.output_json),
            baseline_counts,
            current_counts,
            deltas,
            ok,
            alerts,
            errors,
        )

    if errors:
        for err in errors:
            print(err, file=sys.stderr)
        sys.exit(1)
    sys.exit(0)


if __name__ == "__main__":
    main()
