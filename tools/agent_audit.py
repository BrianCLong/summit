#!/usr/bin/env python3
"""Static agent inventory scanner for Summit."""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field, asdict
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

DEFAULT_SCAN_PATHS: Sequence[str] = (
    "services",
    "tools",
    "server",
    "sdk",
    ".github/workflows",
    "security",
)

SECRET_PATTERNS = (
    re.compile(r"api[_-]?key", re.IGNORECASE),
    re.compile(r"token", re.IGNORECASE),
    re.compile(r"secret", re.IGNORECASE),
    re.compile(r"bearer", re.IGNORECASE),
    re.compile(r"private[_-]?key", re.IGNORECASE),
)

WRITE_PRIVILEGE_HINTS = (
    "write",
    "admin",
    "maintain",
    "push",
    "delete",
)

DATA_DOMAIN_HINTS = {
    "intelgraph": "intelgraph",
    "graph": "graph",
    "blob": "blob-storage",
    "s3": "s3",
    "database": "database",
    "db": "database",
}

INTERFACE_HINTS = {
    "pull_request": "pr-bot",
    "workflow": "scheduler",
    "schedule": "scheduler",
    "chat": "chat",
    "webhook": "webhook",
}


@dataclass
class AgentFinding:
    name: str
    path: str
    interface: str
    triggers: List[str] = field(default_factory=list)
    permissions: List[str] = field(default_factory=list)
    data_domains: List[str] = field(default_factory=list)
    secrets: List[str] = field(default_factory=list)
    risk_score: int = 1
    notes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, object]:
        payload = asdict(self)
        payload["risk_score"] = int(self.risk_score)
        return payload


