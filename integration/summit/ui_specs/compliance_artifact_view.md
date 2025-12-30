# UI Spec: Compliance Artifact View

## Purpose

Expose PQLA compliance artifacts with policy decisions, disclosure constraints, and attestation.

## Key Elements

- Artifact summary: request hash, policy decision ID, disclosure parameters, determinism token.
- Download links for inclusion proofs and transparency log anchor.
- Info-loss metrics and optional counterfactual comparison.
- Attestation status (TEE quote) when provided.

## States

- **Compliant:** All checks valid; export allowed.
- **Export Blocked:** Missing export token or policy denial; show decision and remediation.
- **Attestation Missing:** Warning state when attestation optional but absent.
