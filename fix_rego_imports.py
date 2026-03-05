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
    'policies/opa/cmk.rego',
    'policies/opa/cmk_decision.rego'
]

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        print(f"Skipping {file_path} (not found)")
        continue

    with open(file_path, 'r') as f:
        lines = f.readlines()

    has_import = any('import future.keywords' in line for line in lines)
    if has_import:
        print(f"Skipping {file_path} (already has import)")
        continue

    new_lines = []
    package_found = False
    for line in lines:
        new_lines.append(line)
        if line.startswith('package ') and not package_found:
            new_lines.append('\nimport future.keywords\n')
            package_found = True

    with open(file_path, 'w') as f:
        f.writelines(new_lines)
    print(f"Fixed {file_path}")
