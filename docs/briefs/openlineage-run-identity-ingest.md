# OpenLineage Run Identity + Batch Emission ITEM Ingest (v1)

**Summit Readiness Assertion:** This ingest aligns to the readiness baseline defined in `docs/SUMMIT_READINESS_ASSERTION.md` and consolidates run identity governance into a single, deterministic contract for evidence and lineage. ([Summit Readiness Assertion](../SUMMIT_READINESS_ASSERTION.md))

## UEF Evidence Bundle (raw)

- **Source A:** OpenLineage Run Facets (UUIDv7 recommendation for `runId`). https://openlineage.io/docs/spec/facets/run-facets/
- **Source B:** OpenLineage Releases (batch endpoint, ordinal schema positions, JobDependenciesRunFacet, and client updates). https://github.com/OpenLineage/OpenLineage/releases

## 1.0 ITEM Ingest — What Changed (grounded)

- OpenLineage spec 1.43.x formally recommends **UUIDv7** for `runId` (sortable, globally unique run identifiers). (Source A)
- Spec adds: **batch API endpoint**, **ordinal schema positions**, and **JobDependenciesRunFacet** for richer connected lineage. (Source B)
- Python client updated alongside spec changes to support **batch endpoint emission** and **UUIDv7 adoption**. (Source B)

## 1.1 Summit Context Assumptions (explicit)

1. **Summit CI/CD emits build/test/eval artifacts per stage.**
   - **Validation plan:** Identify runner and artifact emission points; bind `runId` to stage boundaries.
2. **Summit Evidence IDs exist and are used across governance artifacts.**
   - **Validation plan:** Locate evidence schema and current run ID generator.
3. **Summit can route lineage to an OpenLineage-compatible backend.**
   - **Validation plan:** Confirm endpoints, tenancy, and auth constraints.
4. **UUIDv7 is supported across Summit’s language fleet.**
   - **Validation plan:** Standardize a canonical UUIDv7 wrapper and conformance tests.

## 1.2 Extracted Verifiable Claims (with pointers)

- **Run identity:** UUIDv7 recommended for `runId`. (Source A)
- **Batching:** Batch API endpoint added for multi-event emission. (Source B)
- **Connectivity:** JobDependenciesRunFacet and ordinal schema positions added. (Source B)
- **Client:** Python client updated to support batch + UUIDv7. (Source B)

## 1.3 Triage & Relevance (0–5)

- **Deterministic run identity (UUIDv7): 5** — Unifies CI, agents, evaluations, evidence, and lineage.
- **Batch emission: 4** — Fewer calls, fewer failure modes, consistent commit-bounded emission.
- **JobDependenciesRunFacet + ordinal positions: 3** — High value for deeper lineage, secondary to run identity.

## 1.4 Compatibility & Integration Risk Register

- **R1 — UUIDv7 implementation variance** → Canonical wrapper + conformance tests.
- **R2 — RunId reuse** → Contract: immutable `runId`, track attempts separately.
- **R3 — Batch endpoint availability** → Dual-mode fallback to single-event emission.
- **R4 — Multi-tenant leakage** → Tenant-scoped endpoints + mandatory tenant facet.
- **R5 — Sensitive metadata emission** → Redaction + allowlist + payload bounds.

## 1.5 Disposition

**INTEGRATE.** OpenLineage UUIDv7 run identity and batch emission are adopted as Summit’s canonical lineage substrate.

## 1.6 Integration Strategy — Adopt vs Build

**Adopt**
- OpenLineage `runId` semantics and UUIDv7 recommendation. (Source A)
- OpenLineage client libraries where applicable. (Source B)

**Build (Summit differentiators)**
1. **Summit Run Identity Service (SRIS):** UUIDv7 generation + validation + evidence linkage.
2. **Lineage Emission Gateway:** Batch-first emission, fallback path, tenancy enforcement, redaction.
3. **Summit Facets:** Agent session IDs, evaluation IDs, evidence IDs, policy approvals, provenance.

## 1.7 PR Stack (commit-ready plan)

### PR-1: Canonical Run Identity (UUIDv7) + Evidence Correlation
- `packages/run-identity/` (UUIDv7 wrapper + validation + run context)
- `packages/evidence/` (stamp includes `runId` + hash)
- `docs/architecture/run-identity.md`
- CI: UUIDv7 conformance + propagation regression

### PR-2: OpenLineage Emitter (single + batch)
- `packages/lineage-openlineage/` (emitter + transport + redaction + tenancy + replay fixtures)
- `docs/ops/lineage-emitter-runbook.md`
- CI: payload schema validation + batch/single equivalence

### PR-3: Summit Facets for Agent/CI Correlation
- `packages/lineage-openlineage/src/facets/summit_run_facet.json`
- `packages/agent-runtime/src/lineage_hooks.ts`
- CI: facet allowlist gate

### PR-4: CI/CD Integration (stage-boundary batching)
- `ci/scripts/emit_lineage.py`
- Pipeline updates for build/test/eval/package stages
- Evidence artifacts for lineage payload hashes

## 1.8 Governance, Security, and Compliance Defaults

- **Tenancy enforcement:** `tenantId` required; emitter refuses without it.
- **Redaction:** allowlist + denylist with policy ruleset versioning.
- **Auth:** short-lived tokens only; no static credentials in CI logs.
- **Audit:** immutable local record of payload hash + endpoint + retry trace.
- **Deterministic replay:** fixture mode for CI with stable hashes.

## 1.9 Evaluation Plan (measurable)

1. **Correlation integrity rate:** % of artifacts joinable by `(runId, evidenceId)`.
2. **Batch reliability:** success rate under network fault injection.
3. **Determinism:** replay yields identical hashes and evidence stamps.

## 1.10 Determinism & Offline Reproducibility

- Store `runId`, `runId_hash`, `repoSha`, `pipelineId`, `attempt` in evidence stamps.
- Fixture replay mode ensures offline determinism with schema validation only.

## 1.11 Supply-Chain & Licensing Controls

- Prefer official OpenLineage clients when licenses permit; otherwise, clean-room emitter.
- Emit SBOMs for lineage packages.

## 1.12 Summit-Only Differentiators (beyond ITEM)

1. **Evidence ↔ Lineage join contract** (runId + evidenceId + facet hash).
2. **Governance-grade redaction + policy proof facet**.
3. **Multi-tenant lineage firewall** with cross-tenant edge rejection.

## 1.13 Go / No-Go Gates

**GO if** UUIDv7 conformance, batch equivalence, ≥99% correlation integrity, and zero secret leaks.

**NO-GO if** missing tenantId/evidenceId linkage or any secret/PII markers in payloads.

## 1.14 MAESTRO Security Alignment

- **MAESTRO Layers:** Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** Prompt injection, tool abuse, metadata exfiltration, cross-tenant leakage.
- **Mitigations:** Tenant enforcement, redaction filters, fixture-only CI validation, audit hashes.

## 1.15 Finality

This ingest is authoritative for OpenLineage UUIDv7 run identity and batch emission adoption in Summit, and it directs immediate implementation via PR-1 through PR-4.
