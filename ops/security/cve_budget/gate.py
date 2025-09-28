#!/usr/bin/env python3
"""CVE budget and attestation gate for Track B."""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import yaml

SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
SEVERITY_ALIAS = {
    "CRIT": "CRITICAL",
    "CRITICAL": "CRITICAL",
    "HIGH": "HIGH",
    "MED": "MEDIUM",
    "MEDIUM": "MEDIUM",
    "LOW": "LOW",
    "INFO": "LOW",
}


@dataclass
class Waiver:
    service: str
    cve: str
    severity: str
    owner: str
    reason: str
    expires_on: datetime

    @property
    def severity_key(self) -> str:
        return SEVERITY_ALIAS.get(self.severity.upper(), self.severity.upper())

    def to_summary(self, status: str, now: datetime) -> Dict[str, object]:
        delta = (self.expires_on - now).total_seconds()
        return {
            "service": self.service,
            "cve": self.cve,
            "severity": self.severity_key,
            "owner": self.owner,
            "reason": self.reason,
            "expires_on": self.expires_on.date().isoformat(),
            "status": status,
            "hours_until_expiry": round(delta / 3600, 2),
        }


@dataclass
class ArtifactStatus:
    image: str
    digest: str
    signed: bool
    attestations_verified: bool
    sbom_present: bool
    attestation_errors: List[str]


@dataclass
class ServiceReport:
    name: str
    owner: Optional[str]
    budgets: Dict[str, int]
    severity_counts: Dict[str, int]
    effective_counts: Dict[str, int]
    waived: List[Dict[str, object]]
    expired_waivers: List[Dict[str, object]]
    expiring_soon: List[Dict[str, object]]
    violations: List[str]
    attestation_failures: List[str]
    artifacts: List[ArtifactStatus]

    def to_summary(self) -> Dict[str, object]:
        return {
            "name": self.name,
            "owner": self.owner,
            "budgets": self.budgets,
            "severity_counts": dict(self.severity_counts),
            "effective_counts": dict(self.effective_counts),
            "waived": self.waived,
            "expired_waivers": self.expired_waivers,
            "expiring_soon": self.expiring_soon,
            "violations": self.violations,
            "attestation_failures": self.attestation_failures,
            "artifacts": [asdict(a) for a in self.artifacts],
        }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate CVE budgets and attestations")
    parser.add_argument("--config", required=True, help="Path to budgets + waivers YAML")
    parser.add_argument(
        "--sbom",
        dest="sboms",
        action="append",
        required=True,
        help="SPDX SBOM JSON file (repeatable)",
    )
    parser.add_argument("--vulns", required=True, help="Vulnerability scan JSON report")
    parser.add_argument("--output", help="Write JSON summary to this path")
    parser.add_argument("--weekly-report", help="Write Markdown weekly report to this path")
    return parser.parse_args()


