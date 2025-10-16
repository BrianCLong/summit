# Council of Spies & Strategists — Platform Workstream

**Slug:** council-intelgraph-platform-q4-2025-sprint-03  
**Dates:** 2025-10-29 → 2025-11-11 (2‑week sprint)  
**Role / Lane:** Chair‑run platform core (provenance, governance, graph‑XAI, analyst UX)  
**Sprint Theme:** **Scale, Integrations, & Enablement** — extend v1.0 foundations with multi‑case reasoning, SDKs, reliability hardening, and compliance prep. Keep cadence with apps/web, connectors, predictive suite, and ops/sec.

---

## 0) Executive Outcome

By **2025‑11‑11** we will:

- ✅ **Multi‑Case Reasoning v1**: cross‑case overlays (entity/temporal joins) with provenance intact and policy‑safe scoping.
- ✅ **Analyst SDKs v0.9**: TypeScript + Python SDKs for Claim/Overlay/Appeals/Replay; signed client \(authority tokens\).
- ✅ **Timeline Intelligence v1**: fused timeline view derived from graph + claims; supports counterfactual diff overlay.
- ✅ **Cost & Perf Guard v1.2**: plan inspector, budget breach narratives, auto‑rewrite suggestions; p95 read < 1.3s @ 1k VU.
- ✅ **Compliance Readiness (SOC2‑seed)**: audit logs unified; config snapshotting; SBOM + provenance in release artifacts.
- ✅ **Golden Path v3**: multi‑case demo with saved overlays, appeal, replay, adjudication, and SDK notebooks.

**Definition of Done:** features on `main`, Helm/IaC to **stage**, demoable in apps/web, SDKs published to internal registry, tests and docs green.

---

## 1) Alignment & Interfaces

- **apps/web**: consumes timeline view + cross‑case overlay toggles; adds plan inspector UI; SDK quickstarts in Help.
- **predictive‑threat‑suite**: exposes temporal models; we render importance on timeline; cache coordination continued.
- **connectors**: deliver third feed type with rich timestamps; conform to Claim v1.0; source latency SLOs.
- **ops/reliability**: extend budgets; autoscaling policies; release SBOM attach to artifacts store.
- **security/governance**: cross‑case policy scoping + redaction rules; audit log schema alignment.

**Dependencies:** gateway supports cross‑case cursors; notifications for breach/appeal; object storage lifecycle hooks for audit bundles.

---

## 2) Gaps Targeted

1. Cross‑case analysis currently manual; no policy‑safe join primitive.
2. No first‑class timeline synthesis; overlays not temporally fused.
3. Analyst integrations rely on ad‑hoc queries; SDKs absent.
4. Cost guard lacks query **auto‑rewrite** and plan inspector.
5. Audit logs fragmented across services; no exportable audit bundle.
6. Developer enablement: no sample notebooks or CLI recipes tied to Golden Path v3.

---

## 3) Objectives & Key Results (OKRs)

- **O1. Cross‑Case Insight** → _KR1:_ join primitive yields overlay in < 500ms for 50k‑node subset; _KR2:_ 90% of demo analyses use cross‑case view.
- **O2. SDK Adoption** → _KR3:_ 3 internal apps adopt SDK; _KR4:_ time‑to‑first‑overlay < 5 min from quickstart.
- **O3. Temporal Clarity** → _KR5:_ timeline render p95 < 300ms from cache; _KR6:_ counterfactual delta export attachable to reports.
- **O4. Operability & Cost** → _KR7:_ 1k VU p95 < 1.3s, p99 < 2.2s; _KR8:_ 100% throttled queries receive auto‑rewrite suggestions.
- **O5. Compliance Prep** → _KR9:_ unified audit bundle export with 100% coverage of privileged actions; _KR10:_ release artifacts include SBOM + provenance.

---

## 4) Epics, Stories, Acceptance Criteria

### Epic A — Multi‑Case Reasoning v1

