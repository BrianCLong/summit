# Agent Governance for Auditors

## Status & Precedence

This document is auditor-facing and descriptive. If it conflicts with operational instructions,
follow `docs/governance/CONSTITUTION.md` → `docs/governance/AGENT_MANDATES.md` → `AGENTS.md` → local
`AGENTS.md` files.

This document explains how Summit governs autonomous and semi-autonomous agents in auditor-friendly terms.

## What Agents Are

- Deterministic task runners that operate via policy-as-code instructions.
- They perform code generation, refactoring, and evidence collection while remaining non-authoritative.

## Boundaries and Constraints

- **Non-human authority**: Agents cannot self-approve or merge; CODEOWNERS and protected branches enforce human approval.
- **Scope control**: Agents operate within defined zones (server, web, client, docs) to minimize blast radius.
- **Policy enforcement**: All agent actions are filtered through CI policies, lint/test gates, and OPA rules where applicable.
- **Secret hygiene**: Agents cannot inject or read secrets; CI blocks any secret-material changes without vault mediation.

## Detection and Accountability

- **Provenance**: Every agent run emits provenance records (who/what/when) to the ledger.
- **Diff reviewability**: Generated changes must be human-reviewable, formatted, and traced to a PR.
- **Violation detection**: CI policies fail if agents touch protected paths without approvals or if generated artifacts lack evidence links.

## Enforcement Evidence

- CI gate outputs stored under `logs/ci/pr-quality-gate` and referenced in `audit/evidence-registry.yaml`.
- Provenance ledger entries located in `audit/ga-evidence` capture agent identity, inputs, and outputs.
- Exception handling workflow ensures agents cannot extend risk acceptance windows beyond approvals.

## Auditor Takeaways

- Agents are treated as controlled automation, not decision makers.
- Every action is observable, revertible, and linked to a human approver.
- Evidence for agent compliance is produced automatically and bundled in audit packs for review.
