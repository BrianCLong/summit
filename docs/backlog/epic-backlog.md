# Epic Backlog (with acceptance tests + receipt requirements)

### EPIC 1 — Connector Foundry + Golden 20 (P0)

**Scope:** Connector SDK (schemas, idempotency, replay, DLQ, backfill), plus 20 priority connectors.
**Acceptance tests (demoable):**

- Connect Okta/AAD + GitHub + Jira + Drive/SharePoint; ingest entities; search works; permissions enforced.
- Replay a failed ingest from DLQ; results identical (idempotent).
  **Receipt requirements:**
- Every ingest batch emits **IngestReceipt** (source, scopes, cursor, counts, errors, policy decision, signature).
- Every entity edge includes **provenance pointers** (source object IDs + time).

---

### EPIC 2 — Switchboard Portal Core (Catalog + Ownership) (P0)

**Scope:** entity/service catalog, ownership, tiers, search, tags, relationships.
**Acceptance tests:**

- “Create service” template → catalog entry + owner + tier + required controls auto-created.
- Owner handoff triggers audit log + receipt.
  **Receipt requirements:** **CatalogChangeReceipt** for create/update/transfer with policy decision + rationale.

---

### EPIC 3 — Self-Service Actions + Approvals (P0)

**Scope:** action catalog, RBAC/ABAC gates, manual approvals, TTL, run logs.
**Acceptance tests:**

- Developer requests “provision preview env” → approval required if prod-linked → TTL auto-destroys → run logs visible.
- Policy simulation shows “would allow/deny” before execution.
  **Receipt requirements:** **ActionRunReceipt** (inputs redacted by policy, approvals chain, TTL outcome, artifacts produced).

---

### EPIC 4 — Workflow Engine Observability (“Runs UI”) (P0)

**Scope:** workflow debugger, retries/compensation visibility, stuck detection, replay.
**Acceptance tests:**

- Force a step failure; show retry timeline; show compensation; show “why” (policy decision trace).
- Replay produces identical outcomes (or flagged nondeterminism).
  **Receipt requirements:** **WorkflowRunReceipt** (state transitions + policy traces + outputs hash chain).

---

### EPIC 5 — Governance Explorer (Lineage + “Why Access”) (P1)

**Scope:** lineage views (biz+tech), catalog explorer for governed entities, access request + reason.
**Acceptance tests:**

- Click “Why does Alice have access?” → policy evaluation + attributes + lineage evidence shown; export bundle.
- Retention policy blocks viewing of expired artifacts; redaction applied.
  **Receipt requirements:** **AccessDecisionReceipt** exportable (selective disclosure supported).

---

### EPIC 6 — Compliance Trust Pack (SOC2-lite → expand) (P1)

**Scope:** control mappings, continuous checks, evidence bundle exports, exceptions workflow, trust-center view (optional).
**Acceptance tests:**

- Generate “Q1 evidence bundle” in one click; includes checks, exceptions, and approvals.
- Auditor role can verify signatures and hashes.
  **Receipt requirements:** **EvidenceBundleManifest** + per-control **ControlCheckReceipt**.

---

### EPIC 7 — Permission-Aware Answers + Policy-Bound Agents (P1)

**Scope:** retrieval with citations, policy-gated tools, human approvals, audit trail.
**Acceptance tests:**

- Ask: “Who approved vendor X?” → answer cites system records; click-through to receipts.
- Agent attempts destructive action → blocked by policy, shows reason, suggests safe alternative.
  **Receipt requirements:** **AnswerReceipt** (sources, permissions snapshot, citations, model/tool versions, redactions).

---

### EPIC 8 — FinOps Cockpit + Tenant Cost Attribution (P2)

**Scope:** per-tenant cost attribution, unit economics dashboards, budgets/alerts, showback exports.
**Acceptance tests:**

- Attribute a cost spike to a tenant’s workflow volume; drill down to run IDs.
- Export chargeback CSV with receipts.
  **Receipt requirements:** **CostAttributionReceipt** (inputs, allocation model version, confidence score).

---

### EPIC 9 — Enterprise Admin + Packaging (P0/P1 enabler)

**Scope:** bulk ops, retention/legal hold, DR drill evidence, upgrade playbooks, white-label pack.
**Acceptance tests:**

- Run restore drill → RPO/RTO evidence produced.
- Tenant deletion requires dual control; purge manifest verifiable.
  **Receipt requirements:** **DeletionManifest**, **DRDrillReceipt**, **UpgradeReceipt**.
