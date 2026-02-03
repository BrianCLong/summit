# ThreatTrace Subsumption Plan (Graphika + Meta ATR)

**Mode:** Reasoning (analysis-focused). The evidence bundle is listed before narrative sections, per governance. This plan is intentionally constrained to deterministic, offline ingestion and governed outputs.

## UEF Evidence Bundle (raw pointers)

- **Summit Readiness Assertion**: `docs/SUMMIT_READINESS_ASSERTION.md`.
- **Governance Constitution**: `docs/governance/CONSTITUTION.md`.
- **Meta-Governance Framework**: `docs/governance/META_GOVERNANCE.md`.
- **Agent Mandates**: `docs/governance/AGENT_MANDATES.md`.
- **GA guardrails**: `docs/ga/TESTING-STRATEGY.md`, `docs/ga/LEGACY-MODE.md`.
- **Roadmap binding**: `docs/roadmap/STATUS.json`.

## High-Level Summary & 7th+ Order Implications

1. **Immediate capability gain**: deterministic ingestion of adversarial threat reporting into a unified ThreatTrace schema with verifiable provenance.
2. **7th-order implication**: establishing a repeatable, offline evidence loop transforms external narrative reporting into internal benchmark data, enabling early-warning lead-time evaluation that becomes a governance gate for future releases.
3. **Risk inversion**: structured ingestion + defang/no-fetch guarantees convert high-risk indicator data into low-risk, analyst-safe artifacts without reducing investigative utility.
4. **Governed exceptions**: any use of copyrighted report content beyond derived features is explicitly constrained and recorded as a governed exception, never a bypass.
5. **Audit gravity**: every ThreatTrace is anchored to a SourceDocument hash and immutable provenance, making dataset drift a first-class audit event.
6. **Operational compression**: the offline bundle flow collapses ingestion latency into a single deterministic batch job and yields a canonical EvidenceID for runbooks and incident response.
7. **Strategic leverage**: aligning narrative phases with platform disruptions yields a time-to-action distribution that becomes a new product KPI and release gate.

## MAESTRO Threat Modeling Alignment

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: prompt injection into ingestion, malicious PDFs (embedded scripts), indicator misuse (auto-fetch), cross-tenant leakage, provenance forgery, determinism drift, tool-chain tampering.
- **Mitigations**: sandboxed parsing workers, JS-disabled extraction, URL defanging + no-fetch policy, per-tenant allowlists, hash-chained provenance, double-run byte equality gates, SBOM + SCA + artifact signing.

## Full Architecture

### Textual Architecture Diagram

```
[Offline Bundle] -> [intel_ingest] -> [SourceDocument + EvidenceID]
  -> [Connector: graphika_eweaoa] -> [ThreatTrace (narrative_campaign)]
  -> [Connector: meta_atr] -> [ThreatTrace (platform_disruption + indicator_set)]
  -> [ThreatTrace Graph Builder] -> [Graph primitives + suppression tags]
  -> [Evals: NECOSYS Lead-Time] -> [Metrics + Evidence Artifacts]
  -> [Analyst Console] -> [Extract -> Review -> Lock]
```

### Module Boundaries & Dependency Graph

- `packages/intel_ingest` (new): deterministic ingestion, hashing, canonical JSON.
- `packages/connectors/graphika_eweaoa` (new): rule-based parsing into ThreatTrace.
- `packages/connectors/meta_atr` (new): rule-based parsing + indicator defang into ThreatTrace.
- `packages/graph_builders/threattrace_graph` (new or adapter): phase/tempo features + suppression tags.
- `benchmarks/necosys_early_warning` (new): evaluation harness.
- `apps/analyst_console/plugins/threattrace_review` (new): review/lock workflow.

Dependencies are strictly one-way: ingest -> connector -> graph builder -> evals -> analyst UI.

## Canonical Schemas (Versioning + Determinism)

### SourceDocument (v0.1)

- `source_doc_id` (stable hash of normalized fields)
- `source_name` (e.g., `graphika`, `meta_atr`)
- `content_sha256`
- `provenance`: `{ uri, publisher, confidence }`
- `retrieved_at` omitted from determinism calculations

### ThreatTrace (v0.1)

- `trace_id` (stable hash)
- `trace_type`: `narrative_campaign | platform_disruption | threat_indicator_set`
- `time_range`: `{ start, end, granularity }`
- `geo`: `{ origin[], targets[] }`
- `platforms[]`, `languages[]`
- `actors[]`: `{ role, label, confidence }`
- `ttp[]`, `suppression_controls[]`, `labels[]`
- `citations[]`: pointers to SourceDocument + page/section offsets

### ThreatIndicator (v0.1)

- `kill_chain_stage`
- `indicator_type`
- `indicator_value` (defanged)
- `source_confidence`
- `handling`: `{ defanged: true, no_fetch: true }`

### Determinism Rules

- Canonical JSON with sorted keys, stable float formatting, deterministic list ordering.
- IDs derived from `(schema_version, content_sha256, normalized_fields)`.
- CI double-run byte equality gates on `report.json` for each pipeline.

