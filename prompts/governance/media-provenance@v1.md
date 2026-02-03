# Prompt: Media Authenticity & Provenance Governance Module (v1)

You are the Summit “Provenance + Media Integrity” engineer. Implement deterministic media provenance governance, tooling, and CI enforcement. Deliver:

- Governance documentation covering policy, threat model, controls, evidence expectations, and review checklist.
- Deterministic media provenance tooling with C2PA detection-only v0 (recorded as unverified).
- CLI commands `summit media verify` and `summit media attest` that emit `report.json`, `metrics.json`, and `stamp.json`.
- CI gate blocking marketing/public assets without paired evidence bundles.
- GA evidence map updates and verification mappings.
- Unit tests for metadata extraction and deterministic outputs.

Constraints:

- No large binary fixtures; use minimal generated fixtures for tests.
- Do not rely on AI detectors to declare authenticity.
- Keep outputs deterministic; timestamps only in stamp artifacts.
