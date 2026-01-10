# Maltego SCAF - Supply-Chain Assurance Fabric

## Overview

SCAF validates connector packages with SBOM, provenance attestations, and execution policies prior to use.

## Inputs

- Connector package
- SBOM and provenance attestation
- Execution policy (allowlist, rate limits, effect constraints)

## Outputs

- Assurance report
- Execution receipt with egress summary
- Transparency log digest

## Policy Gate

- SBOM presence and license validation
- Provenance attestation verification
- Enforced via `intelgraph.policy.contracting`
