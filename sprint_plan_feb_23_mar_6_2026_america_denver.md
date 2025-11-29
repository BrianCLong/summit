# Sprint Plan — Feb 23–Mar 6, 2026 (America/Denver)

> **Theme:** Predict, Explain, Connect. First Graph ML (link/entity risk) pipeline with trustworthy explanations and safe-by-default OSINT ingestion.

---

## 1) Sprint Goals

- **Graph ML MVP:** Offline training + scheduled scoring for link risk and entity risk using Neo4j features; write back risk scores with model lineage.
- **Trustworthy Explanations:** GNNExplainer-style attributions paired with rules/evidence so every surfaced score includes a compact, auditable "why" payload.
- **OSINT Connectors (v1):** Twitter/X (public), Pastebin-like, and RSS/Atom connectors using the SDK (rate-limit/backoff, license tagging, PII hooks) with sandboxed ingestion and governance toggles.
- **Analyst UX:** Risk badges in the tri-pane, "why" drawer, and safe actions (pin, add to case, suppress) with audit trails.
- **Ops & Safety:** Cost caps for training/scoring, model/version registry, and evaluation harness with gold sets.

---

## 2) Success Metrics & DoD

- **Link risk (AUC ≥ 0.90)** and **entity risk (F1 ≥ 0.85)** on gold sets; nightly scoring p95 ≤ 60 min on dev graph with idempotent writes.  _DoD:_ every scored item references a valid `modelId` and persists `riskScore`, `modelId`, `scoredAt`.
- **Explainability coverage ≥ 95%** of surfaced scores carry a ≤2 KB "why" payload (top features, subgraph IDs, evidence IDs, confidence).  _DoD:_ ≥90% explainer paths link to ≥1 evidence chip; drawer open/close ≤100 ms.
- **Connector reliability ≥ 99% normalized events**, DLQ < 1%, toggle propagation ≤ 5s.  _DoD:_ connectors run only via SDK; sandboxed; robots/licensing honored; DPIA checklist passed; audit entries include basis.
- **Ops safety:** Zero runaway jobs; GPU/CPU minute caps enforced; breach triggers safe fail + admin alert; model registry stores `{modelId, schema, params, metrics, dataHash, createdBy}`.

---

## 3) Scope (Epics → Stories)

### Epic A — Graph ML (Risk)
- **A1. Feature Extractor (Neo4j → Parquet):** degree, betweenness pct, temporal bursts, tag co-occurrence, 2-hop motifs; 100% gold nodes/edges emit feature rows; lineage stored.
- **A2. Model Training (PyTorch Geometric):** link prediction (edge risk) + node classification (entity risk) with targets above; registry write on every run.
- **A3. Batch Scoring Job:** nightly score top-K neighborhoods; write back `riskScore`, `modelId`, `scoredAt`; p95 batch ≤ 60 min dev graph; idempotent writes.

### Epic B — Explanations & Evidence
- **B1. GNN Attribution:** per-prediction subgraph + feature importances (GNNExplainer / Integrated Gradients) producing ≤2 KB payload.
- **B2. Rule/Evidence Corroboration:** align explainer paths with stored evidence (docs/transforms) so ≥90% displayed paths map to evidence chips.
- **B3. UX “Why This Score?” Drawer:** top features, path snippet, confidence, mitigating factors; copyable to case notes; open/close ≤100 ms; accessible labels and keyboard friendly.

### Epic C — OSINT Connectors (v1)
- **C1. Connector SDK:** rate-limit, retry/backoff, license tagging, PII tagger hook, DLQ. All connectors must use SDK.
- **C2. Implement X/Twitter (public), Pastebin-like, RSS/Atom:** ingest → normalize → enrich → lineage. Sandboxed; honors robots/licensing; passes DPIA checklist.
- **C3. Source Governance:** per-connector OPA policy and per-workspace toggles. Disable/enable propagates within ≤5s; audit entries include basis.

### Epic D — Analyst Actions & Suppression
- **D1. Risk Badges + Bulk Actions:** mark as reviewed, add to case, suppress false-positive with reason; actions logged; suppressed hidden from default search but audit-visible.
- **D2. Feedback Loop:** thumbs up/down on predictions → logged to training metrics; nightly job produces lift report; prompts/thresholds versioned.

### Epic E — Ops & Registry
- **E1. Model Registry:** `{modelId, schema, params, metrics, dataHash, createdBy}`; immutably versioned; every score references a valid `modelId`.
- **E2. Cost Guards:** hard limits on GPU/CPU minutes; early stop; shard batches; breach → safe fail + admin alert; no runaway jobs.

---

## 4) Interfaces & Implementation Sketches

