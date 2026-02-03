# ThreatTrace Subsumption Spec (Graphika + Meta ATR)

**Mode:** Reasoning (analysis-focused). This spec asserts the present and dictates the future state.

**Readiness Escalation:** This work aligns with the Summit Readiness Assertion and is bounded by its readiness gates.【F:docs/SUMMIT_READINESS_ASSERTION.md†L1-L200】

---

## UEF Evidence Bundle (raw, evidence-first)

**Evidence Sources (authority pointers):**

- Graphika report source: `Graphika_Report_Everything_Everywhere_All_at_Once_(part_1).pdf` (public asset URL provided in task input; stored as external source; hash tracked via `SourceDocument`).
- Meta Adversarial Threat Report Q1 2025: external PDF copy provided in task input; official-source hash match required before GA.
- Governance authority: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, `docs/governance/AGENT_MANDATES.md`.
- GA controls: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`.

**Evidence Artifacts (planned, deterministic):**

- `artifacts/evidence/evid.threattrace.v<schema_semver>.<inputsha12>.<configsha12>/report.json`
- `artifacts/evidence/evid.threattrace.v<schema_semver>.<inputsha12>.<configsha12>/metrics.json`
- `artifacts/evidence/evid.threattrace.v<schema_semver>.<inputsha12>.<configsha12>/stamp.json`

**Evidence Constraints (policy):**

- Restricted-source handling enforced; derived features only unless licensed; raw copyrighted text excluded from customer-visible surfaces.
- Determinism required: byte-identical reruns for canonical JSON outputs.

---

## Architect Output

### Target Architecture (textual diagram)

```
[Offline Bundle Store] -> [intel_ingest] -> [SourceDocument + Evidence Artifacts]
                                         -> [ThreatTrace Connectors]
                                            - graphika_eweaoa
                                            - meta_atr
                                         -> [ThreatTrace Schema + Validators]
                                         -> [ThreatTrace Graph Builder]
                                         -> [Analyst Console: Extract -> Review -> Lock]
                                         -> [Benchmarks: NECOSYS Lead-Time]
