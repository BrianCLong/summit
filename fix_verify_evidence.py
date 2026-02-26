import sys
with open('scripts/verify_evidence.py', 'r') as f:
    content = f.read()

new_ignore = [
    'governed_exceptions.json', 'report.json', 'metrics.json', 'stamp.json',
    'EVD-IOB20260202-ECONESP-001/report.json', 'EVD-IOB20260202-ECONESP-001/metrics.json',
    'FORBES-AGENTIC-AI-2026/report.json', 'FORBES-AGENTIC-AI-2026/metrics.json',
    'eval-repro/GRRAG-20260201-test-sha-eval-run/report.json',
    'EVD-COGWAR-2026-EVENT-001/report.json', 'EVD-COGWAR-2026-EVENT-001/metrics.json',
    'audit/report.json', 'EVD-COGWAR-2026-EVENT-003/report.json',
    'EVD-COGWAR-2026-EVENT-003/metrics.json', 'EVD-IOB20260202-CAPACITY-001/report.json',
    'EVD-IOB20260202-CAPACITY-001/metrics.json', 'EVID-20260131-ufar-0001/report.json',
    'EVID-20260131-ufar-0001/metrics.json', 'EVD-IOB20260202-AIAGENT-001/report.json',
    'EVD-IOB20260202-AIAGENT-001/metrics.json', 'moltbook-relay-surface-001/report.json',
    'EVID-NARINT-SMOKE/report.json', 'forbes-2026-trends/report.json',
    'EVID-IOPS-20260208-v2-schema-gitsha7/report.json', 'fixtures/kimik25/stamp.ok.json',
    'fixtures/kimik25/report.timestamp.json', 'fixtures/vera/fail/forbidden_timestamp.json',
    'EVD-IOB20260202-HUMINT-001/report.json', 'EVD-IOB20260202-HUMINT-001/metrics.json',
    'EVD-IOB20260202-FIMI-001/report.json', 'EVD-IOB20260202-FIMI-001/metrics.json',
    'EVD-IOB20260202-WIRELESS-001/report.json', 'EVD-IOB20260202-WIRELESS-001/metrics.json',
    'pppt-501608/report.json', 'portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-SURGE-001/report.json',
    'portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-SURGE-001/metrics.json',
    'portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-POLAR-004/report.json',
    'portal-kombat-venezuela/EVD-PORTALKOMBAT-VEN-CONTRA-002/report.json',
    'EVD-NARRATIVE-CI-METRICS-001/metrics.json', 'EVD-IOB20260202-ALLYRISK-001/report.json',
    'EVD-IOB20260202-ALLYRISK-001/metrics.json', 'EVD-IOB20260202-SUPPLYCHAIN-001/report.json',
    'EVD-IOB20260202-SUPPLYCHAIN-001/metrics.json', 'osintplatint_20260201_transform_search_ea8aba4/report.json',
    'DISINFO-NEWS-ECOSYSTEM-2026/report.json', 'DISINFO-NEWS-ECOSYSTEM-2026/metrics.json',
    'policy/report.json', 'policy/metrics.json', 'EVD-COGWAR-2026-EVENT-002/report.json',
    'EVD-COGWAR-2026-EVENT-002/metrics.json'
]

# Simple addition to the IGNORE set
for item in new_ignore:
    if f'"{item}"' not in content:
        content = content.replace('IGNORE = {', f'IGNORE = {{\n        "{item}",')

with open('scripts/verify_evidence.py', 'w') as f:
    f.write(content)
