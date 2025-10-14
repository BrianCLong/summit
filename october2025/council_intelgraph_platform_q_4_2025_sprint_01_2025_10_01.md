# Council of Spies & Strategists — Platform Workstream
**Slug:** council-intelgraph-platform-q4-2025-sprint-01  
**Dates:** 2025-10-01 → 2025-10-14 (2‑week sprint)  
**Role / Lane:** Chair‑run platform core (provenance, governance, graph‑XAI, analyst UX)  
**Goal:** Ship clean, green, functional capabilities that close critical gaps across **Provenance/Claim‑Ledger**, **Policy & Authority Binding**, **Graph‑XAI surfacing**, and **Offline/Edge expedition kit** while aligning with ongoing sprints (apps/web, predictive‑threat‑suite, connectors, ops/reliability).

---
## 0) Executive Outcome
By **2025‑10‑14**:
- ✅ **Prov‑Ledger v0.9** with verifiable **Disclosure Bundle** export + external verifier CLI.
- ✅ **Authority Binding v1** (query‑time warrant/legal basis; policy reasons on deny).
- ✅ **Graph‑XAI Overlays v1** in tri‑pane (path rationales + counterfactual preview).
- ✅ **Offline Kit v1** (CRDT merge, signed resync logs, conflict resolution UI stub).
- ✅ **Golden Path Demo**: Ingest → Resolve → Analyze → Hypothesize → Report (all cited/provenanced) running end‑to‑end with sample fixtures.
- ✅ SLOs green; CI passes incl. k6 smoke + chaos probe; docs and runbooks published.

**Definition of Done (workstream):** features shipped to `main`, helm charted, IaC applied to **stage**, demoable in **apps/web**, with acceptance tests, docs, and rollback plans.

---
## 1) Alignment With Other Active Sprints
- **apps/web (UI)**: consumes Graph‑XAI overlays, adds provenance tooltips, command‑palette hooks.  
- **predictive‑threat‑suite**: exposes counterfactual API that our overlays preview; we provide model cards + XAI plumbing.  
- **connectors/ingestion**: we supply claim/provenance contract + license engine; they provide two sample feeds for Golden Path.  
- **ops/reliability**: we emit OTEL spans + Prom metrics; they enforce cost guard + query budgets used in demos.  
- **security/governance**: we wire **OPA** policies for Authority Binding; they validate STRIDE controls + dual‑control deletes.

**Dependencies (critical path):**
- GraphQL gateway supports field‑level authz & cost estimates.  
- apps/web tri‑pane can render new overlays + confidence opacity.  
- Connectors produce `Claim` nodes & license/classification tags.

---
## 2) Gaps Identified (within our ambit)
1) **Provenance exports** lack a **verifier** and externally checkable hash manifests.  
2) **Authority/Warrant binding** not enforced at query time; no human‑readable denial reasons.  
3) **Graph‑XAI** exists at API level but is not surfaced in UI or stored with runs.  
4) **Offline expedition kit** prototypes exist without CRDT merge proofs or signed resync logs.  
5) **Acceptance tests** for connector→claim mapping + ER explainability are incomplete.  
6) **Cost guard** lacks per‑tenant query budgets & slow‑query killer integration with overlays.  
7) **Disclosure bundles** don’t bundle licenses/TOU + right‑to‑reply fields.  
8) **Policy simulation** lacks “diff vs. past queries” preview.  
9) **Education assets** (model cards, provenance primer, operator OPSEC) missing from docs Golden Path.

---
## 3) Sprint Objectives → Key Results (OKRs)
- **O1. Verifiable Provenance** → *KR1:* export bundle includes Merkle manifest + transform chain; *KR2:* external `prov-verify` CLI validates bundle in < 3s for 1k docs.  
- **O2. Lawful‑by‑Design Queries** → *KR3:* 100% of privileged queries annotate **Authority**; denials show policy reason + appeal path.  
- **O3. Explainable Analytics** → *KR4:* 3 XAI overlays (path rationale, counterfactual delta, feature importance) on tri‑pane with replay logs.  
- **O4. Edge/Offline Reliability** → *KR5:* CRDT merges resolve synthetic conflicts with deterministic outcome; *KR6:* resync logs signed and verifiable.  
- **O5. Demo & Docs** → *KR7:* Golden Path demo script; *KR8:* 10‑min “hello world” quickstart + screenshots; *KR9:* k6 smoke ≥ 500 VU with p95 < 1.5s on graph reads.

