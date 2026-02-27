import sys
from pathlib import Path

p = Path("scripts/verify_evidence.py")
content = p.read_text(encoding="utf-8")

# Add ignore files
if '"governed_exceptions.json"' not in content:
    replace_str = '"acp_metrics.json"'
    if replace_str in content:
        content = content.replace(replace_str, replace_str + ', "governed_exceptions.json"')
    else:
        print("Could not find anchor for IGNORE files")

# Add ignore dirs
ignore_dirs_to_add = [
    "eval-repro", "audit", "fixtures", "policy", "portal-kombat-venezuela",
    "EVD-IOB20260202-ECONESP-001", "FORBES-AGENTIC-AI-2026", "EVD-COGWAR-2026-EVENT-001",
    "EVD-COGWAR-2026-EVENT-003", "EVD-IOB20260202-CAPACITY-001", "EVID-20260131-ufar-0001",
    "EVD-IOB20260202-AIAGENT-001", "moltbook-relay-surface-001", "EVID-NARINT-SMOKE",
    "forbes-2026-trends", "EVID-IOPS-20260208-v2-schema-gitsha7", "EVD-IOB20260202-HUMINT-001",
    "EVD-IOB20260202-FIMI-001", "EVD-IOB20260202-WIRELESS-001", "pppt-501608",
    "EVD-NARRATIVE-CI-METRICS-001", "EVD-IOB20260202-ALLYRISK-001", "EVD-IOB20260202-SUPPLYCHAIN-001",
    "osintplatint_20260201_transform_search_ea8aba4", "DISINFO-NEWS-ECOSYSTEM-2026",
    "EVD-COGWAR-2026-EVENT-002"
]

start_marker = 'IGNORE_DIRS = {'
end_marker = '}'
start_idx = content.find(start_marker)
if start_idx != -1:
    end_idx = content.find(end_marker, start_idx)
    if end_idx != -1:
        # Check if already added (heuristic)
        if "eval-repro" not in content[start_idx:end_idx]:
            new_dirs_str = ", ".join([f'"{d}"' for d in ignore_dirs_to_add])
            # Insert after the opening brace
            content = content[:start_idx + len(start_marker)] + new_dirs_str + ", " + content[start_idx + len(start_marker):]
        else:
            print("Dirs already added?")
    else:
        print("Could not find end of IGNORE_DIRS")
else:
    print("Could not find start of IGNORE_DIRS")

p.write_text(content, encoding="utf-8")
print("Updated scripts/verify_evidence.py")
