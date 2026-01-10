# Attestation

Defines how trusted execution environments (TEEs) and software supply-chain attestations are attached to evaluator artifacts.

## Attestation Types

- **Runtime attestation**: TEE quotes binding execution to measured binaries and policies.
- **Build attestation**: SBOM-derived digest verifying dependency set and compiler flags.
- **Policy attestation**: Signed statement of applied redaction/egress policy.

## Attachment Rules

- Metric proof objects and capsule witness chains should embed attestation references.
- OA/MOSA packages include build attestations for ICD generators and conformance suites.
- Label manifests include attestations for label generation pipelines when TEEs available.

## Verification

- Evaluators verify signatures and measurement values against allowlists.
- Attestations are logged in transparency log to preserve auditability.
- Attestation issuance is mediated by the attestation service (`integration/intelgraph/services/attestation_service.md`).
