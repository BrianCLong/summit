import sys

filepath = 'docs/api-spec.yaml'
with open(filepath, 'r') as f:
    lines = f.readlines()

new_lines = []
has_contact = False
tags_inserted = False

for line in lines:
    # 1. Info Contact
    if "description: API for IntelGraph Summit" in line and not has_contact:
        new_lines.append(line)
        new_lines.append("  contact:\n    name: API Support\n    email: support@example.com\n")
        has_contact = True
        continue

    # 2. Global Tags (before paths)
    if line.startswith("paths:") and not tags_inserted:
        tags_block = """tags:
  - name: Observability
    description: Monitoring and health checks
  - name: Tenancy
    description: Tenant management
  - name: Policy
    description: Policy simulation and checks
  - name: Export
    description: Evidence export
  - name: Receipts
    description: Receipt verification
  - name: Maestro
    description: Orchestration engine
"""
        new_lines.append(tags_block)
        new_lines.append(line)
        tags_inserted = True
        continue

    # 3. Operations

    if "summary: Create a new tenant" in line:
        new_lines.append("      operationId: createTenant\n")
        new_lines.append("      description: Create a new tenant with specified tier and policy profile.\n")
        new_lines.append(line)
        continue

    if "summary: List tenants (Admin only)" in line:
        new_lines.append("      operationId: listTenants\n")
        new_lines.append("      description: Retrieve a list of all tenants.\n")
        new_lines.append(line)
        continue

    if "summary: Simulate a policy decision (Preflight)" in line:
        new_lines.append("      operationId: simulatePolicy\n")
        new_lines.append("      description: Simulate a policy decision for a given subject and action.\n")
        new_lines.append(line)
        continue

    if "summary: Create an Intel Bundle export" in line:
        new_lines.append("      operationId: createEvidenceBundle\n")
        new_lines.append("      description: Create a new evidence bundle for export.\n")
        new_lines.append(line)
        continue

    if "summary: Get a signed receipt by ID" in line:
        new_lines.append("      operationId: getReceipt\n")
        new_lines.append("      description: Retrieve a specific receipt by ID.\n")
        new_lines.append(line)
        continue

    new_lines.append(line)

with open(filepath, 'w') as f:
    f.writelines(new_lines)
