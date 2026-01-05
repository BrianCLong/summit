# CompanyOS Sprint 03 — Policy + Export Determinism + API Contract

Implement GA-core hardening for deterministic reporting exports and provenance visibility.

Scope:

- server/src/services/ReportService.js
- docs/roadmap/STATUS.json

Requirements:

- Stabilize report output ordering and timestamps when deterministic mode is enabled.
- Inject provenance footer details (build/version, policy bundle hash, export hash, time window).
- Update roadmap status timestamp/note to reflect the change.
