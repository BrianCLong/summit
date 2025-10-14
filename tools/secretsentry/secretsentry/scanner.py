"""Scanning utilities for SecretSentry."""

from __future__ import annotations

import json
import math
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable

from .allowlist import Allowlist
from .rules import DEFAULT_IGNORES, PATTERN_RULES


@dataclass(frozen=True)
class Finding:
    rule: str
    description: str
    severity: str
    file: str
    line: int
    redacted: str


@dataclass
class ScanResult:
    findings: list[Finding]
    scanned_files: int

    def sorted(self) -> "ScanResult":
        self.findings.sort(key=lambda f: (f.file, f.line, f.rule))
        return self

    def to_json(self) -> str:
        payload = {
            "summary": {
                "scanned_files": self.scanned_files,
                "findings": len(self.findings),
            },
            "findings": [asdict(f) for f in self.findings],
        }
        return json.dumps(payload, indent=2, sort_keys=True)


def _redact(secret: str) -> str:
    if len(secret) <= 8:
        return "*" * len(secret)
    return f"{secret[:4]}…{secret[-4:]}"


def _shannon_entropy(value: str) -> float:
    if not value:
        return 0.0
    freq = {}
    for char in value:
        freq[char] = freq.get(char, 0) + 1
    entropy = 0.0
    length = len(value)
    for count in freq.values():
        p = count / length
        entropy -= p * math.log2(p)
    return entropy


def _iter_candidate_strings(line: str) -> Iterable[str]:
    import re

    pattern = re.compile(r"[A-Za-z0-9+/=_-]{20,}")
    for match in pattern.finditer(line):
        token = match.group(0)
        parts = [p for p in token.split('=') if len(p) >= 20]
        if not parts:
            parts = [token]
        for part in parts:
            trimmed = part.strip('-_')
            if len(trimmed) >= 20:
                yield trimmed


def scan_path(
    root: Path | str,
    allowlist_path: Path | str | None = None,
) -> ScanResult:
    root_path = Path(root).expanduser().resolve()
    if not root_path.exists():
        raise FileNotFoundError(f"Scan root '{root_path}' does not exist")
    if not root_path.is_dir():
        raise NotADirectoryError(f"Scan root '{root_path}' is not a directory")

    allowlist_file = _resolve_allowlist(root_path, allowlist_path)
    allowlist = Allowlist.from_file(allowlist_file).extend(DEFAULT_IGNORES)
    if allowlist_file is not None:
        try:
            rel_allowlist = allowlist_file.resolve().relative_to(root_path)
            allowlist = allowlist.extend((rel_allowlist.as_posix(),))
        except ValueError:
            allowlist = allowlist.extend((allowlist_file.name,))

    findings: list[Finding] = []
    scanned_files = 0

    for file_path in sorted(root_path.rglob("*")):
        if not file_path.is_file():
            continue
        relative = file_path.relative_to(root_path).as_posix()
        if allowlist.is_ignored(relative):
            continue
        scanned_files += 1
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        for idx, line in enumerate(content.splitlines(), start=1):
            findings.extend(
                _evaluate_line(relative, idx, line)
            )
    result = ScanResult(findings=findings, scanned_files=scanned_files)
    return result.sorted()


def _resolve_allowlist(
    root_path: Path, allowlist_path: Path | str | None
) -> Path | None:
    if allowlist_path is None:
        candidate = root_path / ".secretsentryignore"
        return candidate if candidate.is_file() else None

    raw_candidate = Path(allowlist_path).expanduser()
    search_paths: list[Path] = []
    if raw_candidate.is_absolute():
        search_paths.append(raw_candidate)
    else:
        search_paths.append((root_path / raw_candidate).resolve())
        search_paths.append((Path.cwd() / raw_candidate).resolve())

    seen: set[Path] = set()
    for candidate in search_paths:
        if candidate in seen:
            continue
        seen.add(candidate)
        if candidate.is_file():
            return candidate

    raise FileNotFoundError(f"Allowlist file '{allowlist_path}' does not exist")


def _evaluate_line(file_path: str, line_no: int, line: str) -> list[Finding]:
    line_findings: list[Finding] = []
    pattern_hits: set[str] = set()
    for rule in PATTERN_RULES:
        for match in rule.finditer(line):
            secret = match.group(0)
            pattern_hits.add(secret)
            redacted = _redact(secret)
            line_findings.append(
                Finding(
                    rule=rule.name,
                    description=rule.description,
                    severity=rule.severity,
                    file=file_path,
                    line=line_no,
                    redacted=redacted,
                )
            )
    for token in _iter_candidate_strings(line):
        if token in pattern_hits:
            continue
        if token.isdigit():
            continue
        if token.lower().startswith("http"):
            continue
        entropy = _shannon_entropy(token)
        if entropy >= 4.2:
            line_findings.append(
                Finding(
                    rule="High Entropy String",
                    description="Potential secret detected via entropy",
                    severity="medium",
                    file=file_path,
                    line=line_no,
                    redacted=_redact(token),
                )
            )
    return line_findings