def parse_datetime(raw: str) -> datetime:
    if raw.endswith("Z"):
        raw = raw[:-1] + "+00:00"
    dt = datetime.fromisoformat(raw)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def load_config(path: Path) -> Tuple[Dict[str, Dict[str, object]], List[Waiver]]:
    config = yaml.safe_load(path.read_text())
    if not config:
        raise ValueError("Config is empty")

    services_cfg: Dict[str, Dict[str, object]] = {}
    for service, spec in config.get("services", {}).items():
        budgets = spec.get("budgets") or {}
        normalized = {SEVERITY_ALIAS.get(k.upper(), k.upper()): int(v) for k, v in budgets.items()}
        services_cfg[service] = {
            "owner": spec.get("owner"),
            "budgets": normalized,
        }

    waivers: List[Waiver] = []
    for raw in config.get("waivers", []):
        expires_raw = raw["expires_on"]
        if isinstance(expires_raw, str):
            expires_on = datetime.strptime(expires_raw, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        elif isinstance(expires_raw, date):
            expires_on = datetime.combine(expires_raw, datetime.min.time()).replace(tzinfo=timezone.utc)
        else:
            raise TypeError(f"Unsupported expiry type for waiver {raw}")
        waivers.append(
            Waiver(
                service=raw["service"],
                cve=raw["cve"],
                severity=raw["severity"],
                owner=raw["owner"],
                reason=raw.get("reason", ""),
                expires_on=expires_on,
            )
        )
    return services_cfg, waivers


def load_sboms(paths: Iterable[str]) -> Dict[str, Dict[str, object]]:
    sboms: Dict[str, Dict[str, object]] = {}
    for path_str in paths:
        path = Path(path_str)
        data = json.loads(path.read_text())
        service = data.get("name") or data.get("metadata", {}).get("component", {}).get("name")
        if not service:
            raise ValueError(f"Unable to determine service name from SBOM {path}")
        packages = {
            pkg.get("name")
            for pkg in data.get("packages", [])
            if isinstance(pkg, dict) and pkg.get("name")
        }
        sboms[service] = {
            "path": str(path),
            "packages": packages,
            "version": data.get("versionInfo") or data.get("version"),
        }
    return sboms


def index_waivers(waivers: Iterable[Waiver]) -> Dict[Tuple[str, str], List[Waiver]]:
    index: Dict[Tuple[str, str], List[Waiver]] = defaultdict(list)
    for waiver in waivers:
        index[(waiver.service, waiver.cve)].append(waiver)
    return index


def normalise_severity(value: str) -> str:
    return SEVERITY_ALIAS.get(value.upper(), value.upper())


def evaluate(
    services_cfg: Dict[str, Dict[str, object]],
    waivers: List[Waiver],
    sboms: Dict[str, Dict[str, object]],
    vuln_report: Dict[str, object],
) -> Tuple[List[ServiceReport], Dict[str, object], int]:
    now = parse_datetime(vuln_report.get("generated_at", datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()))
    waiver_index = index_waivers(waivers)
    reports: List[ServiceReport] = []

    total_artifacts = 0
    signed_artifacts = 0
    attested_artifacts = 0
    sbom_covered = 0

    global_violations: List[str] = []
    global_attestation_failures: List[str] = []

    services_in_report = {svc.get("name") for svc in vuln_report.get("services", [])}
    missing_services = [s for s in services_cfg.keys() if s not in services_in_report]

    for missing in missing_services:
        global_violations.append(f"Service '{missing}' has a configured budget but no vulnerability report entry")

    exit_code = 0

    for service_entry in vuln_report.get("services", []):
        service_name = service_entry.get("name")
        cfg = services_cfg.get(service_name)
        budgets = (cfg or {}).get("budgets", {})
        owner = (cfg or {}).get("owner")

        severity_counts = Counter()
        effective_counts = Counter()
        waived_records: List[Dict[str, object]] = []
        expired_records: List[Dict[str, object]] = []
        expiring_soon: List[Dict[str, object]] = []
        violations: List[str] = []
        attestation_failures: List[str] = []
        artifacts: List[ArtifactStatus] = []

        sbom = sboms.get(service_name)
        if sbom is None:
            violations.append(f"SBOM missing for service '{service_name}'")
            exit_code = 1
        else:
            sbom_covered += 1

        for artifact in service_entry.get("artifacts", []):
            total_artifacts += 1
            signed = bool(artifact.get("signed"))
            attestations = artifact.get("attestations", []) or []
            attestations_verified = bool(attestations) and all(a.get("verified") for a in attestations)
            sbom_present = bool(artifact.get("sbom"))

            if signed:
                signed_artifacts += 1
            else:
                attestation_failures.append(
                    f"Service '{service_name}' image {artifact.get('image')} missing verified signature"
                )

            if attestations_verified:
                attested_artifacts += 1
            else:
                reason = ", ".join(
                    a.get("reason") or "attestation invalid" for a in attestations if not a.get("verified")
                ) or "attestation missing"
                attestation_failures.append(
                    f"Service '{service_name}' image {artifact.get('image')} attestation check failed: {reason}"
                )

            if not sbom_present:
                attestation_failures.append(
                    f"Service '{service_name}' image {artifact.get('image')} missing SBOM reference"
                )

            artifact_status = ArtifactStatus(
                image=artifact.get("image", "unknown"),
                digest=artifact.get("digest", ""),
                signed=signed,
                attestations_verified=attestations_verified,
                sbom_present=sbom_present,
                attestation_errors=[msg for msg in attestation_failures if artifact.get("image") in msg],
            )
            artifacts.append(artifact_status)

            for vuln in artifact.get("vulnerabilities", []):
                severity = normalise_severity(vuln.get("severity", "LOW"))
                severity_counts[severity] += 1
                waiver_candidates = waiver_index.get((service_name, vuln.get("id")), [])
                waiver_used = False
                for waiver in waiver_candidates:
                    if waiver.severity_key != severity:
                        continue
                    status = "expired" if waiver.expires_on < now else "active"
                    summary = waiver.to_summary(status, now)
                    if status == "expired":
                        expired_records.append(summary)
                    else:
                        waived_records.append(summary)
                        waiver_used = True
                        if waiver.expires_on <= now + timedelta(days=1):
                            expiring_soon.append(summary)
                    break

                if waiver_used:
                    continue
                effective_counts[severity] += 1

                if sbom and vuln.get("package") and vuln.get("package") not in sbom.get("packages", set()):
                    violations.append(
                        f"Service '{service_name}' vulnerability {vuln.get('id')} targets package {vuln.get('package')} missing from SBOM"
                    )

        for severity, limit in budgets.items():
            actual = effective_counts.get(severity, 0)
            if actual > limit:
                msg = (
                    f"Policy violation for service '{service_name}': severity {severity} count {actual} exceeds budget {limit}"
                )
                violations.append(msg)

        if violations or attestation_failures:
            exit_code = 1

        reports.append(
            ServiceReport(
                name=service_name,
                owner=owner,
                budgets=budgets,
                severity_counts={k: severity_counts.get(k, 0) for k in SEVERITY_ORDER},
                effective_counts={k: effective_counts.get(k, 0) for k in SEVERITY_ORDER},
                waived=waived_records,
                expired_waivers=expired_records,
                expiring_soon=expiring_soon,
                violations=violations,
                attestation_failures=attestation_failures,
                artifacts=artifacts,
            )
        )

        global_violations.extend(violations)
        global_attestation_failures.extend(attestation_failures)

    summary = {
        "generated_at": now.isoformat(),
        "scanner": vuln_report.get("scanner"),
        "services": [report.to_summary() for report in reports],
        "totals": {
            "services_reported": len(reports),
            "total_artifacts": total_artifacts,
            "signed_artifacts": signed_artifacts,
            "attested_artifacts": attested_artifacts,
            "sbom_covered": sbom_covered,
        },
        "violations": global_violations,
        "attestation_failures": global_attestation_failures,
        "missing_services": missing_services,
        "waivers": {
            "configured": [w.to_summary("configured", now) for w in waivers],
        },
        "policy_bundle": "policy/opa/cve_budget.rego",
    }

    if global_violations or global_attestation_failures or missing_services:
        exit_code = 1

    return reports, summary, exit_code


def write_json(path: Path, data: Dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, sort_keys=True))


