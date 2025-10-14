# Council of Spies & Strategists — Platform Workstream
**Slug:** council-intelgraph-platform-q4-2025-sprint-02  
**Dates:** 2025-10-15 → 2025-10-28 (2‑week sprint)  
**Role / Lane:** Chair‑run platform core (provenance, governance, graph‑XAI, analyst UX)  
**Sprint Theme:** **Hardening & Readiness** — productionize Prov‑Ledger v1.0, finish Authority Binding pathways (appeals + audit), turn Graph‑XAI overlays into saved artifacts, and ship Offline/Edge kit with adjudication UI. Align with concurrent sprints (apps/web, connectors, predictive suite, ops/sec).

---
## 0) Executive Outcome
By **2025‑10‑28** we will:
- ✅ **Prov‑Ledger v1.0**: immutable claim store w/ Merkle proofs, full **Disclosure Bundle** export, external verifier CLI v1.0, data retention hooks.  
- ✅ **Authority Binding v1.1**: appeal workflow, ombuds audit board, policy version pinning + replay.  
- ✅ **Graph‑XAI v1.1**: overlay **Save/Share** + replayable rationale; counterfactual delta diff export; feature‑importance caching.  
- ✅ **Offline Kit v1.1**: CRDT merge w/ adjudication UI + signed resync upload; human‑in‑the‑loop conflict ledger.  
- ✅ **Golden Path v2**: multi‑tenant demo with policy variants + cost guard budgets; CI/k6/chaos green.  
- ✅ **Stage→Prod canary** runbook and rollback tested.

**Definition of Done (workstream):** features on `main`, Helm/IaC applied to **stage**, **canary** plan rehearsed, dashboards updated, docs/runbooks current, acceptance tests pass.

---
## 1) Alignment & Interfaces
- **apps/web**: receives overlay **Save/Share** endpoints; adds provenance popovers + appeal UI; tri‑pane screenshot export.  
- **predictive‑threat‑suite**: exposes explainer caches; we standardize sandwich explanations + model cards.  
- **connectors**: adopt `Claim` contract v1.0 (license/classification/authority refs); provide 2 fresh feeds for Golden Path v2.  
- **ops/reliability**: cost guard budgets per tenant; slow‑query killer and query‑plan inspector UI.  
- **security/governance**: policy catalog versioning; ombuds review queue; dual‑control purge.

**Dependencies:** GraphQL gateway cost hints; notifications channel for appeals; object store lifecycle policies for retention.

---
## 2) Carry‑over & Newly Identified Gaps
1) **Verifier UX**: CLI lacks machine‑readable exit metadata; add JSON output + SBOM attach.  
2) **Appeals**: path is defined but needs SLA timer, templated appeal packet, and audit trail.  
3) **Overlay persistence**: no canonical spec for saved overlays; add schema + link to analysis report.  
4) **CRDT adjudication**: conflict taxonomy incomplete; need split/merge visualization and reason codes.  
5) **Cost guard**: per‑tenant budgets exist but lack **budget breach narratives** for analysts.  
6) **Policy replay**: missing time‑travel index; add policy‑version pin + replay against stored queries.  
7) **Disclosure bundles**: right‑to‑reply messaging stub needs contact templates/localization.

---
## 3) Objectives & Key Results (OKRs)
- **O1. Verifiable Everything** → *KR1*: `prov-verify` returns JSON report (≤2s/1k docs) + SBOM; *KR2*: ≥99% verifier pass on Golden Path v2.  
- **O2. Governed Access** → *KR3*: Appeals median resolution < 48h; *KR4*: 100% privileged queries pinned to policy version and replayable.  
- **O3. Explainable Analysis** → *KR5*: 90% analyses store at least one overlay; *KR6*: overlay load p95 < 250ms from cache.  
- **O4. Edge Reliability** → *KR7*: conflict adjudication UI resolves 20/20 synthetic cases deterministically; *KR8*: signed resync verify rate 100% in stage.  
- **O5. Operability** → *KR9*: canary success with auto‑rollback test; *KR10*: cost guard budget breach narrative shown for 100% throttled queries.