## Implementation (All Files)

### PR-1: Deterministic Intel Ingestion Core

- `packages/intel_ingest/__init__.py`
- `packages/intel_ingest/source_document.py`
- `packages/intel_ingest/hashing.py`
- `packages/intel_ingest/canonical_json.py`
- `packages/intel_ingest/bundle_loader.py`
- `schemas/source_document.schema.json`
- `cli/intel_ingest.py`
- `ci/gates/intel_ingest_determinism.sh`
- `tests/regression/test_source_document_roundtrip.py`
- `tests/regression/golden/source_document_expected.json`

### PR-2: Graphika Connector → Narrative Campaign ThreatTraces

- `packages/connectors/graphika_eweaoa/extractor.py`
- `packages/connectors/graphika_eweaoa/graphika_to_threattrace.py`
- `packages/connectors/graphika_eweaoa/fixtures/` (sanitized excerpts only)
- `schemas/threattrace.schema.json` (v0.1)
- `tests/connectors/test_graphika_extractor.py`
- `tests/connectors/golden/graphika_threattraces.json`
- `ci/gates/graphika_connector_regression.sh`
- `evals/graphika_extraction_eval.py`

### PR-3: Meta ATR Connector → Disruption Traces + Kill-Chain Indicators

- `packages/connectors/meta_atr/extractor.py`
- `packages/connectors/meta_atr/defang.py`
- `packages/connectors/meta_atr/meta_to_threattrace.py`
- `tests/connectors/test_meta_atr_extractor.py`
- `tests/connectors/golden/meta_q1_2025_threattraces.json`
- `ci/gates/meta_atr_indicator_safety.sh`
- `evals/meta_indicator_stage_coverage.py`

### PR-4: ThreatTrace Graph Builder + Suppression Tags

- `packages/graph_builders/threattrace_graph/builder.py`
- `packages/graph_builders/threattrace_graph/features.py`
- `packages/graph_builders/threattrace_graph/suppression_tags.py`
- `tests/graph/test_graph_builder_determinism.py`
- `ci/gates/graph_builder_determinism.sh`
- `evals/early_warning_lead_time.py`

### PR-5: Benchmark + Analyst Workflow Integration

- `benchmarks/necosys_early_warning/dataset_manifest.json`
- `benchmarks/necosys_early_warning/tasks/lead_time_prediction.yaml`
- `benchmarks/necosys_early_warning/scoring.py`
- `apps/analyst_console/plugins/threattrace_review/review_panel.tsx`
- `apps/analyst_console/plugins/threattrace_review/export_labels.ts`
- `docs/architecture/threattrace_ingestion.md`
- `docs/ops/runbook_threattrace.md`
- `docs/security/threat_model_threattrace.md`
- `ci/gates/benchmark_regression.sh`

## Tests

- Determinism: double-run byte equality for all ingestion and graph outputs.
- Regression: golden JSON outputs for Graphika + Meta connectors.
- Safety: defang/no-fetch unit tests for indicators.
- Coverage: field coverage metric thresholds (>= 95%).

## Documentation

- Architecture spec (this document + threattrace_ingestion.md).
- Runbook for ingestion, backfills, and incident response.
- Threat model and security controls.

## CI/CD Gates

- `intel_ingest_determinism.sh`: byte equality on `report.json`.
- `graphika_connector_regression.sh`: output hash match.
- `meta_atr_indicator_safety.sh`: defang/no-fetch enforced.
- `graph_builder_determinism.sh`: byte equality on graph output.
- `benchmark_regression.sh`: lead-time benchmark regression guard.

## PR Package (Expected)

- **Commit History** (one commit per PR scope):
  - `feat: add deterministic intel ingest core`
  - `feat: add graphika connector threattrace extraction`
  - `feat: add meta atr connector and indicator defang`
  - `feat: add threattrace graph builder and suppression tags`
  - `feat: add necosys benchmark and analyst review workflow`
- **PR Description**:
  - What/Why/How, risks, rollback plan, evidence bundle paths.
- **Reviewer Checklist**:
  - Determinism gates pass, indicator defang pass, evidence artifacts present.
- **Merge Readiness**:
  - GA gates satisfied, governed exceptions logged if applicable.
- **Post-Merge Validation**:
  - Re-run `make intel-ingest`, `make threattrace-build`, `make eval-necosys`.

## Future Roadmap (Forward-Leaning Enhancements)

1. **Narrative↔Disruption Alignment Engine**: compute time-to-action distributions per actor archetype.
2. **Suppression-Control Taxonomy Expansion**: unify evasion + platform action taxonomy into policy-as-code.
3. **Evidence Graph Snapshots**: tenant-safe export bundles with deterministic hashes and signed provenance.

## Operational Constraints

- Offline bundles are the only source of truth; live scraping is intentionally constrained.
- Multi-tenant allowlists enforce restricted-source handling.
- Evidence artifacts are required for all runs and audits.

## Finality Statement

This plan is authoritative for ThreatTrace subsumption under the current governance stack. Any deviation is a governed exception recorded in the provenance ledger.
