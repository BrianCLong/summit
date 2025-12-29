# Execution Saturation Plan for Summit

## Purpose

This document defines the concrete steps required to reach a fully saturated, gap-free planning state across code, documentation, project boards, and Linear. It is designed so a new engineer or program manager can immediately execute the backlog normalization effort without rediscovery.

## Current Constraints

- The current environment does not provide direct access to Linear, project boards, or external issue trackers. Verification of existing items must be performed by a collaborator with those permissions.
- The codebase is large and contains multiple subdomains with their own `AGENTS.md` instructions; any audit must respect those scopes when updating files.
- Recent npm tooling warnings occurred on shell startup; prefer `pnpm` workflows specified in `AGENTS.md` to avoid toolchain drift.

## Canonical Work Hierarchy

- **Roadmap Goal → Initiative → Epic → Issue → Sub-task**
- Every item must appear in Linear with ownership, priority, status, milestone, dependencies, and labels. All issues must also be placed on the appropriate board column with a clear next action.

## Roles & Ownership (initial proposal)

- **Jules (Architecture & Core Services DRI):** server, provenance, policy-as-code, auditability.
- **Amp (Frontend & Connectors DRI):** UI, connectors, ingestion adapters.
- **Codex (Docs & Standards DRI):** documentation completeness, roadmap status tracking.
- **Security Council:** compliance, regulatory policy-as-code reviews.
- **DevOps:** CI/CD, observability, release governance.

## End-to-End Saturation Procedure

1. **Repository-wide TODO harvest**
   - Run `rg --no-heading --line-number "TODO|FIXME|TBD|\bnext step\b"` from repo root.
   - Export results to `analysis/todo_harvest.csv` with columns: file, line, scope owner (from nearest `AGENTS.md`), summary, suggested parent epic.
   - Any TODO lacking context becomes a dedicated issue titled `Clarify TODO context: <file>:<line>`.
2. **Scope-aware categorization**
   - For each harvested item, map to the correct zone (server, web, client, docs, ops) per root `AGENTS.md` Parallelization Mandates.
   - Assign DRI based on zone; escalate cross-zone items to Jules for sequencing decisions.
3. **Create Linear canonical structure**
   - Initiatives: Governance/Compliance Hardening, Core Graph & Provenance, Connectors & Ingestion, AI Copilot & RAG, Observability & Operations, UX & Enablement.
   - Under each initiative, define epics that mirror existing roadmap docs (e.g., local vector store, RAG ingestion, policy-as-code engine, connector registry, copilot query service, audit log, observability). Use consistent labels: `zone/<area>`, `risk/<level>`, `ga-critical`, `agent/<DRI>`.
   - For every TODO/implicit task, create a Linear issue under the matching epic with explicit acceptance criteria, owner, priority (P0-P3), milestone (Sprint N+7 or later), and dependencies.
4. **Roadmap alignment**
   - Update `docs/roadmap/STATUS.json` and any sprint roadmap docs to reflect the initiative/epic/issue tree. Ensure 1:1 parity with Linear by including Linear issue IDs in the roadmap entries.
   - Near-term: populate current sprint and next sprint with executable issues. Mid-term: map next 2–4 milestones. Long-term: add GA hardening, scale, and governance items.
5. **Board saturation**
   - For each Linear issue, confirm it appears on the correct board: Engineering, Governance/Compliance, Infra/CI, Agent Execution. Place into the proper column (`Backlog`, `Ready`, `In Progress`, `Blocked`, `Review`, `Done`) with the next action noted in the description.
6. **Dependency & sequencing normalization**
   - Build a dependency graph: schema migrations → services → APIs → UI → docs/tests. Mark blocking issues in Linear and in board columns. Highlight critical-path items leading to GA milestones.
7. **Acceptance criteria templates**
   - Definition of Done: code merged, tests added/updated, docs updated, `docs/roadmap/STATUS.json` updated, observability checks added, security review notes logged, and no remaining TODOs in touched files.
8. **Compliance enforcement**
   - Express regulatory logic as policy-as-code; any manual exception handling requires a Security Council review issue. Log compliance decisions in the provenance ledger artifacts.
9. **Validation loop**
   - Weekly audit: rerun TODO harvest, diff against Linear to guarantee no orphaned TODOs. Use `scripts/check-boundaries.cjs` to validate zone boundaries before closing issues.

## Proposed Immediate Issue Backlog (to create in Linear)

- **Initiative: Governance & Compliance Hardening**
  - Epic: Policy-as-code engine completeness → Issue: Audit existing policies for coverage gaps; Issue: Add compliance decision logging to provenance ledger; Issue: Boundary check automation in CI.
- **Initiative: Core Graph & Provenance**
  - Epic: Immutable audit log → Issue: Verify append-only guarantees and add tamper checks; Issue: Integrate ledger events with observability pipeline.
  - Epic: Local vector store & embeddings service → Issue: Validate storage configs; Issue: Add performance benchmarks; Issue: Add fallback replicas and health checks.
- **Initiative: Connectors & Ingestion**
  - Epic: Connector registry → Issue: Inventory existing connectors; Issue: Add STIX/TAXII and RSS/Atom connectors to registry; Issue: Compliance scan for connectors.
- **Initiative: AI Copilot & RAG**
  - Epic: Copilot query service → Issue: Add evaluation harness; Issue: Add safety guardrails; Issue: Document API contracts in docs/roadmap.
- **Initiative: Observability & Operations**
  - Epic: CI/CD & release governance → Issue: Validate `pr-quality-gate.yml`; Issue: Add smoke/regression coverage to `make smoke`; Issue: Add SLOs to `slo-config.yaml`.
- **Initiative: UX & Enablement**
  - Epic: Developer docs completeness → Issue: Cross-check `docs/` against code; Issue: Add onboarding runbooks; Issue: Map golden path to new Justfile targets.

## Execution Ordering (critical path)

1. Run TODO harvest and scope categorization; export `analysis/todo_harvest.csv` and stage corresponding Linear issues.
2. Update roadmap files (`docs/roadmap/STATUS.json`, sprint kits) with new initiative/epic/issue mappings and Linear IDs.
3. Normalize board placements and dependency graph; unblock P0/P1 items tied to GA milestones.
4. Implement compliance and observability checkpoints in CI and provenance ledger.
5. Complete epic-level deliverables (vector store, ingestion, copilot, policy engine, audit log) with associated docs and tests.
6. Conduct weekly validation loop to ensure no new orphaned TODOs and parity across repo, roadmap, boards, and Linear.

## Next Actions for Collaborators with Linear/Board Access

- Create the outlined initiatives/epics/issues in Linear with the specified ownership and labels.
- Mirror the same structure on the Engineering, Governance/Compliance, Infra/CI, and Agent Execution boards.
- Backfill existing roadmap documents with Linear IDs and status, ensuring parity with the issue hierarchy.
