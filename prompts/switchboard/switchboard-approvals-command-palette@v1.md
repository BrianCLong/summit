# Prompt: Switchboard Approvals + Command Palette Delivery Pack

## Objective
Deliver a policy-gated Approvals + Command Palette vertical slice pack with API contracts, policy bundle, receipt schema, operability, and runbooks for Switchboard.

## Required Outputs
- Sprint plan updates with demo spine, risks, and DoD.
- OAS3 spec for commands/approvals/timeline/receipts/policy simulation.
- OPA policy bundle + tests.
- Decision-policy versioning entry.
- Receipt schema + example receipt.
- Architecture documentation with MAESTRO alignment.
- Operability pack: dashboards, alerts, runbooks.
- Roadmap status update.

## Constraints
- Default-deny policy.
- Receipts are signed and verifyable.
- Use idempotency keys for execute/decide.
- All outputs must be aligned to the Summit Readiness Assertion.

## Allowed Paths
- sprint/sprint-next-switchboard-approvals-command-palette.md
- openapi/switchboard-approvals-command-palette.yaml
- opa/policies/switchboard.rego
- opa/policies/switchboard_test.rego
- packages/decision-policy/policy.switchboard.v1.yaml
- provenance/receipt_schema_switchboard_v0_1.json
- provenance/examples/switchboard-receipt.example.json
- docs/switchboard/
- grafana/dashboards/switchboard-approvals.json
- grafana/alerts/switchboard-approvals-alerts.yaml
- RUNBOOKS/switchboard-*.md
- docs/roadmap/STATUS.json
- prompts/switchboard/switchboard-approvals-command-palette@v1.md
- prompts/registry.yaml
- agents/examples/SWITCHBOARD_APPROVALS_COMMAND_PALETTE_SPRINT_NEXT_20260206.json