```

### Module Boundaries + Dependency Graph

- `packages/intel_ingest/` (ingest + hashing + canonical JSON)
- `schemas/source_document.schema.json` (SourceDocument contract)
- `schemas/threattrace.schema.json` (ThreatTrace + ThreatIndicator)
- `packages/connectors/graphika_eweaoa/` (rule-based extraction)
- `packages/connectors/meta_atr/` (rule-based extraction + defang)
- `packages/graph_builders/threattrace_graph/` (graph mapping + features)
- `benchmarks/necosys_early_warning/` (benchmark harness)
- `apps/analyst_console/plugins/threattrace_review/` (review workflow)

**Dependency ordering (PR stack):** PR-1 → PR-2/PR-3 → PR-4 → PR-5.

### Canonical Schemas + Determinism Rules

- `SourceDocument`: stable `source_doc_id`, `content_sha256`, provenance object (`official|mirror`).
- `ThreatTrace`: `trace_id`, `trace_type`, `time_range`, `geo`, `platforms`, `languages`, `actors`, `ttp`, `suppression_controls`, `labels`, `citations`.
- `ThreatIndicator`: `kill_chain_stage`, `indicator_type`, `indicator_value` (defanged), `source_confidence`, `handling`.
- Determinism rules: canonical JSON (sorted keys), stable ordering of lists, stable ID hashing from `(schema_version, content_sha256, normalized_fields)`.

### Multi-tenant + Residency Constraints

- `SourceDocument` stored in region-scoped object storage; tenant allowlists enforced at ingestion and query.
- Derived features can be replicated only if policy allows.
- All evidence artifacts keyed by `evidence_id` with tenant isolation.

### Determinism Strategies

- Rule-based extraction only; no runtime LLM calls.
- Dual-run byte equality gate per connector + graph builder.
- Canonical JSON serializer shared across pipelines.

---

## Security Output

### Threat Model (GA-ready)

**Assets:** Source PDFs, derived ThreatTraces, Evidence artifacts, provenance ledger.  
**Trust Boundaries:** Offline bundle ingestion boundary, extraction worker boundary, tenant partition boundary.

### Controls

- Sandbox PDF parsing; no embedded JS; no network fetch.
- Defanging for all indicators; `no_fetch=true` required at schema level.
- Restricted-source policy: no raw text indexing; derived features only; customer export blocked by policy.
- Provenance enforcement: citation offsets + SourceDocument hash required for each ThreatTrace.
- CI gates: determinism, defang/no-fetch, schema validation, evidence artifact completeness.

### Supply Chain Plan

- SBOM generation for PDF parsing dependencies.
- SCA allowlist with explicit version pinning.
- Artifact signing for Evidence bundles.

### CI Security Gates (names + criteria)

- `ci/gates/intel_ingest_determinism.sh`: byte-identical output on rerun.
- `ci/gates/meta_atr_indicator_safety.sh`: all indicators defanged + no network fetch.
- `ci/gates/graph_builder_determinism.sh`: rerun equality for derived graph artifacts.

### MAESTRO Alignment

- **MAESTRO Layers:** Foundation, Data, Tools, Observability, Security.
- **Threats Considered:** prompt injection via PDF payloads, malicious indicators, cross-tenant leakage, tool abuse via network fetch.
- **Mitigations:** sandboxed parsing, defang+no-fetch schema rule, tenant allowlists, evidence provenance validation, CI gates enforcing determinism.

---

## Evals Output

### NECOSYS Early Warning Lead-Time Benchmark

- **Task:** Predict mobilization onset, phase shift, and suppression-control probability using pre-peak data only.
- **Splits:** time-sliced (pre/during/post), plus cross-source split (Graphika-only vs Meta-only vs combined).
- **Metrics:** `lead_time_hours@precision`, `phase_accuracy` (macro-F1), `suppression_tag_f1`, `calibration_error` (ECE).

### Regression Tests + Golden Data Strategy

- Golden JSON outputs for Graphika and Meta connectors stored as canonical, derived-only features with citations.
- No raw copyrighted text stored; fixtures use sanitized excerpts or synthetic fixtures.

### Determinism Validation

- Double-run byte-equality for all connectors and graph builder; diffs fail CI.

### Evidence Artifact Requirements

- `report.json`: extracted traces + citations + derived features.
- `metrics.json`: coverage %, field missing counts, indicator stats, benchmark results.
- `stamp.json`: evidence_id, input hashes, schema version, code git SHA, determinism_check.

---

## Ops Output

### Runtime Topology + Sizing

- Batch workers for ingestion + extraction; scheduler for nightly evaluation runs.
- SLOs: ingest bundle < 5 minutes; determinism check pass rate 100%.

### Observability

- Metrics: `extraction_success_rate`, `missing_field_rate`, `indicator_defang_rate`, `evidence_publish_success`.
- Logs structured with `evidence_id` correlation.

### Runbooks

- Ingestion: `bundle import` → verify hash → evidence publish.
- Backfills: re-run with same bundle; enforce determinism gate.
- Incident response: bad PDF → quarantine bundle; schema drift → update extractor + golden files.

### Residency + Retention

- SourceDocuments in region-locked storage; derived features replicated per policy.
- Retention by tenant policy; evidence bundles retained per governance requirements.

### Rollout + Rollback

- Canary tenants first; rollback triggers: determinism failures, defang gate failures, evidence mismatch.

---

## Product Output

### User Stories

- Analyst detects early mobilization signals and receives lead-time estimate with citations.
- Analyst reviews extraction output, edits, and locks ThreatTraces for training/eval.
- Analyst exports Evidence Graph Snapshot without raw text.

### UI Requirements

- Extract → Review → Lock workflow with diff view.
- Suppression-control tags visible across layers.
- Export panel with evidence_id and provenance.

### Permissions Model

- Restricted-source gate: Graphika/Meta outputs limited to derived features unless licensed.
- Customer-visible exports controlled by policy engine.

### Success Metrics

- Lead-time median improvement vs baseline.
- Suppression tag F1 above threshold.
- Extraction field coverage ≥ 95%.

### Roadmap (MVP → GA)

- MVP: PR-1 to PR-3 deliver deterministic ingestion + connectors.
- GA: PR-4/PR-5 deliver graph builder + benchmark + analyst workflow + governance gates.

---

## Alignment + Governance (Force Alignment)

- All artifacts reference canonical authority files: `docs/governance/CONSTITUTION.md`, `docs/governance/META_GOVERNANCE.md`, `docs/governance/AGENT_MANDATES.md`.
- Evidence and determinism rules align with `docs/ga/TESTING-STRATEGY.md` and `docs/ga/LEGACY-MODE.md`.

---

## Execution Finality

This ThreatTrace subsumption spec is complete and execution-ready, with determinism, governance, and GA gates explicitly defined.
