# Summit Documentation Index

Use this page as the fast path to the docs you need. The golden path details live in `README.md`; onboarding mirrors it with only the steps required to get productive.

## If you only have 30 minutes

- Spin up the stack: follow **[Developer Onboarding](ONBOARDING.md#-quickstart-30-minutes-to-productive)** and run `make bootstrap && make up && make smoke`.
- Run tests: `pnpm test` for the suite, `pnpm smoke` for the golden path harness.
- Skim architecture: **[ARCHITECTURE.md](ARCHITECTURE.md)** for high-level components, data stores, and boundaries.

## Getting Started

- **[README.md](../README.md)** – Single source of truth for prerequisites, golden path commands, and service endpoints.
- **[ONBOARDING.md](ONBOARDING.md)** – Day-one setup that mirrors the README without duplicating every detail.
- **[GOLDEN_PATH.md](GOLDEN_PATH.md)** – Additional context on the Investigation → Entities → Relationships → Copilot → Results workflow.

## Runbooks & Operations

- **[runbooks/INDEX.md](../runbooks/INDEX.md)** – Operational guides and incident playbooks.
- **[runbooks/dev-bootstrap.md](../runbooks/dev-bootstrap.md)** – Local stack bring-up with verification steps.
- **[runbooks/schema-migration-playbook.md](../runbooks/schema-migration-playbook.md)** – Safe database migration procedures.
- **[ops/INCIDENT_SEVERITY.md](ops/INCIDENT_SEVERITY.md)** – SEV0–SEV3 rubric with response timing and comms expectations.
- **[ops/INCIDENT_TEMPLATE.md](ops/INCIDENT_TEMPLATE.md)** – Copy/paste incident report shell for channels or tracker issues.
- **[ops/DRILL_CHECKLIST.md](ops/DRILL_CHECKLIST.md)** – Tabletop drill flow to rehearse detection, comms, and recovery.

## Security & Governance

- **[Latest Executive Briefing (2026-01-31)](executive/2026-01-31-summit-platform-briefing.md)**
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

## Research & Labs

- **[WeDLM Evaluation Note](research/wedlm.md)** – Overview of the diffusion-based WeDLM model, why it matters for Summit, and a validation plan.
- **[WeDLM Local Demo Harness](labs/wedlm/README.md)** – Hands-on steps to run the official WeDLM container, web demo, and smoke prompts.

## Archived & Historical Material

- `docs/archived/` – Historical documents retained for context; not authoritative for current workflows.
- See [`docs/archived/README.md`](archived/README.md) for archive conventions and retrieval hints.
