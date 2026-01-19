# Backlog: Gap Closure Epics

This document defines the high-level epics required to close the competitive gaps identified in the [Gap Register](../competitive-analysis/GAP_REGISTER.md).

## Epic 1: Connector SDK + "Golden 20" Reliability (P0)

**Description:** Build the foundation for reliable, permission-aware data ingestion with full lineage and provenance.

- **Acceptance Criteria:**
  - [ ] Connector SDK v1 shipped with versioned schemas, idempotency keys, and replay support.
  - [ ] "Golden 20" connectors migrated to SDK v1.
  - [ ] Permission-respecting ingest with least-privilege scopes.
  - [ ] Every ingest event emits: **lineage + policy context + signed receipt**.
- **Receipt Requirements:** Signed JWS receipt per ingest batch; hash of source data included in receipt.

## Epic 2: Switchboard IDP-grade Portal (P0)

**Description:** Evolve Switchboard from a static dashboard to a functional service and entity catalog.

- **Acceptance Criteria:**
  - [ ] Service/entity catalog with owners, tiers, dependencies, and SLOs.
  - [ ] Scorecards w/ rules + evidence + exceptions + rollups.
  - [ ] Self-service action catalog with approvals and simulation.
  - [ ] “Templates” marketplace: workflows + policies + dashboards + runbooks.
- **Receipt Requirements:** Policy decision trace for every catalog action; signed attestation for scorecard evidence.

## Epic 3: Workflow Durability + Visibility Tooling (P0)

**Description:** Provide industrial-grade visibility into Maestro orchestration runs.

- **Acceptance Criteria:**
  - [ ] Workflow run debugger: timeline, steps, retries, compensation, inputs/outputs.
  - [ ] Deterministic replay with policy decision trace attached.
  - [ ] Stuck-run detection + auto-remediation runbooks.
  - [ ] SLO dashboards for orchestration latency and failure rates.
- **Receipt Requirements:** Merkle tree of workflow step outputs signed upon completion.

## Epic 4: Non-Engineer Governance UX (P1)

**Description:** Simplify the governance primitives into user-friendly "product" surfaces.

- **Acceptance Criteria:**
  - [ ] Catalog Explorer with search, browse, and "request access" flows.
  - [ ] Technical and business lineage views.
  - [ ] UI for managing data classification and retention policies.
  - [ ] Evidence export tool for "why access" questions.
- **Receipt Requirements:** Signed bundle of all evidence relevant to a specific access or data request.

## Epic 5: Compliance Trust Pack (P1)

**Description:** Package existing audit and policy capabilities for auditors.

- **Acceptance Criteria:**
  - [ ] Continuous controls mapped to automated evidence checks.
  - [ ] Auditor-friendly evidence bundle export.
  - [ ] Control exceptions workflow with expiry and approvals.
  - [ ] Partner-facing Status/Trust page.
- **Receipt Requirements:** Daily signed "State of the Union" digest of all compliance controls.

## Epic 6: Permission-Aware AI + Policy-Bound Agents (P1)

**Description:** Ensure AI agents operate strictly within the defined policy fabric.

- **Acceptance Criteria:**
  - [ ] AI retrieval cites sources and attaches signed receipts to citations.
  - [ ] Every agent action requires policy preflight and human-in-command gates.
  - [ ] “Explain why” pane for agent plans and actions.
- **Receipt Requirements:** Signed preflight check result included in the agent's action log.

## Epic 7: FinOps Cockpit Polish (P2)

**Description:** Drive operational efficiency through transparent cost attribution.

- **Acceptance Criteria:**
  - [ ] Per-tenant cost attribution ≥95% accuracy.
  - [ ] Unit economics dashboard: cost per workflow run / seat / ingest unit.
  - [ ] Budgets, alerts, and showback/chargeback exports.
- **Receipt Requirements:** Cost-basis receipt per orchestration run, signed by the billing service.