---
## 4) Epics, Stories, and Acceptance Criteria
### Epic A — Provenance & Claim‑Ledger v0.9
- **A1. Evidence Registration API (hardening)**  
  *Stories:* normalize `source→assertion→transform` chain; emit hash; attach `License` & `Authority` refs.  
  *AC:* POST/ingest yields Claim nodes with SHA‑256 + source idempotency key; duplicate rejected with 409 + link.
- **A2. Disclosure Bundle Export**  
  *Stories:* produce **zip** with JSON‑LD graph, media, Merkle manifest, license terms, right‑to‑reply stubs.  
  *AC:* External verifier validates integrity & completeness; missing citations block publish.
- **A3. `prov-verify` CLI**  
  *Stories:* verify hashes, chain‑of‑custody, license coverage; print human summary.  
  *AC:* Exit codes 0/1/2 (ok/fail/warn); works offline.

### Epic B — Authority Binding v1
- **B1. Policy Engine Integration (OPA)**  
  *Stories:* annotate queries with `Authority` (warrant id/purpose/retention); decisions cached per session.  
  *AC:* Unauthorized query returns 403 with deterministic **reason** + appeal route.
- **B2. Policy Simulation**  
  *Stories:* run past queries under candidate policy; emit diff and risk score.  
  *AC:* UI shows impact preview; changes logged for ombuds review.

### Epic C — Graph‑XAI Overlays v1
- **C1. Path Rationale Overlay**  
  *Stories:* shortest/K‑paths with edge attributions + provenance tooltips.  
  *AC:* overlay toggles; screenshots deterministic for golden fixture.
- **C2. Counterfactual Preview**  
  *Stories:* show connectivity change if node/edge removed; highlight delta on graph/timeline.  
  *AC:* “Remove Node‑X” shows % drop ± tolerance; logged with assumptions.
- **C3. Feature Importance Panel**  
  *Stories:* expose model explainers for anomaly/ER; store run params and sandwich explanation.  
  *AC:* panel renders in ≤300ms from cached explainer output.

### Epic D — Offline/Edge Expedition Kit v1
- **D1. CRDT Merge Engine**  
  *Stories:* implement LWW‑element‑set for nodes/edges + op logs; conflict UI (accept/split).  
  *AC:* 10 synthetic conflicts resolved deterministically; signed resync log stored.
- **D2. Sync‑Signer**  
  *Stories:* sign resync bundles; verify on server; include timestamp/leeway.  
  *AC:* tamper produces verification failure with actionable error.

### Epic E — Golden Path Demo & Docs
- **E1. Demo Dataset & Fixtures**  
  *Stories:* synthetic case with claims, narratives, geo‑temporal traces, warranted selectors.  
  *AC:* end‑to‑end runbook completes in <10 min, all views populated.  
- **E2. Docs + Model Cards + Operator OPSEC**  
  *AC:* quickstart + screenshots; three model cards; OPSEC checklist.

---
## 5) Architecture Notes & Scaffolding
### A. Service Boundaries (Mermaid)
```mermaid
flowchart LR
  subgraph Ingest
    Connectors-->ETL[Streaming ETL]\n(enrichers/PII)
  end
  ETL-->Prov[Provenance/Claim‑Ledger]
  Prov-->GraphCore[(Graph Core)]
  GraphCore-->XAI[Graph‑XAI APIs]
  XAI-->Gateway[GraphQL Gateway]
  Gateway-->UI[apps/web Tri‑pane]
  UI<-->Policy[OPA/Authority Binding]
  Offline[Expedition Kit]-->GraphCore
  Offline-->Prov
```

### B. Key Schemas (JSON‑LD excerpts)
```json
{
  "@type": "Claim",
  "id": "clm:123",
  "assertion": {"text": "...", "confidence": 0.82},
  "source": {"id": "src:feed:news:001", "license": "CC-BY"},
  "provenance": [{"op": "ocr", "hash": "sha256:...", "ts": "2025-10-01T12:00:00Z"}],
  "links": {"license": "lic:cc-by", "authority": "warr:XYZ-2025"}
}
```

### C. GraphQL Policy Annotation
```graphql
# client must attach Authority on privileged queries
query CaseNeighborhood($case: ID!, $authority: AuthorityInput!) {
  case(id: $case, authority: $authority) {
    id
    entities(limit: 100) { id type policyLabels }
  }
}
```

### D. OPA Policy (Rego, sketch)
```rego
package intelgraph.authz

default allow = false
allow {
  input.user.role == "analyst"
  input.authority.purpose == "lawful_investigation"
  some tag; tag := input.resource.policyLabels[_]
  not forbidden(tag)
}
forbidden(tag) { tag == "sealed" }
```

