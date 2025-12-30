# Prompt: Sprint 27 — Governance Fabric (Policy + Audit + Disclosure)

## Intent

Codify the planning brief and governance guardrails for Sprint 27 ("Governance Fabric: Policy + Audit + Disclosure"). The prompt ensures all deliverables are policy-enforced, auditable, and export-ready, aligning runtime behavior with compliance evidence.

## Scope

- Artifacts: sprint plan documents, roadmap status updates, sprint index entries, and agent run records.
- Domains: governance, compliance, observability, export controls, disclosure packaging.
- Operations: create/edit only; no deletions of historical artifacts.

## Success Criteria

- Sprint plan captures objective, epics, acceptance criteria, and evidence depot layout.
- Roadmap status reflects the sprint focus (policy enforcement, audit readiness, disclosure packaging).
- Sprint index references the new plan for discovery.
- Agent metadata and execution artifacts link prompt hash, task scope, and verification expectations.

## Guardrails

- Preserve historical sprint records; append rather than overwrite.
- Keep policy logic expressed as policy-as-code references (no ad-hoc compliance handling elsewhere).
- Traceability: every sensitive decision recorded with prompt hash, task id, and declared scope.

## Verification

- Tier B minimum: documentation lint/format checks and metadata validation where applicable.
- Evidence: updated roadmap status, sprint index entry, sprint plan, and agent-run artifact.

## Exit

- Sprint plan merged with cross-links to evidence directories.
- Roadmap and metadata changes align with declared scope paths.
