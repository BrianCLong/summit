import os
import hashlib
from typing import Optional, List

MAX_BYTES = 8192  # 8KB budget
POLICY_PREAMBLE_PATH = os.path.join(os.path.dirname(__file__), "policy_preamble.txt")

ALLOWED_PHRASES = [
    "Documentation Index",
    "Prefer retrieval-led reasoning",
    "Consult docs",
]

def load_policy_preamble() -> str:
    if os.path.exists(POLICY_PREAMBLE_PATH):
        with open(POLICY_PREAMBLE_PATH, "r") as f:
            return f.read()
    return ""

def is_allowed_line(line: str) -> bool:
    # Allow empty lines
    if not line.strip():
        return True

    # Allow markdown headers
    if line.strip().startswith("#"):
        return True

    # Check for allowed phrases
    for phrase in ALLOWED_PHRASES:
        if phrase.lower() in line.lower():
            return True

    # Allow markdown links (index lines)
    if "[" in line and "](" in line:
        return True

    # Allow lines that look like file paths (no spaces, and contain / or .)
    # This prevents "This is a sentence." from passing, but allows "path/to/file.md"
    sline = line.strip()
    if " " not in sline and ("/" in sline or "." in sline):
        return True

    # Default reject
    return False

def load_agents_md(repo_root: str = ".") -> str:
    candidates = ["AGENTS.md", "SUMMIT_AGENTS.md"]
    content = ""

    for filename in candidates:
        filepath = os.path.join(repo_root, filename)
        if os.path.exists(filepath):
            with open(filepath, "r", encoding="utf-8") as f:
                content = f.read()
            break

    if not content:
        return load_policy_preamble()

    # Sanitize
    lines = content.splitlines()
    sanitized_lines = []
    for line in lines:
        if is_allowed_line(line):
            sanitized_lines.append(line)
        else:
            # Placeholder for sanitized line
            pass

    sanitized_content = "\n".join(sanitized_lines)

    # Truncate to budget
    if len(sanitized_content.encode("utf-8")) > MAX_BYTES:
        # Deterministic truncation
        # Keep the beginning, cut off the end
        # Ensure we don't cut in middle of a multibyte char
        encoded = sanitized_content.encode("utf-8")[:MAX_BYTES]
        sanitized_content = encoded.decode("utf-8", errors="ignore")

    preamble = load_policy_preamble()
    return f"{preamble}\n\n--- AGENTS.md Context ---\n{sanitized_content}"

def get_agents_md_hash(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()
