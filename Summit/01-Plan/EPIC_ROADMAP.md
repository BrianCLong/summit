## Feature-to-epic mapping (what to build first to win the next 5 deals)

### Deal-winning capabilities → Epics (in build order)

**1) Trustworthy Automation (the core wedge)**

* EPIC: Action Catalog + Approvals + TTL
* EPIC: Policy Simulation Preflight (“would allow/deny”)
* EPIC: Signed ActionRunReceipt + redaction rules
  **Why first:** fastest “holy crap” demo; easy to attach to existing stacks.

**2) Runs UI (mission-critical credibility)**

* EPIC: Workflow Runs UI (timeline/state/retries/compensation)
* EPIC: WorkflowRunReceipt (hash chain + policy trace)
* EPIC: Stuck-run detection + runbooks
  **Why:** stops the “but what happens when it fails?” objection.

**3) Golden 20 Connectors (parity gate)**

* EPIC: Connector SDK (schemas, idempotency, replay, DLQ/backfill)
* EPIC: Golden 5 first (Okta/AAD, GitHub, Jira, Docs, Cloud)
* EPIC: Usage metering per connector + permission-safe ingest
  **Why:** connector coverage is the #1 “we can’t buy yet” blocker.

**4) Governance Explorer (exec + auditor confidence)**

* EPIC: Catalog Explorer (search/browse/request access)
* EPIC: “Why access?” + exportable AccessDecisionReceipt
* EPIC: Lineage (biz + tech) stitched from connector provenance
  **Why:** makes the system usable outside engineering.

**5) Compliance Pack v1 (procurement accelerator)**

* EPIC: Controls → continuous checks → exceptions workflow
* EPIC: Evidence bundle export (EvidenceBundleManifest)
* EPIC: Auditor verification view
  **Why:** turns “platform” into “audit-ready product.”

**6) FinOps cockpit (margin + SaaS readiness)**

* EPIC: Per-tenant cost attribution pipeline
* EPIC: Unit economics dashboard + budgets/alerts
* EPIC: CostAttributionReceipt
  **Why:** differentiates hosted/white-label and protects unit economics.

### Minimum “win kit” (ship this before broad expansion)

* Action Catalog + Approvals + Receipts
* Runs UI + Workflow receipts
* Golden 5 connectors + connector SDK
* Governance “Why access?” export
* Evidence bundle export v1
