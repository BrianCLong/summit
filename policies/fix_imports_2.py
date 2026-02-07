import os

files_to_fix = [
    'policies/abac.rego',
    'policies/abac_tenant_isolation.rego',
    'policies/agent-archetypes.rego',
    'policies/approval.rego',
    'policies/aws_iam.rego',
    'policies/aws_s3.rego',
    'policies/budget.rego',
    'policies/export.rego',
    'policies/incident.rego',
    'policies/intelgraph/abac/allow.rego',
    'policies/opa/deploy-gate.rego',
    'policies/opa/dlp.rego',
    'policies/opa/export_v2.rego',
    'policies/opa/policy_shadow.rego',
    'policies/opa/residency.rego',
    'policies/rego/sku_gates.rego',
    'policies/switchboard.rego',
    'policies/truth-defense.rego',
    'policies/rego/compliance/controls_ccpa.rego',
    'policies/rego/compliance/controls_change.rego',
    'policies/rego/compliance/controls_security.rego'
]

for filepath in files_to_fix:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (not found)")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    if "import future.keywords" not in content:
        lines = content.split('\n')
        new_lines = []
        inserted = False
        for line in lines:
            new_lines.append(line)
            if line.startswith('package ') and not inserted:
                new_lines.append('import future.keywords')
                inserted = True

        with open(filepath, 'w') as f:
            f.write('\n'.join(new_lines))
        print(f"Fixed {filepath}")
    else:
        print(f"Skipping {filepath} (already has imports)")
