Owner: Governance
Last-Reviewed: 2026-03-11
Evidence-IDs: EVD-GOV-001
Status: active

# Summit Governance & Contribution Specification

Welcome to the Summit governance and contribution specifications. This document outlines the governance model, contribution guidelines, PR review processes, branching strategies, code ownership, and decision-making frameworks that ensure the security, reliability, and velocity of the Summit platform.

## 1. Golden Main Definitions

The `main` branch is the **Golden Main**—the definitive, auditable, and constantly deployable state of the repository.

- **Deployable-First**: The `main` branch must always be deployable. Direct commits to `main` are strictly prohibited.
- **Evidence-Backed**: Every change entering `main` must carry deterministic evidence validating the change.
- **Continuous Compliance**: `main` must constantly satisfy all security, performance, and governance checks defined in `docs/SUMMIT_READINESS_ASSERTION.md`.

## 2. Contribution Guidelines

We welcome contributions from human engineers and specialized AI agents. All contributors must follow these strict guidelines:

- **Atomic PRs**: One conceptual change per Pull Request.
- **Conventional Commits**: Commit messages must adhere to the Conventional Commits standard (e.g., `feat: ...`, `fix: ...`, `docs: ...`).
- **Secret Hygiene**: Zero tolerance for secrets in code or history. Use credential helpers and `.env` files exclusively.
- **Issue Tracking**: Branch names must follow `type/scope/description` (e.g., `feat/ingest/add-rss-connector`).

### Co-Authoring & AI Agent Contributions

- AI agents are treated as contributors and must adhere strictly to `AGENTS.md`.
- Changes generated with AI assistance must include `Co-authored-by` trailers in commit messages.
- AI contributors like "Jules" operate within specific, bounded surfaces.

## 3. Pull Request Review Process

Every PR must be reviewed and pass strict Continuous Integration (CI) gates before merging.

### Required CI Checks
- **Fast Lane**: Linting and Unit tests (`pnpm test`) — blocking.
- **Golden Path**: Full stack integration and smoke tests (`make smoke`) — blocking.
- **Security**: SAST, DAST, and Secret Scanning — blocking.
- **Governance Integrity**: `pnpm ci:docs-governance` and other governance assertions — blocking.

### Review and Merge Rules
- **Peer Review**: At least one approved review from an authorized Code Owner is required.
- **Evidence Bundle**: A complete evidence bundle proving the change's validity must be attached to the PR.
- **Commander's Intent**: PR descriptions must detail the security or functional gap closed.

## 4. Branching Strategy

Our branching model minimizes drift and protects the Golden Main.

- `main`: The heavily protected, always-deployable Golden Main.
- `feat/`, `fix/`, `docs/`: Short-lived work branches. Must be frequently rebased onto `main`.
- `release/vX.Y`: Stabilization branches for upcoming deployments. Only cherry-picked fixes are permitted.
- `hotfix/<issue>`: Emergency branches cut directly from `main` and cherry-picked into active releases.

## 5. Release Cadence

Summit operates on a structured, predictable release train:

- **Release Cadence**: Weekly staging cut every Tuesday at 18:00 UTC.
- **Production Deployments**: Every other Thursday after a mandatory 48-hour soak period and a green merge train.
- **Release Captain**: The automated Release Captain ("Jules") manages merge trains, tagging, and orchestrates release freezes during active incidents.

## 6. Code Ownership and Accountability

Summit uses a distributed, declarative ownership model driven by `CODEOWNERS` and directory-level RACI policies.

- **Platform Engineering**: Accountable for CI/CD, infrastructure, and core gates.
- **Security Council**: Consulted on all architectural changes and accountable for security assertions.
- **Governance**: Accountable for policy-as-code and documentation integrity.

### Governance Approvals
Major architectural or risk-altering changes are routed to the "Council of Solvers" (a set of specialized AI agents and core maintainers) for final approval.

## 7. Decision-Making & Reconciliation Policies

Decisions in the Summit ecosystem favor **Provenance over Prediction**.

- **Architectural Changes**: Require an Architecture Decision Record (ADR) in `docs/adr/`. When decisions evolve, ADRs are marked "Superseded," not deleted.
- **Reconciliation**: If a conflict or stalled recovery occurs, decisions are escalated to the designated Tab Allocation Matrix lane owner.
- **Archival Discipline**: Deprecated features or stale investigations must be formally archived, never silently deleted, preserving institutional memory and compliance auditability.

## 8. Incident Response and Exceptions

During incidents, the standard governance model adapts:
- Release Captain freezes all non-essential merge trains.
- Exceptions to governance rules must be logged strictly in `docs/governance/EXCEPTION_REGISTER.md` with cryptographic/immutable evidence.

---
*For canonical rules regarding Summit governance, refer to this document and its associated specifications in `docs/governance/`.*
