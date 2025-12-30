# Attestation Patterns

## Goals

- Ensure code, templates, and runtimes are verified before execution or export.

## Sources

- **Code Measurement:** Hash of executable or WASM bundle for transform templates.
- **Runtime TEE Quote:** Attestation quote for sandbox/runtime and monitoring components.
- **Signer Registry:** Trusted signer list per tenant or environment.

## Validation Flow

1. Collect measurement hash and signer identity.
2. Verify signature against trusted signer registry.
3. Bind measurement hash to policy decision identifier and determinism token.
4. Record attestation proof in witness ledger and transparency log.

## Usage

- **SATT:** Template execution blocked unless attestation passes.
- **PQLA:** Sandbox or TEE attestation included in compliance artifact when available.
- **QSDR:** Monitoring and kill-switch logic optionally attested to prevent tampering.
- **CIRW/FASC:** Model bundles optionally attested when deployed to regulated tenants.