def render_table(headers: List[str], rows: List[List[str]]) -> List[str]:
    lines = ["| " + " | ".join(headers) + " |"]
    lines.append("| " + " | ".join(["---"] * len(headers)) + " |")
    for row in rows:
        lines.append("| " + " | ".join(row) + " |")
    if not rows:
        lines.append("| _No data_ |" + " |" * (len(headers) - 1))
    return lines


def generate_weekly_report(path: Path, summary: Dict[str, object]) -> None:
    now = parse_datetime(summary["generated_at"]).date()
    services = summary.get("services", [])
    totals = summary.get("totals", {})

    lines: List[str] = []
    lines.append(f"# Supply Chain Risk Weekly Report — {now.isoformat()}")
    lines.append("")

    # CVE burn-down table
    headers = [
        "Service",
        "Owner",
        "Critical",
        "High",
        "Medium",
        "Low",
    ]
    rows: List[List[str]] = []
    for svc in services:
        counts = svc.get("effective_counts", {})
        budgets = svc.get("budgets", {})
        rows.append(
            [
                svc.get("name", ""),
                svc.get("owner", "–"),
                f"{counts.get('CRITICAL', 0)}/{budgets.get('CRITICAL', 0)}",
                f"{counts.get('HIGH', 0)}/{budgets.get('HIGH', 0)}",
                f"{counts.get('MEDIUM', 0)}/{budgets.get('MEDIUM', 0)}",
                f"{counts.get('LOW', 0)}/{budgets.get('LOW', 0)}",
            ]
        )
    lines.extend(render_table(headers, rows))
    lines.append("")

    # Open waivers table
    lines.append("## Open Waivers")
    lines.append("")
    waiver_rows: List[List[str]] = []
    for svc in services:
        for waiver in svc.get("waived", []):
            waiver_rows.append(
                [
                    waiver.get("service", svc.get("name", "")),
                    waiver.get("cve", ""),
                    waiver.get("severity", ""),
                    waiver.get("owner", ""),
                    waiver.get("expires_on", ""),
                    "expiring <24h" if waiver in svc.get("expiring_soon", []) else "active",
                ]
            )
    lines.extend(
        render_table(["Service", "CVE", "Severity", "Owner", "Expires", "Status"], waiver_rows)
    )
    lines.append("")

    # Signed artifact coverage
    lines.append("## Signed Artifact Coverage")
    lines.append("")
    total = max(1, totals.get("total_artifacts", 0))
    signed = totals.get("signed_artifacts", 0)
    attested = totals.get("attested_artifacts", 0)
    sbom = totals.get("sbom_covered", 0)
    signed_pct = round((signed / total) * 100, 2)
    attested_pct = round((attested / total) * 100, 2)
    lines.append(f"- Total artifacts evaluated: **{total}**")
    lines.append(f"- Signed artifacts: **{signed}** ({signed_pct}%)")
    lines.append(f"- Attestations verified: **{attested}** ({attested_pct}%)")
    lines.append(f"- SBOM coverage: **{sbom}/{len(services)}** services with attached SBOMs")
    lines.append("")

    # Alerts section
    lines.append("## Alerts & Follow-ups")
    lines.append("")
    violations = summary.get("violations", [])
    attestation_failures = summary.get("attestation_failures", [])
    expiring = [w for svc in services for w in svc.get("expiring_soon", [])]
    if not (violations or attestation_failures or expiring):
        lines.append("- ✅ All gates passing; no follow-up required.")
    else:
        for item in violations:
            lines.append(f"- ❌ {item}")
        for item in attestation_failures:
            lines.append(f"- ❌ {item}")
        for waiver in expiring:
            lines.append(
                f"- ⚠️ Waiver {waiver.get('cve')} for {waiver.get('service')} expires on {waiver.get('expires_on')} (owner {waiver.get('owner')})."
            )
    lines.append("")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines))


def main() -> int:
    args = parse_args()
    config_path = Path(args.config)
    services_cfg, waivers = load_config(config_path)
    sboms = load_sboms(args.sboms)
    vuln_report = json.loads(Path(args.vulns).read_text())

    reports, summary, exit_code = evaluate(services_cfg, waivers, sboms, vuln_report)

    for report in reports:
        print(f"Service {report.name}: effective counts {report.effective_counts}")
        for violation in report.violations:
            print(f"❌ {violation}")
        for attestation_issue in report.attestation_failures:
            print(f"❌ {attestation_issue}")
        if not report.violations and not report.attestation_failures:
            print("✅ Policy OK")

    if args.output:
        write_json(Path(args.output), summary)
    if args.weekly_report:
        generate_weekly_report(Path(args.weekly_report), summary)

    if exit_code != 0:
        print("Build blocked: CVE budget or attestation gate failed.", file=sys.stderr)
    else:
        print("All services within CVE budgets and attestations verified.")
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