- **A1. Policy‑Safe Join Primitive**  
  _Stories:_ `JOIN CASE` API scoping; redact sealed tags; merge authority contexts.  
  _AC:_ API denies unsafe joins with reason; successful joins record policy lineage.
- **A2. Cross‑Case Overlay Render**  
  _Stories:_ K‑paths across cases; provenance popovers show case id; opacity by case.  
  _AC:_ Golden fixture reproducible; screenshots deterministic.

### Epic B — Analyst SDKs v0.9 (TS + Python)

- **B1. Auth & Authority Tokens**  
  _Stories:_ client‑side signing; attach Authority; token refresh.  
  _AC:_ 403s provide clear reasons; sample scripts run E2E.
- **B2. High‑level Primitives**  
  _Stories:_ `claims.ingest()`, `overlays.save()`, `appeals.submit()`, `replay.diff()`.  
  _AC:_ notebooks demonstrate Golden Path v3 in < 30 cells.
- **B3. Samples & Docs**  
  _Stories:_ TS quickstart, Py notebook, CLI recipes.  
  _AC:_ time‑to‑first‑overlay < 5 min.

### Epic C — Timeline Intelligence v1

- **C1. Timeline Fusion**  
  _Stories:_ derive events from claims/graph; collapse duplicates; uncertainty bands.  
  _AC:_ renders for 3 scenarios; supports filter by authority/policy labels.
- **C2. Counterfactual on Timeline**  
  _Stories:_ remove node/edge → delta ribbon; export CSV/JSON.  
  _AC:_ export checksums stored; imports to briefing builder.

### Epic D — Cost & Performance Guard v1.2

- **D1. Plan Inspector**  
  _Stories:_ expose estimated/actual costs, fan‑out, cache hits; show alternatives.  
  _AC:_ throttled queries show narrative + 1‑click rewrite.
- **D2. Auto‑Rewrite**  
  _Stories:_ transform deep queries to paginated/filtered variants; preserve semantics.  
  _AC:_ p95 improved by ≥15% on synthetic suite.

### Epic E — Compliance & Audit v1

- **E1. Unified Audit Bundle**  
  _Stories:_ consolidate privileged actions across services; sign & export.  
  _AC:_ external verifier validates bundle; appeal threads linked.
- **E2. Release Provenance**  
  _Stories:_ attach SBOM, git SHA, manifest, verifier report to every release.  
  _AC:_ artifacts store retains 6 months; audit queryable.

### Epic F — Golden Path v3 & Enablement

- **F1. Multi‑Case Demo**  
  _Stories:_ cases alpha+bravo with cross‑links; policy variants + budgets.  
  _AC:_ runbook < 15 min; overlays saved/shared; timeline screenshots.
- **F2. Training**  
  _Stories:_ 2 microvideos (appeals; plan inspector); OPSEC refresher.  
  _AC:_ completion tracked; feedback ≥ 4.5/5.

---

## 5) Schemas & Interfaces

### A. Cross‑Case Join (GraphQL)

```graphql
query CrossCasePaths($left: ID!, $right: ID!, $authority: AuthorityInput!) {
  crossCasePaths(left: $left, right: $right, authority: $authority) {
    path {
      nodes {
        id
        case
      }
      edges {
        id
        case
        weight
      }
    }
    provenance {
      claimIds
      authorityLineage
    }
  }
}
```

### B. Timeline Event (JSON)

```json
{
  "id": "evt:123",
  "sourceClaims": ["clm:7", "clm:9"],
  "ts": "2025-06-01T10:22:00Z",
  "uncertainty": 120,
  "labels": ["policy:public"],
  "case": "case:alpha"
}
```

### C. SDK Example (Python)

```python
from intelgraph import Client
c = Client(token=env["INTELGRAPH_TOKEN"]).with_authority(purpose="lawful_investigation")
ovl = c.overlays.cross_case_paths("case:alpha","case:bravo", k=5)
ovl.save(note="alpha↔bravo K‑paths v1")
```

---

## 6) Test Strategy

