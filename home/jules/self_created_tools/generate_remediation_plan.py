import csv
import os

CSV_PATH = 'docs/maestro/maestro_gap_analysis_2025-09-02.csv'
OUTPUT_PATH = 'docs/gameday/REMEDIATION_PLAN.md'

GAP_CLASS_ORDER = ['SIGNAL', 'OWNERSHIP', 'PROCESS', 'DOC', 'ACCEPTABLE RISK']

# Mapping logic
CATEGORY_TO_CLASS = {
    'Identity & Access (SSO)': 'OWNERSHIP',
    'Browser Support Matrix': 'PROCESS',
    'Evidence Immutability (WORM)': 'PROCESS',
    'Data Residency / Route Pins': 'PROCESS',
    'On-call & Escalation': 'OWNERSHIP',
    'Router Decision Transparency': 'SIGNAL',
    'Serving Lane Metrics (vLLM/Ray)': 'SIGNAL',
    'Evidence Panel (Supply Chain)': 'SIGNAL',
    'Prometheus Alerts & Runbooks': 'SIGNAL',
    'NL→Cypher Sandbox & Cost Preview': 'PROCESS',
    'Canary & Rollback Automation': 'PROCESS',
    'Multi-tenant RBAC & OPA': 'OWNERSHIP',
    'API & Docs (OpenAPI)': 'DOC',
    'SDKs (TS/Python)': 'DOC',
    'Trace Correlation (OTel)': 'SIGNAL',
    'Billing, Budgets & Quotas': 'PROCESS',
    'SOC2/ISO Evidence Pack': 'PROCESS',
    'Data Lifecycle & Retention': 'PROCESS',
    'Disaster Recovery (DR/BCP)': 'PROCESS',
    'Model Gateways Coverage': 'PROCESS',
    'Eval/Benchmark Harness': 'PROCESS',
    'Audit Logging': 'SIGNAL',
    'Privacy & Legal Readiness': 'PROCESS',
    'Offline/Edge Kits': 'PROCESS',
    'Accessibility (WCAG 2.1 AA)': 'PROCESS',
    'Service Level Objectives (SLOs)': 'SIGNAL',
    'Secrets & Config Management': 'PROCESS',
    'Backups & Encryption': 'PROCESS',
    'Feature Flags & Safe Launch': 'PROCESS',
    'GA Gates PR Template & Checks': 'PROCESS'
}

def get_gap_class(category):
    return CATEGORY_TO_CLASS.get(category, 'PROCESS')

def main():
    if not os.path.exists(CSV_PATH):
        print(f"Error: {CSV_PATH} not found.")
        return

    findings = []
    with open(CSV_PATH) as f:
        reader = csv.DictReader(f)
        for i, row in enumerate(reader):
            finding_id = f"GD-{str(i+1).zfill(2)}"

            # Problem statement derivation
            current_state = row['Current State (Observed/Declared)']
            requirement = row['Requirement (PRD/Goal)']
            problem = f"Current state: {current_state} Requirement: {requirement}"

            findings.append({
                'id': finding_id,
                'category': row['Category'],
                'gap_class': get_gap_class(row['Category']),
                'status': row['Status'],
                'csv_priority': row['Priority'],
                'csv_severity': row['Severity'],
                'problem': problem,
                'remediation': row['Gap Description'],
                'owner': row['Owner'],
                'acceptance': row['Acceptance Criteria'],
                'trigger': row['Evidence/Source']
            })

    # Scoring Logic
    for f in findings:
        p = f['csv_priority']
        s = f['csv_severity']

        # Priority Mapping
        if p == 'P0':
            f['priority'] = 'P0'
        elif p == 'P1':
            f['priority'] = 'P1'
        else:
            f['priority'] = 'P2'

        # Severity Mapping
        if s == 'High':
            if f['priority'] == 'P0':
                f['severity'] = 'S0'
            else:
                f['severity'] = 'S1'
        elif s == 'Medium':
            f['severity'] = 'S2'
        else:
            f['severity'] = 'S3'

        if f['severity'] == 'S3' and f['priority'] == 'P0':
             f['severity'] = 'S2'

    # Rules Check
    for f in findings:
        if f['severity'] in ['S0', 'S1'] and f['priority'] == 'P2':
            f['priority'] = 'P1'

    # Generate Markdown
    md = []
    md.append("# GA Game-Day Remediation Plan")
    md.append("")
    md.append("## Phase 1 & 2: Game-Day Findings Ledger (Normalized & Scored)")
    md.append("")
    md.append("| ID | Scenario/Category | Gap Class | Status | Severity | Priority | Description | Owner |")
    md.append("|---|---|---|---|---|---|---|---|")

    for f in findings:
        desc = f['remediation'].replace('\n', ' ')
        md.append(f"| {f['id']} | {f['category']} | {f['gap_class']} | {f['status']} | {f['severity']} | {f['priority']} | {desc} | {f['owner']} |")

    md.append("")
    md.append("## Phase 3: Remediation Cards")
    md.append("")

    open_findings = [f for f in findings if f['status'] != 'Delivered']

    for f in open_findings:
        md.append("---")
        md.append(f"### [GA Game-Day][{f['id']}] {f['category']}")
        md.append(f"**Problem:** {f['problem']}")
        md.append("")
        md.append(f"**Trigger:** {f['trigger']}")
        md.append(f"**Expected Behavior:** {f['acceptance']}")
        md.append(f"**Proposed Remediation:** {f['remediation']}")
        md.append(f"**Closure Criteria:** {f['acceptance']}")
        md.append(f"**Owner:** {f['owner']}")
        md.append("")

    md.append("## Phase 4: Remediation Execution Order (Top 5)")
    md.append("")

    # Sorting: 1. Priority (Asc), 2. Severity (Asc), 3. Gap Class Index
    def sort_key(x):
        try:
            class_idx = GAP_CLASS_ORDER.index(x['gap_class'])
        except ValueError:
            class_idx = 99
        return (x['priority'], x['severity'], class_idx)

    sorted_findings = sorted(open_findings, key=sort_key)

    for i, f in enumerate(sorted_findings[:5]):
        md.append(f"{i+1}. **[{f['priority']}/{f['severity']}]** {f['gap_class']} - {f['category']} ({f['id']})")

    md.append("")
    md.append("## Phase 5: Handoff Prompts")
    md.append("")
    md.append("### Claude Code UI Prompt (Script/CI)")
    md.append("```markdown")
    md.append("Refactor the CI pipeline to enforce GA gates.")
    md.append("1. Read `docs/maestro/issue_ga_maestro_ui_close_all_ga_gaps_final.md` for requirements.")
    md.append("2. Implement the `enforce-ga-gates` workflow.")
    md.append("3. Verify with a dry-run.")
    md.append("Stop when the workflow file is created and passes linting.")
    md.append("```")
    md.append("")
    md.append("### Qwen Prompt (Docs)")
    md.append("```markdown")
    md.append("Consolidate governance documentation.")
    md.append("1. Read `docs/governance/` and `docs/gap-analysis-summit.md`.")
    md.append("2. Create a unified `docs/governance/GA_POLICY.md`.")
    md.append("3. Ensure it covers all P0 gaps from the Remediation Plan.")
    md.append("Stop when the policy file is created.")
    md.append("```")

    with open(OUTPUT_PATH, 'w') as f:
        f.write('\n'.join(md))

    print(f"Generated {OUTPUT_PATH}")

if __name__ == "__main__":
    main()
