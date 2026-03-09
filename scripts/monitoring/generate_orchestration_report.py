import json
import os
import re
from datetime import datetime, timezone

# 1. Identify active sessions and extract metrics
active_sessions = []
agent_activity_path = 'AGENT_ACTIVITY.md'
if os.path.exists(agent_activity_path):
    with open(agent_activity_path, 'r') as f:
        content = f.read()
        for line in content.split('\n'):
            if '|' in line and not line.strip().startswith('| task_id') and not line.strip().startswith('| -'):
                parts = [p.strip() for p in line.split('|')]
                if len(parts) > 5 and parts[5] in ['in-progress', 'ready-for-review', 'blocked']:
                    active_sessions.append({
                        'task_id': parts[1],
                        'branch': parts[2],
                        'status': parts[5],
                        'notes': parts[6]
                    })

# 2. Check for duplicate PRs
duplicate_prs = []
prs_files = ['prs.json', 'pr-open.json']
topics = {}
for file in prs_files:
    if os.path.exists(file):
        with open(file, 'r') as f:
            try:
                prs = json.load(f)
                for pr in prs:
                    title = pr.get('title', '')
                    # Normalize title to lower case and remove common prefixes
                    topic = re.sub(r'^(feat|fix|chore|test|docs|refactor|perf)(\([^)]+\))?:\s*', '', title, flags=re.IGNORECASE).strip().lower()

                    if topic in topics:
                        if pr['number'] not in duplicate_prs:
                            duplicate_prs.append(pr['number'])
                        if topics[topic] not in duplicate_prs:
                            duplicate_prs.append(topics[topic])
                    else:
                        topics[topic] = pr['number']
            except json.JSONDecodeError:
                pass

# 3. Check for deterministic artifact violations
violations = []
schemas_dir = 'schemas'
for root, _, files in os.walk(schemas_dir):
    for file in files:
        if file.endswith('.json'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r') as f:
                content = f.read()

                is_subsumption_primitive = False
                try:
                    schema_json = json.loads(content)
                    title = schema_json.get("title", "")
                    if title in ["InvestigationRun", "EvidenceObject", "EvidenceBundle", "Summit Evidence Bundle"]:
                        is_subsumption_primitive = True
                except:
                    pass

                if is_subsumption_primitive and "timestamp" in content:
                    violations.append(f"Violation in {file_path}: 'timestamp' found in deterministic artifact schema.")

# Create the report object
report = {
    "report_timestamp": datetime.now(timezone.utc).isoformat(),
    "active_sessions": active_sessions,
    "duplicate_prs": duplicate_prs,
    "deterministic_artifact_violations": violations
}

os.makedirs('artifacts', exist_ok=True)
with open('artifacts/jules-orchestration-report.json', 'w') as f:
    json.dump(report, f, indent=2)

print("Report generated at artifacts/jules-orchestration-report.json")
