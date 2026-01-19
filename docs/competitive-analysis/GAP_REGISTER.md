# Gap Register: Summit (IntelGraph) Competitive Parity

This is a living document tracking the gaps between Summit and its primary competitors, defined at the level of buyer outcomes and operational readiness.

## Tracking Framework

Each gap is defined as:
**Buyer outcome → Product capability → Proof → Packaging → Cost/Security**

For every item, we track:

- **Competitor baseline:** What “good” looks like in the market.
- **Our current:** Current status (0–5).
- **Target:** Date + release version.
- **Acceptance tests:** Demoable criteria.
- **Policy coverage:** OPA/ABAC coverage % on flows.
- **Receipt/provenance:** 100%? Selective disclosure?
- **Operability:** SLO, dashboards, runbook.
- **Unit economics impact:** COGS delta.

---

## 1. Connector Coverage + Reliability (P0)

**Outcome:** Trust that the platform can ingest any enterprise data source reliably and securely.
**Capability:** Golden 20 connectors + Connector SDK.

- **Competitor baseline:** Maltego (dozens of transforms), Palantir (Foundry Data Connection).
- **Our current:** 2/5 (17+ connectors exist but lack standardized SDK v1 features).
- **Target:** Sprint 3 (GA v1.1).
- **Acceptance tests:** Connect Google Drive + GitHub + Jira + Okta; show an entity’s lineage and access control with receipts.
- **Policy coverage:** 100% of ingest events filtered by OPA.
- **Receipt/provenance:** 100% (Signed receipt for every event).
- **Operability:** DLQ monitoring, backfill progress bars, heartbeat SLOs.
- **Unit economics impact:** Increased storage for lineage metadata (+5%).

## 2. Switchboard IDP-grade Portal (P0)

**Outcome:** Platform team can manage all internal services and entities in a single, authoritative catalog.
**Capability:** Service/entity catalog + Scorecards + Self-service actions.

- **Competitor baseline:** Backstage (Spotify), Dotwork (Operating Ontology).
- **Our current:** 1/5 (Switchboard skeleton exists but is mostly static).
- **Target:** Sprint 3.
- **Acceptance tests:** “Create new internal service” → auto-creates catalog entry, required controls, scorecard, SLO dashboards, and gated actions.
- **Policy coverage:** ABAC on every catalog action and visibility.
- **Receipt/provenance:** Evidence-backed scorecards (signed attestations).
- **Operability:** Catalog search latency <200ms.
- **Unit economics impact:** Negligible.

## 3. Workflow Durability + Visibility (P0)

**Outcome:** Operators can debug and recover complex orchestrations without engineering intervention.
**Capability:** Workflow run debugger + Deterministic replay + Stuck-run detection.

- **Competitor baseline:** Temporal, Camunda, Airflow.
- **Our current:** 2/5 (Maestro has retries/logging but lacks visual debugger and "why" trace).
- **Target:** Sprint 2.
- **Acceptance tests:** Intentionally fail a step; show retries + policy decision + operator approval + receipts end-to-end.
- **Policy coverage:** 100% of workflow steps gated by policy preflight.
- **Receipt/provenance:** Full execution trace attached to entity provenance.
- **Operability:** Orchestration latency / failure rate / stuck rate SLOs.
- **Unit economics impact:** High compute cost for replay/tracing; need to optimize.

## 4. Governance UX for Non-Engineers (P1)

**Outcome:** Compliance and legal leads can audit and manage data access without writing code.
**Capability:** Catalog Explorer + Lineage views + Classification/Retention surfaces.

- **Competitor baseline:** Collibra, Alation, BigID.
- **Our current:** 1/5 (Graph supports this but UI does not surface it for non-technical users).
- **Target:** Sprint 3.
- **Acceptance tests:** Compliance lead can answer “what data touched this report?” and "why does Alice have access?" without engineering help.
- **Policy coverage:** Visual policy builder mapping to Rego.
- **Receipt/provenance:** Evidence export (auditor-friendly bundle).
- **Operability:** Lineage graph rendering performance.
- **Unit economics impact:** Minimal.

## 5. Compliance Trust Pack (P1)

**Outcome:** Organization is "SOC2/ISO ready" out of the box with continuous evidence collection.
**Capability:** Continuous controls + Evidence bundle export + Exceptions workflow.

- **Competitor baseline:** Vanta, Drata.
- **Our current:** 2/5 (Audit system is strong but lacks auditor-facing packaging).
- **Target:** Sprint 3.
- **Acceptance tests:** Click “Export SOC2 evidence for Q1” → produces bundle w/ receipts and change history.
- **Policy coverage:** 100% of controls mapped to policy-as-code.
- **Receipt/provenance:** Tamper-evident evidence storage.
- **Operability:** Control health dashboard.
- **Unit economics impact:** Low.

## 6. Permission-Aware AI + Policy-Bound Agents (P1)

**Outcome:** AI assistants are auditable, action-safe, and never hallucinate unauthorized access.
**Capability:** AI Citations + Action preflight + "Explain why" for agents.

- **Competitor baseline:** Microsoft 365 Copilot (permissions-aware), Glean.
- **Our current:** 2/5 (Agents exist but lack strict policy-bound preflights).
- **Target:** Sprint 3.
- **Acceptance tests:** Ask “Who approved vendor X?” → answer cites system records + shows approval receipts.
- **Policy coverage:** 100% of agent tool calls require policy preflight.
- **Receipt/provenance:** Citations attach direct receipts from IntelGraph.
- **Operability:** LLM cost per policy-guarded agent run.
- **Unit economics impact:** +10% LLM tokens for policy context injection.

## 7. FinOps Cockpit (P2)

**Outcome:** Total cost of operations is transparent and attributable to specific tenants/workflows.
**Capability:** Per-tenant cost attribution + Unit economics dashboard + Budget alerts.

- **Competitor baseline:** CloudHealth, Apptio, Vantage.
- **Our current:** 1/5 (Basic budget tracking exists in Maestro).
- **Target:** Sprint 4 (Post-Gap-Closure).
- **Acceptance tests:** Show cost spike attribution to a single tenant’s workflow run volume.
- **Policy coverage:** Budget-based action blocking (OPA).
- **Receipt/provenance:** Cost receipts per execution run.
- **Operability:** Cost attribution accuracy ≥95%.
- **Unit economics impact:** ROI on compute optimization.
