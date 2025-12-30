# Roadmap Parity Execution Plan

This plan establishes a repeatable path to reach full saturation across code, documentation, roadmaps, boards, and Linear. It assumes local repository access but no direct automation against external systems; synchronize to Linear/boards manually or via existing org connectors.

## Objectives

- Inventory every TODO/FIXME/implicit work item in the repo and convert each into a structured issue.
- Align every issue under a canonical hierarchy: Roadmap Goal → Initiative → Epic → Issue → Sub-task.
- Achieve parity across repo artifacts, Linear, and project boards with clear ownership, priority, status, dependencies, and milestones.

## Roles & Ownership

- **Execution Lead (Primary)**: Delivery/program manager responsible for end-to-end tracking and governance updates.
- **Domain Leads (Supporting)**: Server, Web, Data/Infra, Security/Compliance leads provide scoping and acceptance criteria per item.
- **Automation Steward**: Maintains inventory scripts and ensures outputs stay current in CI.

## Phase 1 — Repository Work Discovery

1. Run the TODO inventory script to capture explicit TODO/FIXME markers and implied follow-ups.
   - `python scripts/todo_inventory.py --root . --output tmp/todo-inventory.json`
2. Spot-check high-churn directories (server/, services/, packages/, docs/) for architectural or process gaps not marked as TODO.
3. Record security/compliance notes (see `SECURITY/`, `COMPLIANCE_*` files) as separate issues rather than inline TODOs.

## Phase 2 — Normalization & Classification

1. Normalize findings into the canonical hierarchy:
   - **Roadmap Goal**: Strategic outcomes from `GA_PROMOTION_PLAN.md`, `LAUNCH_SCOPE.md`, `SPRINT_INDEX.md`.
   - **Initiative**: Cross-cutting programs (e.g., Data Integrity, Copilot UX, Governance Automation).
   - **Epic**: Deliverable scopes within initiatives (feature verticals, infra upgrades).
   - **Issue/Sub-task**: Executable units mapped 1:1 with code/doc TODOs.
2. Tag each item with domain labels (Server/Web/Infra/Security/Docs), risk, GA relevance, and ownership.
3. Define dependencies explicitly (e.g., migrations before API exposure; API before UI integration).

## Phase 3 — Linear & Board Parity

1. Create/verify Linear items for every normalized issue; enforce parent-child links to initiatives/epics.
2. Place each item on the correct board column with a clear next action ("In Discovery", "Ready", "In Progress", "Blocked", "Review", "Done").
3. Mirror status changes back to the repo by updating the generated inventory artifact and cross-links in relevant docs (no TODOs left untracked).

## Phase 4 — Governance & Quality Gates

1. Apply compliance guidance from `AGENTS.md`, `SECURITY_MITIGATIONS.md`, and `COMPLIANCE_*` files as acceptance criteria for relevant items.
2. Enforce codebase boundaries (`scripts/check-boundaries.cjs`) before marking issues ready for review.
3. Run CI gates defined in `docs/CI_STANDARDS.md`; green CI is required before moving cards to "Done".

## Phase 5 — Ongoing Drift Prevention

1. Schedule a daily cron to run the TODO inventory script; publish the JSON to an internal dashboard and trigger alerts on deltas.
2. During code review, block new TODO/FIXME entries unless accompanied by a created Linear issue link.
3. Reconcile inventory and boards weekly; archive resolved items and verify no orphaned work remains.

## Deliverables per Item

- **Title/Description**: Actionable, outcome-focused, includes context from source file.
- **Acceptance Criteria**: Testable conditions, security/compliance checks, CI command(s) to verify.
- **Ownership**: Named lead and reviewer.
- **Priority/Milestone**: Based on GA dependencies from `GA_PROMOTION_PLAN.md` and `LAUNCH_SCOPE.md`.
- **Dependencies**: Listed explicitly; blocked items stay in a blocked column with a pointer to the blocker.

## Automation Assets

- `scripts/todo_inventory.py` generates a machine-readable inventory for ingestion into Linear/board tooling.
- Store outputs under `tmp/` (git-ignored) or an artifacts bucket; do not check generated inventories into the repo.

## Next Action Checklist (for the execution lead)

- [ ] Run the inventory script and export to Linear import format.
- [ ] Build the Roadmap Goal → Initiative → Epic scaffold aligned to GA milestones.
- [ ] Backfill every TODO-derived issue with owner/priority/dependencies and place on boards.
- [ ] Enable the daily cron/CI job to detect new TODOs and enforce linkage.
- [ ] Review weekly for drift and compliance adherence.
