# Governed Geo-Intelligence UX & Analytics Roadmap (ELITE-Inspired, Harm-Aware)

## 0) Readiness posture and governance anchors

Summit is **READY** for controlled deployment under the Summit Readiness Assertion; any
capability gaps are governed exceptions, not defects. This roadmap extends the current platform
without copying abusive patterns, and explicitly anchors every workflow to policy-as-code,
provenance, and auditable decision receipts.

**Authority files:**

- `docs/SUMMIT_READINESS_ASSERTION.md`
- `docs/governance/CONSTITUTION.md`
- `docs/governance/META_GOVERNANCE.md`
- `docs/switchboard-delivery-brief.md`

## 1) Product patterns to adopt (with verifiable safeguards)

### 1.1 GeoCanvas v1 (map-first, evidence-first)

**Purpose:** A geospatial canvas where entities/events render as pins or tiles with filterable
criteria panes. The map is a _view_ of evidence, not the source of truth.

**Governed upgrades:**

- Every pin must show **why it exists**: sources, timestamps, and confidence drivers.
- Evidence provenance is a required UI section (default expanded for sensitive entities).
- Conflicts are surfaced inline (e.g., “two sources disagree on address”).

### 1.2 Dossier Composer (modular entity cards)

**Purpose:** Click pin → open a dossier built from composable modules.

**Modules (v1):**

- Identity
- Relationships
- Timeline
- Geo history
- Documents
- Communications
- Risks
- Provenance

**Governed upgrades:**

- Field-level lineage and authority binding shown in each module.
- “Show Evidence” always available (no hidden provenance).

### 1.3 Lasso/polygon multi-select → batch actions

**Purpose:** Select multiple entities via polygon/lasso and perform batch actions.

**Allowed batch actions (v1):**

- Create case bundle
- Generate briefing
- Run policy checks
- Queue tasks to Maestro

**Governed upgrades:**

- All batch actions flow through OPA/ABAC gates and immutable audit logs.
- Bulk actions require explicit purpose tags; sensitive joins require step-up approvals.

## 2) Scoring patterns (explainable by default)

### 2.1 Confidence Engine for address/location inference

**Purpose:** Replace opaque 0–100 scores with explainable calibration objects.

**Score object (v1):**

- Score + uncertainty band
- Top contributing evidence (recency, corroboration, reliability weights)
- Contradictions surfaced
- “What would change the score” prompts

**Governed upgrades:**

- Score lineage is preserved in the provenance ledger.
- Every score is reproducible from the evidence snapshot.

### 2.2 Entity Resolution (ER) Workbench

**Purpose:** Make entity resolution a first-class workflow.

**Features:**

- Merge/split proposals
- Reversible merges
- Provenance diffing
- Identity lineage graph

**Governed upgrades:**

- ER actions are policy-gated and auto-log decision receipts.
- “Merge rationale” is mandatory for human reviewers.

## 3) Data integration patterns (contract-first, policy-bound)

**Connector contract (required fields):**

- Schema mapping
- Retention rules
- Legal basis tags
- Sensitivity labels
- Transformation history

**Source-of-truth arbitration:**

- Prefer newer, higher-quality, corroborated evidence
- Never silently override conflicting sources
- Always expose arbitration rules in the dossier

## 4) Workflow orchestration (lead → approve → execute)

**Pipeline (v1):**

1. Candidate leads (machine suggestions)
2. Human review + justification
3. Supervisor approval (if policy requires)
4. Tasking / operations
5. After-action capture + outcomes

**Governed upgrades:**

- Store outcomes to measure error rates and reduce false positives.
- “Decision receipts” are immutable, exportable evidence bundles.

## 5) Defensive differentiators (Summit’s trust moat)

### 5.1 Purpose limitation + least privilege

- ABAC + purpose binding required for all sensitive access.
- Search does not unlock bulk export.

### 5.2 Sensitive-data tripwires

- Health, biometrics, minors, and other sensitive classes require escalation prompts.
- Justification is mandatory and logged.

### 5.3 Abuse monitoring

- Detect repeated geofence sweeps or excessive bulk selection.
- Oversight dashboards report suspicious access patterns.

## 6) Epic backlog (v1 → v1.1)

### Initiative G: Governed Geo-Intelligence

**G1: GeoCanvas v1**

- Map layer + filters
- Polygon select
- Entity card drawer

**G2: Dossier Composer**

- Schema-driven modules
- Graph-backed data source
- Field-level provenance rendering

**G3: Confidence Engine**

- Address inference with explainability
- Calibration tests
- Contradiction surfacing

**G4: Provenance Ledger Enhancements**

- Field-level lineage mapping
- Decision receipts (immutable exports)

**G5: Policy Gates**

- OPA policies for bulk actions, sensitive joins, exports
- Step-up approval workflows

**G6: Oversight Analytics**

- Abuse detection dashboards
- Policy decision trend analysis

## 7) Evidence & verification plan

**Required artifacts:**

- OPA decision logs for batch actions
- Immutable audit logs for ER merges/splits
- Evidence bundles for decision receipts

**Golden Path checks (v1):**

- Policy evaluation enforced at action time
- Provenance displayed on every dossier field
- Decision receipts exportable and reproducible

## 8) Governed exceptions

Any deviations from the above requirements are **Governed Exceptions** and must be logged in
accordance with policy-as-code requirements and recorded with explicit reviewers.
