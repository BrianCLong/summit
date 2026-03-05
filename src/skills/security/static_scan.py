from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

CRITICAL_PATTERNS = [
    re.compile(r"\brm\s+-rf\b"),
    re.compile(r"\bcurl\b.*\|\s*bash\b"),
    re.compile(r"\bcat\s+/etc/shadow\b"),
    re.compile(r"\bssh\b"),
]

@dataclass(frozen=True)
class ScanFinding:
    severity: str  # "info"|"warn"|"critical"
    file: str
    pattern: str

def scan_skill_dir(skill_root: Path) -> list[ScanFinding]:
    findings: list[ScanFinding] = []
    for p in skill_root.rglob("*"):
        if p.is_dir():
            continue
        if p.name.endswith((".png", ".jpg", ".zip")):
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        for rx in CRITICAL_PATTERNS:
            if rx.search(text):
                findings.append(ScanFinding("critical", str(p.relative_to(skill_root)), rx.pattern))
    return findings
