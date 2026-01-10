# Escrowed Benchmark Label Exchange (EBLE) Core

Defines label bundle structures enabling evaluators to score systems using verifiable labels without seeing sensitive evidence.

## Bundle Components

- **Label bundle**: Label metadata, scoring attributes, confidence intervals, and verification hashes for each underlying evidence item.
- **Label manifest**: Merkle-root commitment to bundle entries, label policy (permissible disclosure rules), replay token (time window + dataset snapshot), and counterfactual deltas.
- **Evidence stubs**: Optional hashed/redacted placeholders to enable later disclosure without breaking manifests.

## Workflow

1. Receive labels from performer or evaluator-controlled sources with source provenance.
2. Normalize labels to canonical schema (task ID, entity, temporal bounds, modality, confidence, source feed).
3. Generate per-label Merkle proofs; assemble bundle hash and manifest.
4. Apply label policy to derive shareable/redacted views; emit replay token tying manifest to dataset snapshot.
5. Store manifest hash in transparency log; cache manifests by bundle hash for reuse across cycles.
6. Expose bundle and manifest retrieval via the EBLE API outline (`integration/intelgraph/api/eble_openapi.md`).

## Drift & Counterfactuals

- Track label distribution drift across assessment cycles; raise drift alarms when thresholds are exceeded.
- Produce counterfactual manifests excluding selected sources/feeds and compute scoring deltas.

## Security & Compliance

- Policy enforces field-level redaction while preserving verification hashes.
- TEE attestation supported for bundle generation when available.
- Manifests can be exported as "binder" packages for formal reviews.
