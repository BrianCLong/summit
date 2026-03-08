import sys
from pathlib import Path

REQUIRED = [
    "policy/ai-coding/prompt-packet.md",
    "policy/ai-coding/agent-vs-manual.md",
    "policy/ai-coding/mcp-policy.md",
]

missing = [p for p in REQUIRED if not Path(p).exists()]
if missing:
    print("Missing required policy files:")
    for p in missing:
        print(f"- {p}")
    sys.exit(1)

print("OK: required policy files present.")
