from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

NPX_RE = re.compile(r"(^|\s)npx\s+([a-zA-Z0-9@/._-]+)", re.IGNORECASE)

@dataclass(frozen=True)
class SkillSecFinding:
    code: str
    message: str
    path: str

def scan_text_for_npx(md: str, allowlist: set[str]) -> list[SkillSecFinding]:
    findings: list[SkillSecFinding] = []
    for m in NPX_RE.finditer(md):
        pkg = m.group(2)
        if pkg not in allowlist:
            findings.append(SkillSecFinding(
                code="SKILLSEC-NPX-001",
                message=f"Unverified npx package '{pkg}'. Must be allowlisted + pinned.",
                path="<memory>",
            ))
    return findings

def lint_skillpack_dir(root: Path, allowlist: set[str]) -> list[SkillSecFinding]:
    findings: list[SkillSecFinding] = []
    for p in root.rglob("*.md"):
        findings.extend([
            SkillSecFinding(f.code, f.message, str(p))
            for f in scan_text_for_npx(p.read_text("utf-8"), allowlist)
        ])
    return findings