- **GraphQL** additions: `riskScores(targetIds:[ID!]!)`, `whyRisk(targetId:ID!, modelId:ID!)`, `suppress(targetId:ID!, reason:String!)`, `feedback(targetId:ID!, modelId:ID!, up:Boolean!)` returning `RiskScore` and `WhyPayload` types with `topFeatures`, `subgraphIds`, `evidenceIds`, `confidence`, `notes`.
- **Cypher** example: compute degree & 24h edge delta for an entity, using `MATCH (n {id:$id}) OPTIONAL MATCH (n)-[r]-() ... RETURN n.id AS id, deg AS degree, count(r2) AS delta_24h;`.
- **PyTorch Geometric** (link risk): `GCNLink` model with two `GCNConv` layers and bilinear scorer; saves `state_dict` + metrics to registry.
- **GNNExplainer-style attribution:** run `GNNExplainer(model, epochs=200).explain_graph` and capture top-k features/edges for payloads.
- **Node scoring writeback**: `writeRiskScore(session, targetId, score, modelId)` sets `riskScore`, `riskModel`, `riskScoredAt`, and links to `Model` node via `:SCORED_BY`.
- **Connector SDK (TypeScript):** `Connector` interface with `poll(): AsyncIterable<SourceEvent>` and `normalize(e: SourceEvent): Promise<Normalized>` (entities, edges, evidence, license tagging, PII hooks, DLQ integration).
- **Frontend** wiring: `.risk-pill` click → GraphQL `whyRisk` query → render "why" drawer with top features, subgraph IDs, evidence IDs, and confidence.

---

## 5) Acceptance & Demo Readiness

1. **Risk in UI:** tri-pane shows risk badges on nodes/edges; clicking opens "why" drawer with subgraph, top features, and evidence links; keyboard accessible and ≤100 ms open/close.
2. **Quality:** Link-risk AUC ≥0.90; entity-risk F1 ≥0.85 on gold sets; dashboard shows eval curves and versioned model info (registry-backed).
3. **OSINT:** Enable connectors; see normalized entities/edges flow through ETL with license + PII tags; disable via toggle → ingestion stops & is audited.
4. **Actions:** Bulk suppress false-positives with reason; add top-risk items to a case; audit shows who/what/why/when; feedback logged to nightly lift report.

---

## 6) Risks & Mitigations

- **Explainability ambiguity:** Pair GNN attributions with rule/evidence corroboration; hide low-confidence "why" behind disclaimer; cap payload to ≤2 KB.
- **Connector volatility/rate limits:** SDK-enforced backoff and DLQ; per-workspace toggles; sampling when budgets exceeded.
- **Model drift:** Weekly evals; retrain on lift drop; registry pins `dataHash` and metrics per model version.
- **Cost spikes:** GPU/CPU minute caps; shard scoring; pause on breach with alerting.

---

## 7) Timeline & Cadence (MT)

- **Mon Feb 23** — Planning & kickoff; confirm gold sets and GPU/CPU budget caps.
- **Fri Feb 27** — Mid-sprint demo/checkpoint (30m) focusing on feature extractor + connector SDK readiness.
- **Wed Mar 4** — Grooming for Sprint 20; explainer QA review.
- **Fri Mar 6** — Demo (45m) + Retro (45m) + release cut; ops review on cost guardrails.

---

## 8) Dependencies & Assumptions

- Access to Neo4j feature store and gold labels for link/entity risk (see Q&A below); batch jobs can read/write Parquet in shared storage.
- GPU/CPU quotas allocated; sandboxed environments for OSINT connectors with legal/privacy approvals and robots/licensing guidance available.
- Frontend GraphQL gateway exposes new queries/mutations; OPA policies deployable per connector/workspace with sub-5s propagation path.

---

## 9) Definition of Ready (DoR)

- Gold sets validated with label quality checks; feature schema approved; cost budgets configured; registry schema finalized; DPIA checklist templates ready.
- Toggle/A/B flag names reserved; audit log destinations confirmed; DLQ targets provisioned.

## 10) Definition of Done (DoD)

- Tests/linters green; dashboards live for eval metrics and job SLAs; audits wired for scoring, suppress, feedback, and connector toggles.
- Runbooks updated for training, scoring, explainer, and connector operations; rollback plans verified; model registry entries immutable and referenced by scores.

---

## 11) Quick Q&A (Sharpened Execution)

1. **Gold sets for link/entity risk:** Use the curated **investigation graph gold set v3** (≈42k labeled edges, mixed fraud/abuse domains) for link risk and **entity adjudication gold set v2** (≈18k labeled nodes across personas/orgs). Both reside in the shared Parquet lake (`s3://risk-goldsets/{link_v3,entity_v2}/`) with label QA reports and can be subset by domain for ablations. If access is constrained, start with the light slices: link (financial fraud, 12k edges) and entity (account takeover, 7k nodes) to keep GPU budget small while preserving coverage.
2. **Connector prioritization for demo volume:** Lead with **RSS/Atom** for predictable, high-throughput demo volume and licensing clarity; then **Pastebin-like** for bursty but rich IOC snippets; finally **Twitter/X public** once rate-limit tokens are allocated. This ordering maximizes demo data volume quickly while respecting rate limits and legal review sequencing.
3. **Compliance constraints on OSINT snippets/embeddings:** Enforce **license-tagged storage**, **PII tagging/redaction at ingest**, and **embedding opt-in** (no embeddings for sources lacking reuse rights). Apply retention caps (e.g., 30–90 days depending on license), restrict to sandboxed tenants, and log evidence lineage with basis. Block storing raw credentials/secrets, and run robots.txt/licensing checks before fetch; non-compliant snippets route to DLQ with audit context.

---

_Prepared by: Summit AI — last updated Feb 23, 2026 (America/Denver)._ 
