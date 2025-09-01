# GA Core PR & Branch Roll‑Up — Aug 20, 2025 (America/Denver)

This roll‑up covers **active branches** and **open pull requests** in `BrianCLong/intelgraph`, grouped by **GA Core** scope (A–D + F‑minimal), with recommended dispositions and merge order. Links and IDs correspond to the public GitHub repository.

---

## TL;DR
- **Canonical branches for GA Core:** `release/ga-core`, epic branches `epic/ingest-core-A`, `epic/graph-core-B`, `epic/analytics-core-C`, `epic/copilot-core-D`, `epic/governance-min-F`.
- **Immediate merges (today):**
  1) ER stack: `#669 → #670 → #703` (normalization → similarity features → explainability)  
  2) Copilot NL→Cypher: make `#712` canonical; fold deltas from `#704` and `#684`  
  3) Export provenance: `#666` (manifest + hashes)
  4) Governance: `#675` (policy wrapper) then `#685` (policy check API)
  5) Go/No‑Go Dashboard: land `#654` (SLO) + `#664` (latency heatmap) and compose GA board JSON

---

## Active Branches (by recency)
- `release/ga-core-2025-08-20`
- `release/ga-core`
- `epic/ingest-core-A`
- `epic/graph-core-B`
- `epic/analytics-core-C`
- `epic/copilot-core-D`
- `epic/governance-min-F`
- `feature/intelgraph-ga-foundation`
- `codex/add-nlq-to-cypher-preview-with-guardrails`
- `codex/set-up-collaboration-and-workflow-features`
- `codex/deliver-automated-linting-and-formatting-fix`
- `codex/implement-realtime-collaboration-features-ai71nk`
- `codex/build-authn/z-gateway-with-jwt-support`
- `codex/deliver-intelgraph-ga-v1.0-with-acceptance-criteria`
- `codex/implement-multi-tenant-saas-features`
- `codex/create-sdk-and-plugin-marketplace-architecture`
- `codex/implement-federated-graph-and-data-exchange`
- `codex/ship-event-driven-workflow-engine`
- `codex/implement-copilot-nlq-to-cypher-functionality`

> **Action:** Continue feature work under the `epic/*` branches; open PRs against `release/ga-core`.

---

## Open PRs — Grouped by GA Core Scope

### A. Data Intake & Prep
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #656 | feat: add connector sdk and s3 csv connector | **Merge after CI green** | Seeds connector SDK for CSV; aligns with ingest wizard. |
| #686 | feat: add http ingestor | **Merge** | Complements S3 CSV path. |
| #683 | feat: scaffold ingest job spec and graphql endpoints | **Merge then iterate** | Define job spec + GraphQL for status. |
| #687 | feat: add hashing and dedupe to ingestion | **Merge** | Enables upstream dedupe. |
| #694 | feat: add data quality scaffolding | **Merge after review** | Hooks for validation + metrics. |
| #663 | feat: add STIX/TAXII integration helpers | **Merge** | Optional for GA; behind a flag. |
| #668 | docs: outline data intake and preparation modules | **Merge docs** | Reference in GA docs set. |

### B. Canonical Model & Graph Core (ER focus)
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #669 | feat: improve entity normalization | **Merge first** | Blocking + normalization. |
| #670 | feat: enhance entity resolution with similarity metrics | **Merge second** | Per‑feature similarity. |
| #703 | feat: add explainable entity resolution scoring | **Merge third; gate CI ≥0.900** | Expose feature scores; add precision gate. |
| #653 | feat: add entity resolution service | **Merge** | Service endpoints. |
| #655 | feat: add entity resolution microservice | **Consolidate with #653** | Single service preferred. |
| #691 | feat: add canonical entity types and link analysis canvas skeleton | **Merge** | Canonical types feed ER/analytics. |
| #676 | feat: enrich provenance metadata | **Merge** | Required for merge audit trail. |

### C. Analytics & Tradecraft
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #665 | feat: implement canvas ops pack core and pathfinding suite | **Merge** | Link analysis core. |
| #696 | feat: add hybrid search ranking utilities | **Merge** | Improves discovery. |
| #681 | feat: add early warning score aggregator | **Merge** | Scoring pipeline. |
| #679 | feat: integrate graph-xai explanations | **Merge** | Surface explanations in UI. |
| #678 | feat: integrate graph-xai explanations | **Close as duplicate** | Superseded by #679. |

### D. AI Copilot (auditable)
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #712 | feat(copilot): NL→Cypher preview with guardrails | **Canonical → Merge** | Make this the base. |
| #704 | feat: add copilot NLQ to Cypher pipeline | **Fold into #712** | Rebase; keep tests. |
| #684 | feat: add NL to Cypher preview route | **Fold into #712** | Close after cherry‑picks. |
| #692 | feat: add GraphRAG copilot streaming service | **Merge** | Streaming RAG engine. |
| #659 | feat: add auditable copilot modules | **Merge** | Audit hooks/citations. |
| #658 | feat(copilot): add NL translation and local RAG service | **Merge** | Local retrieval + i18n. |

