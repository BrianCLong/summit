from __future__ import annotations

from pathlib import Path

FORBIDDEN = [
    r"\write18",         # shell escape vector
    r"http://", r"https://", # network-ish includes
]

def lint_tex(tex_path: Path) -> list[str]:
    s = tex_path.read_text(encoding="utf-8", errors="ignore")
    findings = []
    for pat in FORBIDDEN:
        if pat in s:
            findings.append(f"forbidden pattern: {pat}")
    return findings
