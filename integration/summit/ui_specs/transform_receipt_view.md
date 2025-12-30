# UI Spec: Transform Receipt View

## Purpose

Display SATT license receipts, disclosures, and attestations for executed transforms.

## Key Elements

- Receipt details: measurement hash, template version, license consumption, remaining budget.
- Witness and transparency log links with inclusion proofs.
- Disclosure summary: egress bytes, entity counts, redactions applied.
- Attestation status and runtime environment info.

## States

- **Valid:** Attestation verified, budget available.
- **Budget Exhausted:** Execution halted; show policy decision ID.
- **Revoked Signer:** Warning with guidance to refresh template or switch signer.