---
## 4) Epics, Stories, Acceptance Criteria
### Epic A — Prov‑Ledger v1.0 Finalization
- **A1. Verifier JSON & SBOM**  
  *Stories:* add `--json` output; embed SBOM (SPDX) in bundles.  
  *AC:* machine‑readable report; CI checks JSON schema; SBOM passes validation.
- **A2. Retention & Legal Hold Hooks**  
  *Stories:* per‑tenant retention policies; legal hold flags propagated to storage tier.  
  *AC:* retention job skips legal‑hold; audit log entries created.
- **A3. Disclosure Bundle i18n**  
  *Stories:* right‑to‑reply templates (EN/ES); contactability checks.  
  *AC:* bundle lints; missing contacts block publish.

### Epic B — Authority Binding v1.1 (Appeals + Audit)
- **B1. Appeal Workflow**  
  *Stories:* create appeal ticket, SLA timer, ombuds queue, templated packet (policy, purpose, precedent).  
  *AC:* 403 denials display **reason**, **appeal** CTA; ombuds can approve/deny; decisions logged and exportable.
- **B2. Policy Version Pinning & Replay**  
  *Stories:* attach `policy_version` to every privileged query; replay engine runs past queries against candidate policy.  
  *AC:* diff view (added/removed fields) + risk score; screenshot diffs in Golden Path v2.

### Epic C — Graph‑XAI v1.1 (Persistence + Sharing)
- **C1. Overlay Save/Share**  
  *Stories:* schema for overlay objects (inputs, algorithms, thresholds, evidence links); share via URL token.  
  *AC:* saved overlays round‑trip 1:1 on Golden fixture; URL resolves with same render.
- **C2. Counterfactual Delta Export**  
  *Stories:* export edge/node delta as JSON/CSV for reporting.  
  *AC:* analysts can attach deltas to briefs; checksum stored.
- **C3. Explainer Cache**  
  *Stories:* cache feature‑importance per model/run; TTL + invalidation.  
  *AC:* p95 < 250ms; cache hit rate ≥ 80% on demo script.

### Epic D — Offline/Edge Kit v1.1 (Adjudication)
- **D1. Conflict Taxonomy & Reason Codes**  
  *Stories:* define types (dup, divergence, authority mismatch, timestamp skew).  
  *AC:* UI renders badges + suggested actions; logs signed.
- **D2. Adjudication UI**  
  *Stories:* split/merge view; side‑by‑side provenance; accept/split with comment.  
  *AC:* 20 synthetic conflicts resolved; deterministic outcomes; resync accepted by server.

### Epic E — Golden Path v2 & Operability
- **E1. Multi‑tenant Demo**  
  *Stories:* two tenants with different policy catalogs/budgets; runbook + screenshots.  
  *AC:* both paths complete < 12 min each; provenance and overlays present.
- **E2. Cost Guard Narratives**  
  *Stories:* explain throttles/stops; show plan cost and alternatives.  
  *AC:* all throttled queries display narrative + next best actions.
- **E3. Canary & Rollback Drill**  
  *Stories:* progressive delivery (10%→50%→100%); auto rollback on SLO breach.  
  *AC:* drill passes in stage; runbook signed by ops.

---
## 5) Architecture Notes & Schemas
### A. Overlay Object (JSON)
```json
{
  "@type": "Overlay",
  "id": "ovl:abc",
  "kind": "path_rationale|counterfactual|feature_importance",
  "inputs": {"case": "case:123", "seed": 42, "k": 5},
  "artifacts": ["clm:1", "clm:2"],
  "render": {"layout": "force", "opacity": 0.7},
  "provenance": {"createdBy": "user:7", "ts": "2025-10-16T04:12:00Z"}
}
```

### B. GraphQL Extensions
```graphql
mutation SaveOverlay($overlay: OverlayInput!) { saveOverlay(overlay: $overlay) { id url token } }
query LoadOverlay($id: ID!) { overlay(id: $id) { id kind inputs artifacts render provenance } }
```

### C. Appeal Object
```json
{
  "appealId": "apl:2025-10-17-001",
  "queryId": "qry:9f2",
  "policyVersion": "pol:v3.4.1",
  "reason": "denied: sealed",
  "submittedBy": "user:21",
  "sla": {"targetHours": 48, "breach": false},
  "decision": {"status": "pending"}
}
```

