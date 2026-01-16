# External Attestation Contract

**Version:** 1.0.0
**Scope:** Third-party independent verification of Summit supply chain artifacts.

## 1. Principles
1.  **Read-Only Inputs**: Attestations ingest the public artifact bundle only.
2.  **No Secrets**: Verification must rely solely on public keys and artifact hashes.
3.  **Non-Authoritative**: External attestations are *evidence*. They cannot override internal failures (RED state).
4.  **No Side Effects**: Ingestion processes must not mutate artifact content.

## 2. Ingestion Interface

Attestations are ingested via the `artifacts/attestations/inbox/` directory.

### Format
Files must match `*.attestation.json` and validate against `schemas/external_attestation.schema.json`.

### Verification Logic
The CI pipeline executes `scripts/ci/verify_external_attestation.mjs` which:
1.  Validates JSON Schema.
2.  Verifies cryptographic signature using the attestor's known public key (identity map).
3.  Matches declared artifact SHA256 hashes against the **current build context**.
4.  Emits `artifacts/attestations/verification_result.json`.

## 3. Trust Impact
*   **Valid Attestation**: Adds positive signal to `soc_evidence.json`. MAY lift `freshness` state if policy allows.
*   **Invalid Attestation**: Logs warning. Does NOT fail the build (robustness).
*   **Missing Attestation**: Neutral.

## 4. Identity Management
Attestor public keys are strictly managed in `docs/security/trusted_attestors.json` (or similar config). Dynamic keys are rejected.
