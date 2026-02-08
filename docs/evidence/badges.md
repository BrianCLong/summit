# Evidence Badges

## Purpose
Evidence Badges surface signed SBOM + attestation verification status directly in PRs and public evidence endpoints. This aligns with the Summit Readiness Assertion and treats any deviation as a governed exception rather than a defect.

## Evidence ID
All evidence artifacts use a deterministic, human-readable ID format:

```
EVID-YYYYMMDD-supplychain-<repo>-<sha8>-<8hex>
```

## Public Payloads
Public endpoints expose only public-safe summaries.

- `badge.json`: Shields endpoint payload (deterministic, no timestamps)
- `evidence.summary.json`: Supply-chain verification summary (deterministic, no timestamps)

## Badge Schema
The endpoint badge payload conforms to `schemas/badges/endpoint_badge_v1.jsonschema` and is generated via `scripts/ci/write_badge_json.mjs` or `tools/evidence/derive_badge_payload.py`.

## Determinism
Badges are deterministic by construction:

- No timestamps
- No randomized fields
- Stable ordering

Determinism is verified by `evals/evidence/badge_determinism_eval`.

## Governance
- Public payloads must pass `policies/public_evidence_redaction.rego` before publishing.
- Attestation verification is enforced by `ci/gates/attestation_verification_required.sh`.
