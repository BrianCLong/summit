# Nature s41562-026-02411-w — Regulatory Signals + Early-Warning Subsumption (Layer 2/3)

## Summit Readiness Assertion

This package converts the paper signal into governed, reversible, evidence-first architecture artifacts. All proposed runtime behavior is default-off behind feature flags and constrained by deterministic CI gates.

## Source Grounding

- **Item:** “Large language models have the potential to level the playing field in consumer financial complaints.”
- **Venue:** *Nature Human Behaviour* (Research Briefing).
- **DOI:** `s41562-026-02411-w`.
- **Empirical anchor in briefing:** Analysis of ~1.13M CFPB complaint narratives; post-ChatGPT LLM-assistance rise; higher relief likelihood for assisted complaints.

## Layer 2 — Regulatory Signals Dataset for GraphRAG

### Objective

Transform complaint corpora into a **Regulatory Signals Graph Dataset (RSGD)** that powers retrieval, risk analytics, and supervision signals for GraphRAG.

### Canonical Build Path

- `src/connectors/regulatory/` — CFPB/FTC/SEC/OCC/NAIC public-source ingestion
- `src/graphrag/regulatory/` — typed graph substrate
- `src/graphrag/pipelines/regulatorySignalExtraction.ts` — deterministic extraction pipeline
- `data/regulatory-signals/` — parquet exports (`complaints`, `signals`, `edges`)
- `evidence/regulatory-signals/` — governed evidence bundle

### Signal Taxonomy

- Institution
- Product
- Issue
- Harm
- Outcome
- Temporal bucket

### Evidence Contract

- `EVD-RSGD-CFPB-SIZE-001`
- `EVD-RSGD-ENTITY-EXTRACT-002`
- `EVD-RSGD-GRAPH-CONSTRUCT-003`
- `EVD-RSGD-GRAPHRAG-BENCHMARK-004`

### Controls

- Provenance stamps for every source pull
- PII redaction pre-indexing
- Similarity-based deduplication and synthetic-text abuse checks
- Deterministic export checks (timestamp allowed only in `stamp.json`)

## Layer 3 — Regulatory Early-Warning System (REWS)

### Objective

Convert the regulatory graph from descriptive intelligence into a forward-looking system that forecasts enforcement exposure across 30/90/180-day horizons.

### Core Hypotheses

- Abnormal complaint velocity in institution-product-issue segments precedes enforcement risk.
- Harm severity and narrative convergence outperform raw volume alone.
- Cross-regulator graph fusion improves forecast precision and lead-time.

### Canonical Build Path

- `src/graphrag/regulatory/earlywarning/types.ts`
- `src/graphrag/regulatory/earlywarning/buildForecastFeatures.ts`
- `src/graphrag/regulatory/earlywarning/joinHistoricalActions.ts`
- `src/graphrag/regulatory/earlywarning/retrieveAnalogs.ts`
- `src/agents/regulatory/EnforcementForecastAgent.ts`
- `src/api/graphql/regulatory/schema.graphql`
- `src/api/rest/regulatory/early-warning.ts`
- `tests/graphrag/regulatory/earlywarning/`
- `evidence/regulatory-early-warning/`

### Feature Families

- Volume and velocity
- Severity and specificity
- Narrative convergence
- Cross-source correlation
- Historical analog retrieval (GraphRAG)

### Policy + Runtime Controls

- `REGULATORY_EW_ENABLED=false`
- `REGULATORY_EW_ANALOGS_ENABLED=false`
- `REGULATORY_EW_EXTERNAL_API_ENABLED=false`
- `REGULATORY_EW_OPERATOR_REVIEW_REQUIRED=true`

### Required CI Gates

- `regulatory-ew-evidence`
- `regulatory-ew-backtest`
- `regulatory-ew-policy`
- `regulatory-ew-privacy`
- `regulatory-ew-deps`

## MAESTRO Threat-Model Alignment

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** complaint spam flooding, synthetic narrative manipulation, forecast gaming, PII leakage, evidence tampering.
- **Mitigations:** source provenance + dedup, abuse classifiers, deny-by-default policies, operator review for high-severity outputs, deterministic artifact verification.

## PR Stack (Max 7, Reversible)

1. Evidence schemas + verifier scripts
2. Temporal signal calculators
3. Historical enforcement linkage
4. Baseline forecast model
5. GraphRAG analog retrieval
6. API surfaces with operator-review checks
7. Governance docs + CI hardening

## Rollback and Accountability

- Hard rollback via flags listed above.
- Accountability window: 30 days post-merge for drift, false-positive rate, and privacy policy conformance.
- No merge advancement without evidence bundle completeness.
