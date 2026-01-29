# Atomic PR Train: AI-Era OSINT + Contested ISR Tradecraft

This document outlines the implementation plan for the OSINT Tradecraft Platform, mapped to the `summit` repository structure.

## PR-01: Evidence Bundle spec (docs only)

*   **Task**: Define the evidence bundle structure.
*   **Target**: `docs/evidence-bundles/README.md`
*   **Content**:
    *   Bundle structure (manifest, sources, transforms, citations, checks)
    *   Naming/versioning rules
    *   Minimal required fields
*   **Acceptance**: Docs build ok; structure is clear.

## PR-02: Provenance schema + minimal types

*   **Task**: Implement core provenance types.
*   **Target**: `packages/provenance/src/schema.ts`
*   **Content**:
    *   `LineageEvent`, `SourceObject`, `TransformRecord`, `CitationRecord`
    *   JSON Schema + TS types
*   **Acceptance**: Unit tests validate schema round-trip (`packages/provenance`).

## PR-03: Provenance store interface + in-memory impl

*   **Task**: Define the store interface.
*   **Target**: `packages/provenance/src/store.ts`
*   **Content**:
    *   Interface: `ProvenanceStore.putEvent/getLineage/getCitations`
    *   Implementation: `InMemoryProvenanceStore` for tests/dev
*   **Acceptance**: Tests cover append-only semantics + deterministic ordering.

## PR-04: Evidence Bundle exporter (v0)

*   **Task**: Implement the exporter logic.
*   **Target**: `packages/evidence/src/exporter.ts`
*   **Content**:
    *   `EvidenceBundleExporter` class
    *   Consumes product ID → pulls provenance + citations + checks
    *   Emits bundle directory + `manifest.json`
*   **Acceptance**: Golden-file test for manifest.

## PR-05: Citation formatter (standard-aligned fields)

*   **Task**: Implement standard-compliant citation formatting.
*   **Target**: `packages/provenance/src/citation.ts`
*   **Content**:
    *   Formatter enforcing required fields (source type, date accessed, identifier)
    *   Supports “AI-enabled service used” annotation
*   **Acceptance**: Validation tests + example bundle.

## PR-06: OSINT ingestion stub + object ID + hashing

*   **Task**: Create a minimal ingestion stub.
*   **Target**: `packages/osint-collector/src/ingest.ts`
*   **Content**:
    *   Ingestion API accepting URL/text/media
    *   Computes object hash, stores blob, records provenance event
*   **Acceptance**: Integration test creates object and lineage.

## PR-07: Basic verification checks (corroboration scaffolding)

*   **Task**: Implement verification check framework.
*   **Target**: `packages/content-verification/src/checks.ts`
*   **Content**:
    *   `CheckResult` type, registry, and runner
    *   Checks: “multi-source corroboration present?” + “timestamp sanity?”
*   **Acceptance**: Check runner outputs attached into evidence bundle.

## PR-08: Media integrity signal stub

*   **Task**: Implement media integrity placeholders.
*   **Target**: `packages/media-manipulation/src/signals.ts` (or `packages/image-forensics`)
*   **Content**:
    *   EXIF extraction (if image)
    *   Perceptual hash (if image)
    *   Default “unknown authenticity” signal
*   **Acceptance**: Deterministic output for sample media.

## PR-09: Fusion notebook claim-evidence binding (minimal UI/API)

*   **Task**: Bind claims to evidence.
*   **Target**: `packages/intelgraph/src/fusion.ts` (or `packages/fusion-analytics`)
*   **Content**:
    *   `Claim { text, confidence, evidenceRefs[] }`
    *   `Product { claims[], narrative }`
*   **Acceptance**: Evidence bundle includes claims + evidenceRefs.

## PR-10: Deception harness v0 (seeded test set)

*   **Task**: Create deception testing harness.
*   **Target**: `packages/sim-harness/src/deception.ts`
*   **Content**:
    *   `test/deception/` dataset (known-false narrative + manipulated media)
    *   Harness runner ensuring checks fire
*   **Acceptance**: CI runs harness; outputs “break rate” metric.

## PR-11: Governance gate wiring (CI)

*   **Task**: Enforce evidence bundle quality in CI.
*   **Target**: `ci/check_evidence_bundle.sh` (or GitHub Workflow)
*   **Content**:
    *   Fails if product bundle missing manifest fields
    *   Fails if citations missing required fields
*   **Acceptance**: Negative tests demonstrate gate fails correctly.

## PR-12: MVP demo script + walkthrough

*   **Task**: Create an end-to-end demo script.
*   **Target**: `scripts/demo_osint_bundle.sh`
*   **Content**:
    *   Ingests sample sources
    *   Creates product with 2 claims
    *   Runs checks
    *   Exports evidence bundle
*   **Acceptance**: One-command demo produces a bundle + short report.
