# Governance Overlay for Agent Platforms — ITEM Brief (Feb 6, 2026)

**Readiness Anchor:** Summit Readiness Assertion is the gating authority for execution posture and release claims. See `docs/SUMMIT_READINESS_ASSERTION.md` before actioning any deployable change.

---

## 1) Evidence Bundle (UEF)

### 1.1 Primary Sources (verifiable claims)

1. Agentuity announced GA for “Agentuity v1,” positioning as a full-stack platform for AI agents. (EEJournal)  
   https://www.eejournal.com/industry_news/agentuity-launches-v1-of-cloud-platform-built-for-ai-agents/
2. Agentuity positions as wrapping existing agent code and offering observability/evals/auth/streaming. (Agentuity)  
   https://www.agentuity.com/
3. Leidos + Trustible announced a joint initiative to automate AI governance workflows for government missions. (Trustible)  
   https://trustible.ai/post/leidos-and-trustible-launch-joint-initiative-to-redefine-ai-governance-with-agents/
4. Samsung announced acquisition of Oxford Semantic Technologies (RDFox) in July 2024. (Samsung Newsroom)  
   https://news.samsung.com/global/samsung-electronics-announces-acquisition-of-oxford-semantic-technologies-uk-based-knowledge-graph-startup
5. New York RAISE Act signed Dec 19, 2025; requires safety protocol publication + incident reporting for frontier models. (NY Governor)  
   https://www.governor.ny.gov/news/governor-hochul-signs-nation-leading-legislation-require-ai-frameworks-ai-frontier-models

### 1.2 Secondary Sources (contextual signal)

1. Agentuity described as a cloud built for agents with primitives for state/communication/production management. (Neon)  
   https://neon.com/blog/agentuity-a-cloud-where-agents-can-actually-build
2. 2026 KG buyer narrative framing KGs as end-to-end semantic infra, including GraphRAG patterns. (Galaxy)  
   https://www.getgalaxy.io/articles/top-knowledge-graph-platforms-enterprise-data-intelligence-2026
3. ITSM governance commentary anticipates mandatory transparency/oversight/bias controls in 2026. (Rezolve.ai)  
   https://www.rezolve.ai/blog/ai-governance-in-itsm-new-compliance-rules
4. Claim of governance timelines reduced from weeks to hours/minutes (requires independent validation). (ITTech Pulse)  
   https://ittech-pulse.com/news/trustible-and-leidos-partner-to-accelerate-automated-ai-governance/

---

## 2) Present-State Assertions (No Legacy Defense)

**Agent infrastructure is commoditizing upward**: GA agent-cloud platforms are normalizing evals, sandboxes, and observability as baseline. Summit must differentiate above the runtime layer.

**Governance automation is accelerating**: Trustible/Leidos signals a procurement wedge. Summit must align to mission-grade governance evidence and auditability without becoming a workflow vendor.

**Graph reasoning is strategic IP**: The Samsung acquisition confirms KG reasoning value; buyer language is shifting toward GraphRAG + governance.

**Frontier-model governance pressure is rising**: RAISE Act and adjacent proposals increase demand for audit trails, reporting, and safety protocols.

---

## 3) Disposition (Single Choice)

**DISPOSITION: INTEGRATE**

Summit integrates with agent runtimes (Agentuity class) and governance workflows (Trustible class) while outflanking with evidence-grade narrative intelligence. This is not a runtime competition; it is a governance overlay.

---

## 4) Summit Differentiation Frame

### 4.1 Integrate with

* **Agent runtime platforms** for telemetry/evals ingestion.
* **Governance workflow systems** for evidence export and audit packs.
* **Enterprise KG platforms** as semantic sinks (overlay, not replacement).

### 4.2 Outflank with Summit-only advantages

* Deterministic, signed **Evidence Packets** with reproducibility.
* **Narrative Risk Map** tracing claims → sources → transformations → downstream decisions.
* Residency-aware, tenant-isolated evidence graph with audit-grade provenance.

---

## 5) Assumptions (Explicit) + Validation Plan

