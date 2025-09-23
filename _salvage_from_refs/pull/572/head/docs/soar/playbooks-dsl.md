# Playbooks DSL

Playbooks are defined in YAML with `apiVersion`, `kind`, and `spec` fields.

## Steps
Each step declares:
- `id`: unique identifier.
- `action`: namespaced action reference.
- `params`: action inputs.
- `requiresApproval`: gate execution until approved.
- `mode`: `dry-run` or `execute`.
- `retries` and `timeout` optional.

## Approvals
Steps marked `requiresApproval: true` enter the approvals queue.
Multiple approvers can be listed.

## Dry-Run
`mode: dry-run` forces simulation.
Playbook engine also supports global dry-run default.