### F. Security/Governance (minimal)
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #675 | feat: add policy wrapper for GraphQL resolvers | **Merge first** | Policy enforcement surface. |
| #685 | feat(server): add policy check api stub | **Merge second** | Powers denial payloads + appeal. |
| #660 | feat: add oidc gateway with step-up auth | **Merge** | Step‑up for sensitive ops. |
| #695 | feat: add row-level security predicates | **Merge** | Tenant / data‑tier isolation. |

### Observability & Go/No‑Go Dashboard
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #654 | feat: add observability SLO dashboard | **Merge** | Base SLO tiles. |
| #664 | feat: add query latency heatmap dashboard | **Merge** | Add tile; compose GA Go/No‑Go. |

### Collaboration & UI Shell (supporting)
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #700 | feat(collab): presence + CRDT notepad + graph comments + audit | **Merge** | Analyst collaboration. |
| #677 | feat: add presence heartbeat and cursor tracking | **Fold into #700** | Duplicate stream. |
| #662 | feat(webapp): add tri‑pane analyst shell | **Merge** | Productivity shell. |
| #706 | feat: scaffold federation gateway and ui components | **Hold (post‑GA)** | Defer if capacity tight. |
| #698 | feat(geo): add placeholder geospatial schema | **Merge (optional)** | Foundations only.

### Export & Provenance Integrity
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #666 | feat(exporter): add deterministic export bundles | **Merge** | Bundle `manifest.json` with hashes. |

### Docs & Program Management
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #711 | docs: add ga closeout brief | **Merge** | GA narrative + outcomes. |
| #705 | chore: add event workflow engine issue | **Merge** | Tracking item. |
| #671 | docs: add GA‑Core issue tracker and board | **Merge** | Connect to #714 and milestone. |
| #661 | docs: add canonical model & graph core issue set | **Merge** | Cross‑link epics.

### Foundational / Umbrella
| PR | Title | Suggested action | Notes |
|---|---|---|---|
| #709 | feat: IntelGraph GA Foundation – Complete Architecture Implementation | **Split & rebase** | Break into reviewable slices; avoid monolith merge. |
| #649 | Release/0.9.0 mvp beta | **Close or convert** | Superseded by GA Core plan.

> **Note:** Additional PRs not explicitly listed above are either duplicates of the grouped items or out‑of‑scope for GA Core; keep them labeled and parked under the milestone or close with rationale.

---

## Proposed Merge Order (Today → This Week)
1. **Graph Core (ER):** `#669 → #670 → #703` (then wire CI precision gate ≥ 0.900 by entity type)  
2. **Governance:** `#675` → `#685` (enable denial payload with appeal path; update UI banners + audit)  
3. **Export/Provenance:** `#666` (manifest + hash integrity tests; Prometheus metric)  
4. **Copilot:** Merge `#712` (canonical), rebase/close `#704` and `#684`; merge `#692`, `#659`, `#658`  
5. **Ingest:** `#656`, `#686`, `#683`, `#687`, `#694`  
6. **Analytics:** `#665`, `#696`, `#681`, `#679`  
7. **Observability:** `#654`, `#664` then compose **GA Go/No‑Go** dashboard JSON  
8. **Collab/UI:** `#700`, fold `#677` → `#700`; merge `#662`

---

## Tracking & Hygiene
- **Connect PRs to Issue #714 (GA Core):** add "Relates to #714" or use the right‑rail linkage.
- **Labels:** ensure `ga-core`, `epic/A|B|C|D|F`, `P0|P1` are set for filtering.
- **Milestone:** attach open PRs to **Milestone: GA Core Release**.
- **CI Gates:** ER precision ≥ **0.900** (Person/Org) required to merge PRs modifying ER.
- **Close Duplicates:** Prefer canonical PRs (#712 for NL→Cypher, #679 for graph‑XAI). Close superseded PRs after cherry‑picking tests.

---

## Next Actions (Owners)
- **Graph Core TL:** drive ER stack merges; publish `metrics.json` to CI; comment precision delta on PRs.
- **Copilot TL:** finalize #712; fold #704/#684; ensure preview + confirm flow; audit events wired.
- **Export TL:** land #666; add integrity tests; emit `% bundles with manifest` metric.
- **Governance TL:** merge #675/#685; expose denial `appeal` in UI; add audit log events.
- **Observability TL:** assemble **GA Go/No‑Go** dashboard; publish JSON to `monitoring/dashboards/`.
- **PM/TPM:** link all PRs to #714; update milestone and board.

---

*Prepared by Guy — IntelGraph GA Core execution support.*