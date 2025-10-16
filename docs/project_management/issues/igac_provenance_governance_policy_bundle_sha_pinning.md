# Codex Task: IGAC/Provenance Governance – Policy Bundle SHA Pinning

**Priority:** P1  
**Labels:** `governance`, `security`, `policy`, `codex-task`

## Desired Outcome

Policy bundle SHA pinning baked into release workflows with validation gates.

## Workstreams

- Define governance requirements for policy bundle versioning, signing, and release approvals.
- Implement tooling to pin policy bundle SHAs in CI/CD pipelines with automated verification.
- Extend provenance ledger to record bundle metadata, change history, and release provenance.
- Provide documentation and training for release managers and security stakeholders.

## Key Deliverables

- Governance specification outlining pinning rules, exception handling, and audit trails.
- CI/CD integrations (GitHub Actions, deployment scripts) enforcing SHA pinning with policy checks.
- Provenance ledger updates and dashboards exposing bundle lineage and deployment state.
- Release process documentation and enablement sessions.

## Acceptance Criteria

- All production releases reference immutable policy bundle SHAs enforced by automated gates.
- Governance audits can trace bundle changes with complete provenance records.
- Exception workflows documented with approval records in governance system.

## Dependencies & Risks

- Alignment with Policy & Security Hardening for bundle content readiness.
- Coordination with DevOps for CI/CD integration and rollout.
- Potential friction from teams needing expedited hotfixes; requires exception guardrails.

## Milestones

- **Week 1:** Finalize governance specification and stakeholder alignment.
- **Week 2-3:** Build/enforce SHA pinning automation and ledger updates.
- **Week 4:** Pilot in staging releases, gather feedback, adjust policies.
- **Week 5:** Roll out to production release workflow with training completion.