class AgentScanner:
    def __init__(self, root: Path, extra_paths: Iterable[Path] | None = None):
        self.root = root
        self.paths = self._resolve_paths(extra_paths)

    def _resolve_paths(self, extra_paths: Iterable[Path] | None) -> List[Path]:
        paths = [self.root / path for path in DEFAULT_SCAN_PATHS]
        if extra_paths:
            paths.extend(extra_paths)
        existing = [path for path in paths if path.exists()]
        if not existing:
            return [self.root]
        return existing

    def scan(self) -> List[AgentFinding]:
        findings: List[AgentFinding] = []
        for path in self.paths:
            for file_path in path.rglob("*"):
                if not file_path.is_file():
                    continue
                content = file_path.read_text(encoding="utf-8", errors="ignore")
                if "agent" not in content.lower() and "mcp" not in content.lower():
                    if file_path.suffix not in {".json", ".yml", ".yaml"}:
                        continue
                finding = self._analyze_file(file_path, content)
                if finding:
                    findings.append(finding)
        return findings

    def _analyze_file(self, file_path: Path, content: str) -> AgentFinding | None:
        interface = self._detect_interface(file_path, content)
        triggers = self._detect_triggers(content)
        permissions = self._detect_permissions(content)
        data_domains = self._detect_data_domains(content)
        secrets = self._detect_secrets(content)

        if not any((triggers, permissions, data_domains, secrets)) and "agent" not in content.lower():
            return None

        name = self._detect_name(file_path, content)
        risk_score, notes = self._score_risk(permissions, secrets, data_domains, triggers)

        return AgentFinding(
            name=name,
            path=str(file_path.relative_to(self.root)),
            interface=interface,
            triggers=triggers,
            permissions=permissions,
            data_domains=data_domains,
            secrets=secrets,
            risk_score=risk_score,
            notes=notes,
        )

    def _detect_name(self, file_path: Path, content: str) -> str:
        yaml_match = re.search(r"name:\s*([\w\- ]+)", content)
        if yaml_match:
            return yaml_match.group(1).strip()
        json_match = re.search(r"\"name\"\s*:\s*\"([^\"]+)\"", content)
        if json_match:
            return json_match.group(1).strip()
        return file_path.stem

    def _detect_interface(self, file_path: Path, content: str) -> str:
        lower = content.lower()
        for hint, iface in INTERFACE_HINTS.items():
            if hint in lower:
                return iface
        if ".github/workflows" in str(file_path):
            return "pr-bot"
        if "tools" in file_path.parts:
            return "tooling"
        if "services" in file_path.parts or "server" in file_path.parts:
            return "service"
        return "unspecified"

    def _detect_triggers(self, content: str) -> List[str]:
        triggers = []
        lower = content.lower()
        if "pull_request" in lower:
            triggers.append("pull_request")
        cron_matches = re.findall(r"cron[:\s]+['\"]?([^'\"\n]+)", content)
        triggers.extend([f"cron:{expr}" for expr in cron_matches])
        if "schedule" in lower:
            triggers.append("schedule")
        return sorted(set(triggers))

    def _detect_permissions(self, content: str) -> List[str]:
        matches = re.findall(r"permissions?:\s*([\w:-]+)", content, flags=re.IGNORECASE)
        perms = set(matches)
        for hint in WRITE_PRIVILEGE_HINTS:
            if re.search(rf"\b{hint}\b", content, flags=re.IGNORECASE):
                perms.add(hint)
        return sorted(perms)

    def _detect_data_domains(self, content: str) -> List[str]:
        lower = content.lower()
        domains = {label for key, label in DATA_DOMAIN_HINTS.items() if key in lower}
        return sorted(domains)

    def _detect_secrets(self, content: str) -> List[str]:
        secrets = []
        for pattern in SECRET_PATTERNS:
            if pattern.search(content):
                secrets.append(pattern.pattern)
        return secrets

    def _score_risk(
        self,
        permissions: List[str],
        secrets: List[str],
        data_domains: List[str],
        triggers: List[str],
    ) -> tuple[int, List[str]]:
        score = 1
        notes: List[str] = []

        if secrets:
            score += 3
            notes.append("static or referenced secrets detected")
        if any(hint in permissions for hint in WRITE_PRIVILEGE_HINTS):
            score += 2
            notes.append("write/admin privilege detected")
        if len(data_domains) > 1:
            score += 2
            notes.append("cross-domain data access")
        if any(trigger.startswith("cron:") for trigger in triggers):
            score += 1
            notes.append("scheduled autonomy")
        if "pull_request" in triggers:
            score += 1
            notes.append("PR automation pathway")
        return score, notes


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scan Summit repo for AI agent usage and risks.")
    parser.add_argument(
        "--output",
        type=Path,
        help="Path to write JSON manifest. Defaults to stdout if omitted.",
    )
    parser.add_argument(
        "--paths",
        type=Path,
        nargs="*",
        help="Additional paths to scan (relative or absolute).",
    )
    parser.add_argument(
        "--markdown",
        type=Path,
        help="Optional Markdown summary output for governance evidence.",
    )
    return parser.parse_args(argv)


def render_markdown(findings: List[AgentFinding]) -> str:
    lines = ["# Agent Inventory Summary", "", "| Name | Path | Interface | Risk | Notes |", "| --- | --- | --- | --- | --- |"]
    for finding in findings:
        notes = "; ".join(finding.notes) or ""
        lines.append(
            f"| {finding.name} | {finding.path} | {finding.interface} | {finding.risk_score} | {notes} |"
        )
    lines.append("")
    lines.append(f"Total agents: {len(findings)}")
    return "\n".join(lines)


def main(argv: Sequence[str] | None = None) -> None:
    args = parse_args(argv)
    scanner = AgentScanner(Path.cwd(), args.paths)
    findings = scanner.scan()
    manifest = [finding.to_dict() for finding in findings]

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    else:
        print(json.dumps(manifest, indent=2))

    if args.markdown:
        args.markdown.parent.mkdir(parents=True, exist_ok=True)
        args.markdown.write_text(render_markdown(findings), encoding="utf-8")


if __name__ == "__main__":  # pragma: no cover
    main()