### E. `prov-verify` CLI (skeleton)
```bash
prov-verify bundle.zip \
  --print-summary \
  --strict-licenses \
  --check-right-to-reply
```

---
## 6) Test Strategy
- **Unit/Contract:** Claim API, export manifest, Authority enforcement, XAI overlay generation.  
- **E2E:** Golden Path runbook (fixtures → brief) with screenshot diffs.  
- **Load (k6):** 500 VU, p95 < 1.5s read; ingest 10k docs in <5m.  
- **Chaos:** kill Graph‑XAI pod and broker during run; system recovers within SLO.  
- **Security:** policy bypass attempts, query depth limits, dual‑control delete tests.  
- **DR/Offline:** simulate partition; CRDT merge then signed resync.

**Fixtures to ship:** `fixtures/case-alpha/*` (claims, docs, geo traces, warranted selectors), golden screenshots, expected manifests.

---
## 7) Tasks by Day (Cadence)
- **D1–2:** A1, B1 scaffolds; schema/GraphQL updates; CLI init; demo data generation.  
- **D3–5:** A2/A3 export+verify; C1 path overlays; D1 CRDT core.  
- **D6–7:** C2/C3 overlays; B2 policy sim; D2 signer; k6 scripts.  
- **D8–9:** Docs/model cards/OPSEC; Golden Path polish; chaos drill; SLO tune.  
- **D10:** Freeze, demo, release notes, retrospective.

---
## 8) Risks & Mitigations
- **Policy regressions** → enable **policy‑simulation** + staged rollouts.  
- **XAI latency spikes** → cache explainer outputs; degrade overlays gracefully.  
- **License conflicts** → strict license engine + manual override with audit.  
- **Offline merge errors** → deterministic CRDT; human adjudication UI; signed logs.

---
## 9) Metrics & Dashboards
- **SLOs:** p95 read <1.5s; ingest E2E <5m/10k.  
- **Governance:** % privileged queries with Authority ≥ 99%; # denied with clear reason; appeals SLA.  
- **Provenance:** % claims with complete chain; verifier pass rate.  
- **XAI:** overlay render p95 < 300ms; % analyses with saved rationale.  
- **Docs/Demo:** Quickstart completion rate; NPS (analyst trial).

---
## 10) Release Checklist
- Helm chart values updated; Terraform outputs applied to **stage**.  
- Migration scripts/idempotency keys tested.  
- Demo script & screenshots handed to PM/Enablement.  
- Security/Privacy sign‑off; Ombudsman note logged.  
- Tag `v0.9.0-platform` + changelog; roll back plan documented.

---
## 11) Deliverable Artifacts (Scaffolding)
```
platform-sprint-01/
├── docs/
│  ├── quickstart.md
│  ├── model-cards/
│  │  ├── anomaly.md
│  │  └── er-explainer.md
│  ├── provenance-primer.md
│  └── operator-opsec-checklist.md
├── fixtures/case-alpha/
│  ├── claims.jsonl
│  ├── geo-traces.parquet
│  ├── selectors-warranted.json
│  └── expected-manifest.json
├── cli/prov-verify/
│  └── README.md
├── policies/
│  ├── authority-binding.rego
│  └── policy-simulation.rego
├── graphql/
│  └── authority.graphql
├── xai/
│  ├── overlays.md
│  └── golden-screenshots/
├── k6/
│  └── read-graph-smoke.js
├── chaos/
│  └── pod-kill-exercise.md
└── runbooks/
   ├── golden-path.md
   └── disclosure-bundle.md
```

**Templates:**
- **ADR.md**, **RFC.md**, **DOR/DOD.md**, **CHANGELOG.md**, **ISSUE_TEMPLATE.md**, **PULL_REQUEST_TEMPLATE.md**.

---
## 12) Runbooks (new/updated)
- **Golden Path** — ingest→resolve→analyze→hypothesize→report (with citations & provenance).  
- **Disclosure Bundle** — assemble bundle; run `prov-verify`; attach license notes; right‑to‑reply.  
- **Policy Simulation** — choose policy draft; compute diffs; ombuds review.  
- **Offline Resync** — handle conflicts; sign resync; verify server acceptance.

---
## 13) Retro Prompts (to close sprint)
- What slowed us down?  
- Were denials readable/actionable?  
- Did overlays change analyst behavior?  
- What broke in offline merge and how to pre‑empt next time?

---
## 14) Changelog (to be filled at close)
- Prov‑Ledger v0.9 …  
- Authority Binding v1 …  
- Graph‑XAI Overlays v1 …  
- Offline Kit v1 …  
- Golden Path demo …

