# Summit CTI Subsumption Pipeline (Architecture + Ops + Product)

## Readiness Assertion Escalation

This design operates under the **Summit Readiness Assertion** and treats any gaps as governed exceptions with explicit evidence and rollback plans. See `docs/SUMMIT_READINESS_ASSERTION.md`.

## Scope Statement

This document defines a deterministic, evidence-first CTI→Detection→Control pipeline with a dual-path model:

- **Deterministic enforcement path**: rule-based mappings that can directly gate controls.
- **Probabilistic hypothesis path**: attribution assist that can only output hypotheses with pointers, never enforcement.

All claims and outputs are pointer-linked to source evidence with reproducible hashes.

## MAESTRO Security Alignment (Required)

- **MAESTRO Layers**: Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered**: ingestion poisoning, prompt injection, dependency supply-chain compromise, tenant isolation failures, attribution misuse, tool abuse.
- **Mitigations**: allowlisted inputs + content caps, sandboxed parsers, SBOM + signature gates, tenant-scoped keys/buckets, no-claim-without-pointer policy, audit logging + anomaly alerts.

## Architecture (Services + APIs + Schemas)

### Services (filesystem layout)

```
services/
  cti_ingest/
    fetch/                  # URL fetchers, content-type allowlists, size/time caps
    normalize/              # canonical CTI schema + parsers
    provenance/             # hashing, citations, Evidence ID
    api/                    # ingestion endpoints
  ttp_mapper/
    mitre/                  # technique taxonomy + rule mapping
    controls/               # control library (IAM, CI/CD, runtime, backup)
    api/
  supply_chain_guard/
    registry/               # typosquat/slopsquat heuristics
    sbom/                   # SBOM ingestion + policy checks
    provenance/
    api/
  identity_abuse/
    detectors/              # spray, impossible travel, token anomalies
    api/
  attribution_assist/
    retrieval/              # multi-agent retrieval + evidence pointers
    justifications/         # hypothesis templates + confidence
    api/
  evidence/
    emitter/                # report.json/metrics.json/stamp.json
    schemas/
```

### Canonical Schemas

- `schemas/cti_item.schema.json`:
  - `source_url`, `retrieved_at`, `content_hash`, `extract_hash`, `citation_offsets[]`
  - `claims[]` with `pointer` references and normalized TTP tags
- `schemas/evidence_report.schema.json`:
  - `evidence_id`, `cti_item`, `control_mappings[]`, `citations[]`
- `schemas/metrics.schema.json`:
  - `ingest_success_rate`, `parse_error_rate`, `mapping_coverage`, `fp_budget`, `latency_p95_ms`
- `schemas/stamp.schema.json`:
  - `pipeline_version`, `git_commit`, `build_id`, `lockfile_hash`, `run_seed`

### APIs (minimal surface)

- `POST /cti_ingest/items` → normalized CTI item + Evidence ID
- `POST /ttp_mapper/map` → deterministic control mappings + evidence pointers
- `POST /supply_chain_guard/evaluate` → guardrail recommendations + FP budget
- `POST /identity_abuse/evaluate` → detections + identity telemetry pointers
- `POST /attribution_assist/hypothesize` → hypotheses + alternatives + pointer set
- `POST /evidence/emit` → report.json + metrics.json + stamp.json

### Dataflow (textual)

1. **Ingest**: fetch → parse → normalize → hash → Evidence ID.
2. **Map**: deterministic rule engine emits TTP→Control mapping with pointers.
3. **Guard**: supply-chain + identity detectors produce control packs.
4. **Assist**: optional attribution assist reads only pointer-linked evidence.
5. **Emit**: evidence artifacts are generated with reproducible hashes and seeds.

### Tenant Scoping

- Evidence artifacts, caches, and telemetry are **tenant-scoped** by default.
- Attribution Assist is **opt-in** and blocked from cross-tenant evidence.
- Encryption keys are per-tenant; evidence buckets are region-bound by default.

## PR-by-PR Dependency Graph (Deterministic Stack)

1. **PR-1 (CTI Canonicalization + Provenance)**
   - Add `cti_item.schema.json` and ingest pipeline.
   - Emit Evidence IDs + `report.json`.
2. **PR-2 (TTP→Control Mapping Engine)**
   - Rule-based baseline mapping.
   - Golden file regressions for known scenarios.
3. **PR-3 (Supply-Chain Guardrails Pack)**
   - Typosquat/slopsquat heuristics + SBOM gates.
   - FP budgets + regression corpora.
4. **PR-4 (Cloud Identity Abuse Pack)**
   - Spray/impossible travel/token anomaly detectors.
   - Performance budgets + determinism checks.
5. **PR-5 (Attribution Assist, gated)**
   - Hypothesis outputs with pointers; no-claim-without-pointer enforcement.

