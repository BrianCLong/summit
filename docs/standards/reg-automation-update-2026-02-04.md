# Regulatory Automation Update (Feb 4, 2026)

## Scope
This update automates the ingestion of regulatory obligations from:
1. EU AI Act (GPAI Guidelines)
2. FedRAMP 20x (Phase 2 / KSI)
3. DoD AI Strategy 2026

## Artifacts
*   **ControlPack**: JSON containing source metadata and mapped controls.
*   **ClaimMap**: JSON mapping Summit controls to regulatory claims.
*   **DriftReport**: JSON detailing changes from baseline.

## Determinism
All artifacts are generated deterministically:
*   Sorted keys
*   Content-addressed IDs (where applicable)
*   No unstable timestamps in functional artifacts (only in `stamp.json`)