---
## 6) Test Strategy
- **Unit/Contract:** overlay save/load; policy pin; replay diff; verifier JSON + SBOM; appeal SLA timer; CRDT reason codes.  
- **E2E:** Golden Path v2 (two tenants); screenshot diffs stable.  
- **Load (k6):** 800 VU read; p95 < 1.4s; ingest 25k docs < 10m.  
- **Chaos:** kill cache + one graph shard; verify overlay cache fallback & recovery.  
- **Security:** appeal escalation authz; tokenized overlay share; dual‑control purge tests.  
- **DR/Offline:** partition → adjudicate → resync; verify signatures.

**Fixtures:** `fixtures/case-bravo/*` (multi‑tenant variants, policy catalogs, budgets, conflict sets, expected deltas).

---
## 7) Tasks by Day (Cadence)
- **D1–2:** A1/A2 scaffolds; overlay schema; appeal objects; multi‑tenant fixtures.  
- **D3–5:** B1 workflow + UI hooks; C1 save/share; D1 taxonomy; k6 plan.  
- **D6–7:** C2 delta export; C3 cache; D2 adjudication UI; E2 narratives.  
- **D8–9:** E1 demo polish; E3 canary drill; docs/model cards/runbooks.  
- **D10:** Freeze, demo, release notes, retro.

---
## 8) Risks & Mitigations
- **Appeal backlog** → SLA timer + auto‑escalation; ombuds staffing; templated packets.  
- **Overlay token leakage** → short‑lived tokens + scope to case; revoke on share.  
- **Cache inconsistency** → versioned explainer cache keys; invalidation on model update.  
- **CRDT adjudication fatigue** → reason codes + batch operations; training video.

---
## 9) Metrics & Dashboards
- **Governance:** appeals median < 48h; % replay‑pinned queries ≥ 99%.  
- **Provenance:** verifier JSON runs/day; SBOM attach rate.  
- **XAI:** overlays saved/analysis; cache hit rate; overlay p95.  
- **Edge:** conflicts auto‑suggested vs. manual; resync verify rate.  
- **Ops:** canary pass/rollback count; cost guard narrative coverage.

---
## 10) Release Checklist
- Migrations applied; idempotency tested.  
- Helm values + Terraform staged; feature flags default safe.  
- Canary + rollback rehearsed; SLO alarms wired.  
- Docs: appeal, overlay save/share, replay, adjudication.  
- Tag `v1.0.0-platform` with changelog + SBOM; run retro.

---
## 11) Deliverable Artifacts (Scaffolding)
```
platform-sprint-02/
├── docs/
│  ├── appeals.md
│  ├── overlay-spec.md
│  ├── replay-runbook.md
│  ├── verifier-json-schema.json
│  ├── sbom-spdx-template.json
│  └── cost-guard-narratives.md
├── fixtures/case-bravo/
│  ├── claims.jsonl
│  ├── policy-catalogs/
│  │  ├── tenant-a.json
│  │  └── tenant-b.json
│  ├── budgets.json
│  ├── conflicts.json
│  └── expected-deltas.json
├── cli/prov-verify/
│  └── examples/ci-usage.md
├── graphql/
│  ├── overlay.graphql
│  └── appeals.graphql
├── policies/
│  ├── policy-versioning.rego
│  └── appeals-access.rego
├── xai/
│  ├── overlay-persistence.md
│  └── delta-export.md
├── k6/
│  └── read-graph-800vu.js
├── chaos/
│  └── cache-shard-failure.md
└── runbooks/
   ├── stage-to-prod-canary.md
   └── offline-adjudication.md
```

**Templates:** **APPEAL_PACKET.md**, **OVERLAY_NOTE.md**, **RISK_REGISTER.md**, **RUNBOOK.md**, **RETRO.md**.

---
## 12) Retro Prompts (to close sprint)
- Did policy pinning + replay reduce governance risk?  
- Are appeal narratives clear to non‑engineers?  
- Do saved overlays accelerate analyst collaboration?  
- Where did adjudication UI create friction, and what would automate next?

---
## 13) Changelog (to fill at close)
- Prov‑Ledger v1.0 …  
- Authority Binding v1.1 …  
- Graph‑XAI v1.1 …  
- Offline Kit v1.1 …  
- Golden Path v2 …

