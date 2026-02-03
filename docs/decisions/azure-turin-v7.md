# ADR: Azure Turin v7 Integration

## Status
Accepted

## Context
Microsoft announced GA of Azure Da/Ea/Fa v7-series VMs based on AMD EPYC "Turin". Summit requires a governed way to adopt new infrastructure options to ensure cost/performance alignment and reproducibility.

## Decision
We will integrate Azure v7 VMs via a **Subsumption Bundle** pattern.
1. **Manifest-Driven:** All metadata and claims are defined in `subsumption/azure-turin-v7/manifest.yaml`.
2. **Machine-Verifiable:** A CI verifier (`scripts/ci/verify_subsumption_bundle.mjs`) ensures the bundle is complete and compliant.
3. **Deterministic Evidence:** We produce stable JSON evidence artifacts (`report.json`, `metrics.json`) to prove governance compliance.
4. **No Live Pricing (Initial):** To maintain determinism, we will not fetch live pricing in the initial bundle.

## Consequences
- **Positive:** Clear audit trail for infra adoption; deterministic CI gates.
- **Negative:** Manual updates required for pricing/region availability until off-line ingestion is built.
