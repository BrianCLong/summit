import os
import re

def fix_file(filepath, changes):
    with open(filepath, 'r') as f:
        content = f.read()

    original_content = content
    for old, new in changes:
        if old in content:
            content = content.replace(old, new)
        # Try regex replacement if direct replacement fails
        else:
             try:
                 content = re.sub(old, new, content)
             except re.error:
                 pass

    if content != original_content:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Fixed {filepath}")
    else:
        print(f"No changes made to {filepath}")

# Fix policies/abac.rego
# Error: policies/abac.rego:65: rego_parse_error: non-terminated expression
# Fix: Ensure expression is terminated
# (Assuming the error is related to syntax)
# For  ->  or ensuring  or

def add_import(filepath, import_stmt="import rego.v1"):
    with open(filepath, 'r') as f:
        content = f.read()
    if import_stmt not in content:
        # Add after package declaration
        if content.startswith("package "):
            content = re.sub(r"(package [^\n]+)", r"\1\n\n" + import_stmt, content, count=1)
        else:
             content = import_stmt + "\n\n" + content
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"Added {import_stmt} to {filepath}")

# List of files needing 'import rego.v1' or fixes for 'in' keyword
files_needing_v1 = [
    "policies/abac.rego",
    "policies/agent-archetypes.rego",
    "policies/aws_iam.rego",
    "policies/aws_s3.rego",
    "policies/incident.rego",
    "policies/opa/deploy-gate.rego",
    "policies/opa/export_v2.rego",
    "policies/opa/policy_shadow.rego",
    "policies/opa/residency.rego",
    "policies/switchboard.rego",
    "policies/intelgraph/abac/allow.rego",
    "policies/truth-defense.rego"
]

for f in files_needing_v1:
    if os.path.exists(f):
        add_import(f)

# Specific Fixes

# policies/abac_tenant_isolation.rego:7: rego_parse_error: var cannot be used for rule name
# policies/approval.rego:209: rego_parse_error: var cannot be used for rule name
# Often caused by  (dashes) instead of  (underscores) or using reserved words.
# Without seeing content, I'll try to standardise imports first.

# policies/budget.rego:114: rego_parse_error: else keyword cannot be used on rules with variables in head
# Fix: Change  to  pattern or remove var in head if not needed.
# Simpler fix for common pattern:  ->
# Assuming modern OPA:

# policies/rego/sku_gates.rego:10: rego_parse_error: illegal token
# Likely unicode char ∪ . Replace with |
if os.path.exists("policies/rego/sku_gates.rego"):
    fix_file("policies/rego/sku_gates.rego", [("∪", "|")])

# policies/opa/cmk.rego:22: rego_parse_error: unexpected package
# Remove duplicate package declaration
if os.path.exists("policies/opa/cmk.rego"):
    with open("policies/opa/cmk.rego", 'r') as f:
        lines = f.readlines()

    new_lines = []
    package_seen = False
    for line in lines:
        if line.strip().startswith("package "):
            if not package_seen:
                new_lines.append(line)
                package_seen = True
        else:
            new_lines.append(line)

    with open("policies/opa/cmk.rego", 'w') as f:
        f.writelines(new_lines)
    print("Fixed policies/opa/cmk.rego")

# policies/opa/dlp.rego:14: rego_parse_error: unexpected assign token
#  might be valid in V1, but context matters.
# Ensure  is present.
if os.path.exists("policies/opa/dlp.rego"):
    add_import("policies/opa/dlp.rego")

# policies/truth-defense.rego:318: rego_parse_error: unexpected if keyword
#  is Python ternary, not Rego.
# Rego:
if os.path.exists("policies/truth-defense.rego"):
    fix_file("policies/truth-defense.rego", [
        (r"(\w+) := (.+) if (.+) else (.+)", r"\1 := \2 { \3 } else := \4")
    ])

# policies/export.rego:68: unexpected identifier token
#
# Check for valid syntax.
