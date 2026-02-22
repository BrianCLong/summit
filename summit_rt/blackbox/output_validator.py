from __future__ import annotations
import re
from typing import List

NODE_OR_EDGE_ID = re.compile(r"\b(N\d+|E\d+|node:[\w\-:]+|edge:[\w\-:]+)\b")

def validate_steps(text: str) -> List[str]:
    """
    Returns list of violations. Empty list => pass.
    """
    violations: List[str] = []
    steps = [ln.strip() for ln in text.splitlines() if ln.strip()]
    for i, s in enumerate(steps[:50], start=1):
        if not NODE_OR_EDGE_ID.search(s):
            violations.append(f"step_{i}_missing_citation")
    return violations
