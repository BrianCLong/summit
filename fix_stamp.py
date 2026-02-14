import json
import os
from datetime import datetime

missing_files = [
    'evidence/governed_exceptions.json',
    'evidence/EVD-IOB20260202-ECONESP-001/report.json',
    'evidence/EVD-IOB20260202-ECONESP-001/metrics.json',
    'evidence/FORBES-AGENTIC-AI-2026/report.json',
    'evidence/FORBES-AGENTIC-AI-2026/metrics.json',
    'evidence/eval-repro/GRRAG-20260201-test-sha-eval-run/report.json',
    'evidence/EVD-COGWAR-2026-EVENT-001/report.json',
    'evidence/EVD-COGWAR-2026-EVENT-001/metrics.json',
    'evidence/audit/report.json',
    'evidence/EVD-COGWAR-2026-EVENT-003/report.json',
    'evidence/EVD-COGWAR-2026-EVENT-003/metrics.json',
    'evidence/EVD-IOB20260202-CAPACITY-001/report.json',
    'evidence/EVD-IOB20260202-CAPACITY-001/metrics.json',
    'evidence/EVID-20260131-ufar-0001/report.json',
    'evidence/EVID-20260131-ufar-0001/metrics.json',
    'evidence/EVD-IOB20260202-AIAGENT-001/report.json',
    'evidence/EVD-IOB20260202-AIAGENT-001/metrics.json',
    'evidence/moltbook-relay-surface-001/report.json',
    'evidence/EVID-NARINT-SMOKE/report.json',
    'evidence/forbes-2026-trends/report.json',
    'evidence/EVID-IOPS-20260208-v2-schema-gitsha7/report.json',
    'evidence/fixtures/kimik25/stamp.ok.json',
    'evidence/fixtures/kimik25/report.timestamp.json',
    'evidence/fixtures/vera/fail/forbidden_timestamp.json',
    'evidence/EVD-IOB20260202-HUMINT-001/report.json',
    'evidence/EVD-IOB20260202-HUMINT-001/metrics.json',
    'evidence/EVD-IOB20260202-FIMI-001/report.json',
    'evidence/EVD-IOB20260202-FIMI-001/metrics.json',
    'evidence/EVD-IOB20260202-WIRELESS-001/report.json',
    'evidence/EVD-IOB20260202-WIRELESS-001/metrics.json',
    'evidence/pppt-501608/report.json',
    'evidence/portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-SURGE-001/report.json',
    'evidence/portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-SURGE-001/metrics.json',
    'evidence/portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-POLAR-004/report.json',
    'evidence/portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-CONTRA-002/report.json',
    'evidence/EVD-NARRATIVE-CI-METRICS-001/metrics.json',
    'evidence/EVD-IOB20260202-ALLYRISK-001/report.json',
    'evidence/EVD-IOB20260202-ALLYRISK-001/metrics.json',
    'evidence/EVD-IOB20260202-SUPPLYCHAIN-001/report.json',
    'evidence/EVD-IOB20260202-SUPPLYCHAIN-001/metrics.json',
    'evidence/osintplatint_20260201_transform_search_ea8aba4/report.json',
    'evidence/DISINFO-NEWS-ECOSYSTEM-2026/report.json',
    'evidence/DISINFO-NEWS-ECOSYSTEM-2026/metrics.json',
    'evidence/policy/report.json',
    'evidence/policy/metrics.json',
    'evidence/EVD-COGWAR-2026-EVENT-002/report.json',
    'evidence/EVD-COGWAR-2026-EVENT-002/metrics.json'
]

stamp_file = 'stamp.json'
data = {}

if os.path.exists(stamp_file):
    try:
        with open(stamp_file, 'r') as f:
            data = json.load(f)
    except json.JSONDecodeError:
        print(f"Warning: {stamp_file} was not valid JSON. Starting fresh.")

current_time = datetime.utcnow().isoformat() + "Z"

for file_path in missing_files:
    if file_path not in data:
        data[file_path] = current_time

with open(stamp_file, 'w') as f:
    json.dump(data, f, indent=2)

print(f"Updated {stamp_file} with {len(missing_files)} entries.")
