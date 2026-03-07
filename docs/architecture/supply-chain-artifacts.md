# Supply Chain Artifacts Architecture

This document defines the architecture and design goals for the deterministic artifact schemas in the Summit Supply Chain integration.

## Design Goals

1. **Deterministic Outputs**: The `report.json` and `metrics.json` outputs must be deterministically reproducible from identical normalized inputs.
2. **Machine-Verifiable JSON**: Use JSON schema to validate these outputs explicitly in pipelines and tests.
3. **Explicit Evidence IDs**: Every finding and policy outcome must reference a stable evidence ID.
4. **No Unstable Timestamps**: In `report.json` and `metrics.json`, timestamps and non-deterministic attributes are prohibited to ensure snapshot testing and drift comparison.
5. **Strict Separation**:
   - `report.json`: Semantic user and CI-facing results, explicit policy decisions, and evidence mappings.
   - `metrics.json`: Counts, performance info, and graph structural metrics.
   - `stamp.json`: Non-deterministic run metadata, versions, and clock timings.

## Model Summary
Trust evidence and provenance relationships are the primary data model. `report.json` acts as a deterministic projection of this evidence graph rather than a free-form scanner output blob.

* The schemas currently validate the foundational models required by PR1 and establish the strict structures for normalization (PR2) and trust-path evaluation (PR3).