**A1 — Evidence Graph**: Summit has or can add core evidence graph entities (AgentRun, ToolCall, DataSource, Policy, Decision, Incident).  
**Validate:** confirm schema + provenance modules; produce `docs/architecture/current_state.md`.

**A2 — Agentuity integration**: SDKs provide run telemetry export hooks.  
**Validate:** review public docs/SDK; deliver `integrations/agentuity/spike.md` with connector PoC.

**A3 — Trustible integration**: APIs exist for policy checks, model inventory, approvals.  
**Validate:** request sandbox + define `integrations/trustible/contract.md`.

**A4 — “Weeks to hours” claim scope**: applies to specific governance workflows only.  
**Validate:** isolate workflow definition; run a Summit evidence packet benchmark under `evidence/benchmarks/gov_cycle_time/`.

> **Status:** Deferred pending validation. Execution proceeds only once evidence is recorded.

---

## 6) Architecture Direction (Clean-room, Evidence-first)

### 6.1 Core components (v0)

1. **Evidence Graph Service** — immutable event facts + derived risk assertions.
2. **Deterministic Evidence Packager** — `report.json`, `metrics.json`, `stamp.json` + optional `bundle.tar.zst`.
3. **Integrations Layer** — Agentuity ingest + Trustible egress.
4. **Policy & Controls Engine (v0)** — rule evaluation over evidence graph.

### 6.2 Evidence ID Standard

`EVID-YYYYMMDD-<source>-<run_or_incident>-<8hex>`

Example: `EVID-20260206-agentuity-run-9f2a1c4d`

---

## 7) PR Stack (Commit-Ready)

**PR-1:** Evidence Packager + ID Standard + deterministic eval
* `packages/evidence-id/`
* `services/evidence-packager/`
* `schemas/evidence/v1/*.jsonschema`
* `docs/evidence/evidence-packets.md`

**PR-2:** Evidence Graph core schema + storage adapter
* `services/evidence-graph/`
* `schemas/evidence_graph/v1/*.jsonschema`
* `migrations/evidence_graph/`
* `docs/architecture/evidence-graph.md`

**PR-3:** Agentuity ingest connector (v0)
* `integrations/agentuity/ingest/`
* `integrations/agentuity/mappings/agentuity_v1_to_evidence_graph.yaml`
* `docs/integrations/agentuity.md`

**PR-4:** Governance overlay export (Trustible-class) + model register v0
* `services/model-registry/`
* `integrations/trustible/egress/`
* `docs/governance/model-register.md`
* `docs/governance/controls.md`

**PR-5:** Narrative risk mapping (v0) + benchmark
* `services/narrative-risk/`
* `evals/narrative/new_benchmark_narrative_traceability/`
* `docs/product/narrative-risk.md`

---

## 8) Security & Compliance (MAESTRO Alignment)

**MAESTRO Layers:** Data, Agents, Tools, Observability, Security, Infra.

**Threats Considered:**
* Prompt injection → evidence contamination
* Cross-tenant data leakage
* Evidence tampering / replay
* Tool abuse and export exfiltration

**Mitigations:**
* Tenant-scoped evidence graph + residency pinning
* Signed evidence packets + deterministic replay
* OPA/Policy gates for export controls
* Auditable provenance and immutable logs

---

## 9) Target GA Outcome

**Summit Governance Overlay for Agent Platforms**

* Ingest agent executions + evals from runtime platforms.
* Produce compliance-grade evidence packets with deterministic replay.
* Provide narrative risk mapping aligned to governance obligations.
* Export governance artifacts to workflow tools and enterprise KGs.

---

## 10) Immediate Next Actions (No Waiting)

1. Start **PR-1** (Evidence Packager + schemas + determinism eval).
2. Run Agentuity connector spike with a single fixture → AgentEventEnvelope v1 → evidence graph.
3. Draft federal governance overlay one-pager (avoid repeating unverified time claims).
4. Implement Model Register v0 minimum controls aligned with frontier-model governance.
5. Add NTB benchmark harness scaffolding.

---

## 11) Final Directive

**Summit will integrate with runtime and governance platforms, and will own the audit-grade evidence layer.** Execution is immediate and gated by the Readiness Assertion. End of brief.
