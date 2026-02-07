import re
import shlex
from typing import Any

# Restricted QEMU parser for Summit VM Workbench
# Inspired by vm-curator, implemented as a clean-room restricted adapter.

QEMU_RE = re.compile(r'^\s*(qemu-system-[^\s]+)\s+(.*)$')
FORBIDDEN = ["|", "&&", "||", "$(", "`", ">", "<"]

def parse_launch_script(text: str) -> dict[str, Any]:
    """
    Parses a QEMU launch script into a structured format.
    Refuses any shell constructs to prevent injection.
    """
    for tok in FORBIDDEN:
        if tok in text:
            raise ValueError(f"forbidden token detected: {tok}")

    # Handle backslash line continuations
    text = text.replace('\\\n', ' ')

    # Remove empty lines and comments
    lines = [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.strip().startswith("#")]

    if not lines:
        raise ValueError("no commands found in script")

    if len(lines) > 1:
        # We only support a single qemu-system-* invocation line for security.
        # Multiple non-comment lines are forbidden.
        raise ValueError("restricted mode: multiple command lines not allowed")

    m = QEMU_RE.match(lines[0])
    if not m:
        raise ValueError("no valid qemu-system-* invocation found")

    qemu_bin, rest = m.group(1), m.group(2)

    # Basic arg splitting (doesn't handle complex quoted spaces yet, but safe for simple cases)
    # In a production version, we would use shlex.split if we trust it,
    # but since we already blocked shell tokens, simple split is relatively safe for now.
    try:
        args = shlex.split(rest)
    except ValueError as e:
        raise ValueError(f"failed to parse arguments: {e}")

    return {
        "id": "unidentified-vm", # To be filled by caller
        "raw_launch_script": text,
        "qemu_bin": qemu_bin,
        "qemu_args": args,
        "devices": [] # To be populated by further analysis
    }
