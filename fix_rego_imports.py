import os
import re

files_to_fix = [
    "policies/abac_tenant_isolation.rego",
    "policies/aws_iam.rego",
    "policies/aws_s3.rego",
    "policies/export.rego",
    "policies/incident.rego",
    "policies/opa/deploy-gate.rego",
    "policies/opa/dlp.rego",
    "policies/opa/export_v2.rego",
    "policies/opa/policy_shadow.rego",
    "policies/opa/residency.rego",
    "policies/rego/compliance/controls_ccpa.rego",
    "policies/rego/compliance/controls_change.rego",
    "policies/rego/compliance/controls_security.rego",
    "policies/rego/sku_gates.rego",
    "policies/switchboard.rego"
]

for filepath in files_to_fix:
    if not os.path.exists(filepath):
        print(f"Skipping {filepath} (not found)")
        continue

    with open(filepath, 'r') as f:
        content = f.read()

    if "import future.keywords" in content or "import rego.v1" in content:
        print(f"Skipping {filepath} (already has imports)")
        continue

    # Find package declaration
    package_match = re.search(r'^package\s+[^\s]+', content, re.MULTILINE)
    if package_match:
        end_pos = package_match.end()
        new_content = content[:end_pos] + "\n\nimport future.keywords" + content[end_pos:]
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")
    else:
        print(f"Skipping {filepath} (no package declaration found)")
