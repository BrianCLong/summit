---
title: Summit Documentation Index
summary: Canonical index for contract-grade public documentation.
version: 2025.12
lastUpdated: 2025-12-27
owner: documentation
status: public
---

# Summit Documentation Index

## Documentation Contract Summary

**Guarantees**

- Links listed in this index point to contract-grade public or semi-public docs.
- Archived content is labeled and excluded from contractual claims.

**Not Guaranteed**

- Exhaustive coverage of every internal, draft, or experimental document.
- Future roadmap commitments beyond published release notes.

**Conditional**

- Contract-grade status applies only to documents listed in the Public Documentation Registry.

**Out of Scope**

- Internal planning artifacts, archived documents, and experimental drafts.

**Failure Modes**

- If a linked document is missing or deprecated, consult the Public Documentation Registry and change log.

**Evidence Links**

- [Public Documentation Registry](contracts/public-docs-registry.md)
- [Documentation Change Log](contracts/documentation-change-log.md)
- [Documentation Contract Policy](governance/documentation-contract-policy.md)

Use this page as the fast path to the docs you need. The golden path details live in `README.md`; onboarding mirrors it with only the steps required to get productive.

## If you only have 30 minutes

- Spin up the stack: follow **[Developer Onboarding](ONBOARDING.md#-quickstart-30-minutes-to-productive)** and run `make bootstrap && make up && make smoke`.
- Run tests: `pnpm test` for the suite, `pnpm smoke` for the golden path harness.
- Skim architecture: **[ARCHITECTURE.md](ARCHITECTURE.md)** for high-level components, data stores, and boundaries.

## Getting Started

- **[README.md](../README.md)** – Single source of truth for prerequisites, golden path commands, and service endpoints.
- **[ONBOARDING.md](ONBOARDING.md)** – Day-one setup that mirrors the README without duplicating every detail.
- **[GOLDEN_PATH.md](GOLDEN_PATH.md)** – Additional context on the Investigation → Entities → Relationships → Copilot → Results workflow.

## Documentation Governance (Contract-Grade)

- **[Public Documentation Registry](contracts/public-docs-registry.md)** – Authoritative list of public and semi-public docs.
- **[Contract Matrix](contracts/public-documentation-contract-matrix.md)** – Claims mapped to guarantees and exclusions.
- **[Documentation Contract Policy](governance/documentation-contract-policy.md)** – Review, approval, and versioning rules.
- **[Documentation Change Log](contracts/documentation-change-log.md)** – Material change history.

## Runbooks & Operations

- **[RUNBOOKS/INDEX.md](../RUNBOOKS/INDEX.md)** – Operational guides and incident playbooks.
- **[RUNBOOKS/dev-bootstrap.md](../RUNBOOKS/dev-bootstrap.md)** – Local stack bring-up with verification steps.
- **[RUNBOOKS/schema-migration-playbook.md](../RUNBOOKS/schema-migration-playbook.md)** – Safe database migration procedures.

## Security & Governance

- **[SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md)** – Security posture and privacy controls.
- **[AI_GOVERNANCE_AGENT_FLEET.md](AI_GOVERNANCE_AGENT_FLEET.md)** – AI governance framework, agent fleet management, and incident response procedures.
- **[COMPLIANCE.md](COMPLIANCE.md)** and **[DATA_RETENTION_POLICY.md](DATA_RETENTION_POLICY.md)** – Compliance, retention, and auditing references.
- **[CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md)** – Expected behavior and reporting channels.

## Communications

- **[Communications Playbook](./communications/communications-playbook-execution-layer.md)** - The canonical communications standard for Summit/Intelgraph.

## Product & Architecture References

- **[RFI_CAPABILITIES_SUMMARY.md](RFI_CAPABILITIES_SUMMARY.md)** – RFI-ready capabilities summary with metrics and differentiators.
- **[ARCHITECTURE.md](ARCHITECTURE.md)** – Core components, data flows, and dependencies.
- **[DATA_MODEL.md](DATA_MODEL.md)** – Graph schema and storage expectations.
- **[DEPLOYMENT.md](DEPLOYMENT.md)** and **[README-DEPLOY.md](README-DEPLOY.md)** – Deployment topologies and environment guidance.
- **[ROADMAP.md](ROADMAP.md)** – Current objectives and sequencing (historical plans live under `docs/archived/`).
- **[suite_unification_architecture.md](suite_unification_architecture.md)** – Blueprint for unifying modules, contracts, identity, billing, UX shell, and governance into a cohesive suite.

## Archived & Historical Material

- `docs/archived/` – Historical documents retained for context; not authoritative for current workflows.
- See [`docs/archived/README.md`](archived/README.md) for archive conventions and retrieval hints.