- **Unit/Contract:** cross‑case API deny/allow; SDK auth; timeline fusion; plan inspector; audit bundle verify.
- **E2E:** Golden Path v3 with SDK; screenshot diffs; appeal+replay present.
- **Load (k6):** 1k VU read; p95 < 1.3s; ingest 35k docs < 12m.
- **Chaos:** scale down graph shards; verify auto‑rewrite keeps SLO; audit export during failure.
- **Security:** cross‑case leakage tests; token scope; audit integrity; SBOM tamper tests.

**Fixtures:** `fixtures/case-alpha+bravo/*` (joined entities, timelines, policies, budgets, expected overlays/deltas).

---

## 7) Day‑by‑Day Cadence

- **D1–2:** A1 join primitive scaffold; SDK auth plumbing; timeline extractor.
- **D3–5:** A2 render; C1 fusion; D1 inspector; E1 audit bundle.
- **D6–7:** C2 timeline counterfactual; D2 auto‑rewrite; E2 release provenance.
- **D8–9:** F1 demo polish; F2 training; docs/runbooks; load/chaos drills.
- **D10:** Freeze, demo, release notes, retro.

---

## 8) Risks & Mitigations

- **Policy leakage in joins** → redaction + lineage logging; deny‑by‑default.
- **SDK misuse** → scoped tokens; lint rules; examples emphasize Authority.
- **Perf regressions** → auto‑rewrite; plan inspector nudges; cache warmers.
- **Audit gaps** → schema contract tests; external verifier in CI.

---

## 9) Metrics & Dashboards

- **Cross‑Case:** join success/deny rates; overlay latency.
- **SDK:** quickstart success rate; internal app adoption.
- **Timeline:** events derived; counterfactual exports attached.
- **Perf/Cost:** p95/p99; throttles avoided via rewrite.
- **Compliance:** audit bundle exports; verifier pass rate; release provenance attach rate.

---

## 10) Release Checklist

- Feature flags default safe; migrations idempotent.
- Helm/Terraform staged; autoscaling thresholds tuned.
- SDK packages published (npm, internal PyPI); docs and notebooks versioned.
- Golden Path v3 runbook/screenshots recorded.
- Tag `v1.1.0-platform` + changelog; retro logged.

---

## 11) Deliverable Artifacts (Scaffolding)

```
platform-sprint-03/
├── docs/
│  ├── cross-case-joins.md
│  ├── timeline-intelligence.md
│  ├── sdk-ts-quickstart.md
│  ├── sdk-py-notebook.ipynb
│  ├── plan-inspector.md
│  ├── audit-bundle.md
│  └── release-provenance.md
├── fixtures/case-alpha+bravo/
│  ├── claims.jsonl
│  ├── timelines.json
│  ├── policies/
│  │  ├── alpha.json
│  │  └── bravo.json
│  ├── budgets.json
│  └── expected-overlays.json
├── sdk/
│  ├── typescript/
│  │  └── package.json
│  └── python/
│     └── setup.cfg
├── graphql/
│  ├── cross-case.graphql
│  └── timeline.graphql
├── k6/
│  └── read-graph-1kvu.js
├── chaos/
│  └── shard-scale-down.md
└── runbooks/
   ├── golden-path-v3.md
   └── auto-rewrite-howto.md
```

**Templates:** **SDK_CONTRIBUTING.md**, **SECURITY.md**, **SBOM_CHECKLIST.md**, **AUDIT_EXPORT_REQUEST.md**, **DEMO_SCRIPT.md**.

---

## 12) Retro Prompts (to close sprint)

- Did cross‑case joins unlock materially better insight without policy risk?
- Is the plan inspector’s guidance understandable to analysts?
- Are SDKs easy enough that teams default to them over ad‑hoc calls?
- Did audit bundles meet compliance stakeholders’ needs?

---

## 13) Changelog (to fill at close)

- Multi‑Case Reasoning v1 …
- Analyst SDKs v0.9 …
- Timeline Intelligence v1 …
- Cost & Perf Guard v1.2 …
- Compliance & Audit v1 …
- Golden Path v3 …
