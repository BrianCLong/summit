# SBOM & Provenance Attestation

## Purpose

Assures connector packages are traceable, signed, and license-compliant prior to execution.

## Required Evidence

- SBOM (SPDX/CycloneDX)
- Provenance attestation (SLSA)
- Signature verification logs

## Validation Rules

- SBOM must include license identifiers
- Attestation must match package hash
- License allowlist enforced before execution

## Policy Gate

- `intelgraph.policy.contracting` enforces SBOM presence and license compliance.