## Security Threat Model (STRIDE-Style in Prose)

- **Spoofing**: forged CTI sources → mitigate with allowlists + TLS validation + source hashing.
- **Tampering**: parser manipulation → mitigate with sandboxing + deterministic extraction + locked deps.
- **Repudiation**: denial of provenance → mitigate with hash-chained evidence + immutable audit logs.
- **Information Disclosure**: leakage of tenant data → mitigate with tenant-scoped buckets + redaction.
- **Denial of Service**: oversized inputs → mitigate with size/time caps + queue backpressure.
- **Elevation of Privilege**: attribution misuse → mitigate with pointer-only outputs + opt-in gating.

### CI Security Gates

- SBOM generation + dependency signature checks.
- Content-type allowlist enforcement in tests.
- No-claim-without-pointer test suite for attribution outputs.
- Evidence determinism tests (same snapshot → same hashes).

### Security Test Cases

- Malicious PDF with embedded scripts → parser rejects.
- Oversized content → ingestion aborts with bounded error.
- Attribution output without pointers → test fails.
- Cross-tenant evidence access → policy denies.

## Evaluation Strategy + Regression Suite

### Determinism

- Seeded test fixtures; same inputs → identical `content_hash`/`extract_hash`.
- Lockfile hash and seed recorded in `stamp.json`.

### Mapping Correctness

- Golden mapping tests for destructive, developer phishing/backdoor, and credential abuse scenarios.
- Coverage thresholds recorded in `metrics.json`.

### Supply-Chain Heuristics

- Replay public typosquat corpora with FP budget ≤ configured threshold.
- ROC-style summary metrics emitted.

### Identity Abuse Detectors

- Seeded synthetic telemetry with injected spray/impossible travel patterns.
- p95 latency bounds validated per detector.

### Attribution Assist Safety

- No-claim-without-pointer enforcement.
- Alternative hypotheses required with confidence score.

### Metrics Schema Fields

- `ingest_success_rate`
- `parse_error_rate`
- `mapping_coverage`
- `fp_budget`
- `latency_p95_ms`
- `determinism_pass_rate`
- `attribution_pointer_compliance`

## Ops Plan (GA-ready)

### Deployment Topology

- Stateless services in `services/` with queue-backed ingestion.
- Evidence artifacts written to tenant-scoped, region-bound storage.
- Offline mode supported by pre-fetched snapshots and vendored deps.

### SLOs

- Ingest success rate ≥ 99% on curated sources.
- Mapping latency p95 ≤ 300ms for deterministic mapping.
- Attribution assist p95 ≤ 2s (gated; non-blocking).

### Dashboards + Alerts

- Ingestion success/error rate.
- Evidence hash drift.
- FP budget threshold breaches.
- Attribution pointer compliance.

### Runbooks

- **Source Down**: switch to cached snapshot; emit exception record.
- **Hash Drift**: halt pipeline; compare extraction diff; create evidence ticket.
- **False-Positive Spike**: raise threshold; emit rollback action.
- **Evidence Mismatch**: invalidate run; regenerate with pinned deps.

### Rollback Strategy

- Versioned evidence artifacts with immutable tags.
- Roll back control packs by reverting mapping rules to last green evidence ID.

### OFFLINE Mode Flags

- `OFFLINE=1`
- `CTI_SNAPSHOT_DIR=...`
- `EVIDENCE_BUCKET=...`
- `RUN_SEED=...`

## Product Spec (MVP)

### Personas

- **SOC Analyst**: wants mapped detections + evidence pointers.
- **Cloud Security**: wants IAM/session abuse guardrails.
- **DevSecOps**: wants supply-chain guardrails + CI policies.

### UX Flow

CTI item → normalized claims → mapped controls → guardrail PR → evidence artifacts.

### Packaging

- Identity Abuse Pack
- Supply Chain Guardrails Pack
- Destructive Readiness Pack
- Attribution Assist (gated, opt-in)

### Pricing/Entitlements

- Attribution Assist and guardrail auto-PRs are premium entitlements.

### TTG Benchmark

- **Time-to-Guardrail (TTG)**: median time from CTI publication to merged guardrail with evidence.

### MVP Scope

- PR-1 through PR-3.
- PR-4 and PR-5 deferred pending entitlement policy and data-plane confirmation.

### Must-Not-Ship Risks

- Unsupported attribution claims.
- FP rates that block legitimate packages.
- Non-reproducible evidence artifacts.

## Deferred Pending Confirmations

- Integration surfaces (IAM, CI/CD, registry, EDR/XDR, CSPM).
- Attribution Assist GA scope vs. experimental.
- License policy for quoted spans vs. hashes only.
- MVP timeline (weeks vs. quarter).

## Decision Ledger (Governed Exceptions)

- Any variance from determinism or evidence requirements is recorded as a **Governed Exception** with rollback steps.
