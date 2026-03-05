# Summit Underwriting Intelligence (SUI) Architecture

## Executive disposition

Summit disposition for Orpheus in cyber-insurance workflows is **COMPETE**: ship a replayable,
agentic underwriting platform that subsumes external scoring-only products with deterministic
artifacts, provenance, and policy-guarded automation.

## MAESTRO alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** prompt-injection into analyst workflows, OSINT poisoning, tool abuse,
  tenant bleed, model non-determinism, evidence tampering.
- **Mitigations:** snapshot-centric scoring, signed evidence bundles, policy gates in CI,
  append-only audit logs, deterministic feature extraction, least-privilege connector runners.

## System objective

Build **SUI** to deliver insurer-grade capabilities in a single stack:

1. Claims-predictive scoring with explainability and quintile lift outputs.
2. Portfolio drift monitoring with remediation orchestration.
3. Underwriting packet generation for rate-quote-bind and renewals.
4. Deterministic evidence artifacts (`report.json`, `metrics.json`, `stamp.json`) for every run.

## Component boundaries

### Data plane

- `connectors/osint/`: leaked-information and external risk signal ingestion.
- `connectors/attack-surface/`: domain and exposed asset collection.
- `connectors/cve-intel/`: CVE metadata, exploit-signal feeds, PoC signal references.
- `graph/schema/insurance_risk/`: insured graph entities and risk lineage.
- `graph/provenance/`: source, timestamp, confidence, and processing lineage per feature.

### Modeling plane

- `risk_models/tide_like/`: score calibration, quintiles, lift, and rationale payloads.
- `risk_models/cve_exploit_prediction/`: exploitation probability by time horizon.
- `feature_store/`: immutable feature vectors keyed by snapshot ID.

### Agent plane

- `agents/underwriting/UnderwriteAgent`: assembles quote packet and rationale.
- `agents/portfolio/PortfolioDriftAgent`: detects posture shifts and trigger thresholds.
- `agents/remediation/RemediationAgent`: maps risk findings to control actions and tickets.

### Evidence plane

- `packages/evidence/`: schema validation, artifact emission, hash chaining.
- `packages/determinism/`: canonical JSON, seed pinning, stable sort primitives.
- `artifacts/evidence/<EVIDENCE_ID>/`: immutable evidence bundle output path.

### Experience/API plane

- `services/sui-api`: score, explain, and drift APIs.
- `apps/web` integration: underwriting workbench and portfolio command view.

## Canonical graph schema (v1)

### Entities

- `Insured` (tenant-scoped customer record)
- `Domain` (verified DNS space)
- `Asset` (host/service/cloud surface)
- `Exposure` (externally observable weakness)
- `LeakArtifact` (restricted raw leaked signal)
- `DerivedLeakSignal` (privacy-preserving feature representation)
- `CVE` (vulnerability reference)
- `Control` (implemented security control)
- `ClaimEvent` (historical claim or modeled claim label)
- `UnderwritingDecision` (versioned decision record)
- `EvidenceBundle` (deterministic output set)

### Edges

- `Insured -> OWNS -> Domain`
- `Domain -> RESOLVES_TO -> Asset`
- `Asset -> HAS_EXPOSURE -> Exposure`
- `Insured -> HAS_LEAK_SIGNAL -> DerivedLeakSignal`
- `Exposure -> MAPS_TO -> CVE`
- `Insured -> HAS_CONTROL -> Control`
- `Insured -> HAS_CLAIM_EVENT -> ClaimEvent`
- `UnderwritingDecision -> BASED_ON -> EvidenceBundle`
- `EvidenceBundle -> PROVES -> UnderwritingDecision`

## API contracts (v1)

### `POST /score`

Input:

- `tenantId`
- `insuredId`
- `snapshotId`
- `modelVersion`
- `seed`

Output:

- `riskScore`
- `riskQuintile`
- `calibratedProbability`
- `evidenceId`

### `POST /explain`

Input:

- `tenantId`
- `insuredId`
- `snapshotId`
- `scoreRunId`

Output:

- `topContributors[]`
- `controlStrengths[]`
- `recommendedActions[]`
- `explanationHash`

### `POST /portfolio/drift`

Input:

- `tenantId`
- `portfolioId`
- `baselineSnapshotId`
- `currentSnapshotId`

Output:

- `driftDetected`
- `driftFindings[]`
- `actionQueue[]`
- `evidenceId`

## Determinism strategy (snapshot-centric scoring)

- All scoring executes against immutable snapshot objects.
- Feature extraction is strictly ordered and canonicalized.
- Models are version-pinned; random seeds are explicit and recorded.
- Time-dependent signals are converted into snapshot-local event clocks.
- CI includes reproducibility test suites that fail on hash drift.

## Evidence plumbing

- `EVIDENCE_ID` format: `sui/<eval_name>/<git_sha>/<dataset_id>/<seed>`
- Bundle files:
  - `report.json`: run summary, policy checks, UDR-AC outcomes
  - `metrics.json`: model/workflow metrics and thresholds
  - `stamp.json`: commit SHA, model version, dataset hash, toolchain versions
- CI gate rejects merges if any required artifact is absent or schema-invalid.

## PR stack (implementation sequence)

1. **PR-1:** service skeleton + evidence package + deterministic smoke eval.
2. **PR-2:** insurance risk graph schema + provenance + feature extraction modules.
3. **PR-3:** TIDE-like scoring model with quintiles and explanations.
4. **PR-4:** CVE exploitation prediction subsystem and prioritization output.
5. **PR-5:** underwriting, drift, and remediation agent orchestration.
6. **PR-6:** governance/policy hardening, SBOM, and GA release controls.

## Dependency graph (high-level)

`connectors/* -> graph/ingest -> feature_store -> risk_models/* -> agents/* -> evidence/* -> API/UI`
