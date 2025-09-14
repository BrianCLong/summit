
# Changelog

## [2.0.0] - 2025-09-13

### Added
- **Maestro Conductor v2.0 Vision (`[EPIC]`)**
  - Scaffolding for a `Live Safety Case` (GSN) to ensure verifiable, safe deployments.
  - Placeholders for `Neuro-Symbolic Codegen` (AST-based code generation).
  - Stubs for a `Price-Aware Router` and `Build Graph OS`.
  - Initial files for a `Zero-Trust Runtime` and `Safety-by-Simulation`.
  - Scaffolding for a `Knowledge OS` and a `Safety Case Viewer` UI.

- **Frontend Sprint 19: GA Hardening (`[EPIC]`)**
  - Implemented `StepUpAuthModal` for handling higher-privilege actions.
  - Added `EvidenceSigningView` for server-side evidence signing.
  - Created `OnboardingChecklist` and `FeedbackWidget` to improve user experience.
  - Authored `ADR-045` for CSP and Trusted Types adoption.

- **Frontend Sprint 18: Pipeline Editor & Multi-Region (`[EPIC]`)**
  - Implemented `PipelineEditorView` for template-based pipeline construction.
  - Added `MultiRegionStatusView` with a staging failover simulation.
  - Enhanced `GraphExplorerView` with server-saved views.

- **Frontend Sprint 16: Graph Explorer & Privacy (`[EPIC]`)**
  - Implemented `GraphExplorerView` for entity search and path finding.
  - Added `PrivacyConsoleView` for data governance and RTBF requests.
  - Created `BundleImporterView` for offline evidence verification.

- **Frontend Sprint 15: Tenant Admin & Governance (`[EPIC]`)**
  - Implemented admin views for `TenantAdmin` and `AuditLog` viewing.
  - Added `UsageCostView` dashboard and a `NotificationsCenter`.

- **v24 Hardening & Runtime Unification Sprint (`[EPIC]`)**
  - Updated `Justfile` and `.maestro/pipeline.yaml` with new operational recipes and CI gates (SLO checks, canary analysis).
  - Added scripts for SLO checking, migration gates, and canary analysis.
  - Scaffolding for OPA `conftest`, reusable GHA workflows, and Helm canary values.

- **RC1 Sprint (`v0.1.0-rc1`) (`[EPIC]`)**
  - Created fanned-out Maestro change specifications for all major epics.
  - Generated starter files for CI/CD (`quality.yml`), OPA policies (`abac.rego`), k6 tests, and more.
  - Added automation scripts to create GitHub issues and scaffold PRs.

### Changed
- **Husky Hooks:** Updated deprecated pre-commit and commit-msg hooks for future compatibility.
- **Base Images:** Updated sample Dockerfile to use newer Node.js version.

### Fixed
- Resolved git state conflicts during simulated sprint merges.
