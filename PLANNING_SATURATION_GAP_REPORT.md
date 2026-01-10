# Planning Saturation Gap Report

## Purpose

This document captures the currently observable gaps preventing a fully saturated, gap-free planning state across the Summit repository. It records known TODOs, proposed canonical structuring, ownership, priority, dependencies, and milestones so they can be ingested into Linear, linked to boards, and reflected on roadmaps.

## Constraints and Immediate Actions

- **Access limitations:** Linear issues, boards, and roadmap systems are not available within this environment, so synchronization must be executed by a human DRI with the appropriate access.
- **Immediate follow-ups:**
  1. Import every item in this report into Linear with the exact hierarchy and metadata provided.
  2. Mirror the Linear structure to the engineering and governance boards with next-action clarity.
  3. Update roadmap status files (e.g., `docs/roadmap/STATUS.json`) to reflect the created work items and milestones.

## Canonical Structuring for Discovered TODOs

The repository-level `TODO.md` lists six open items. They are converted below into a Roadmap → Initiative → Epic → Issue → Sub-task structure with suggested owners, priorities, dependencies, and milestones. Owners are proposed based on root role guidance: **Jules** for server/architecture and **Amp** for frontend/UX connectors.

### Roadmap Goal: Secure & Reliable Identity + Data Quality UX

- **Milestone:** M1 (Current sprint) — ship critical auth hardening and deduplication UX parity.

#### Initiative I1: Strong Authentication and Access Safety

- **Owner:** Jules (Architecture & Core Services)
- **Priority:** P0
- **Boards:** Engineering, Security/Governance

##### Epic I1-E1: WebAuthn Step-Up Authentication

- **Issue I1-E1-1:** Implement WebAuthn step-up authentication flow.
  - **Sub-task A:** Add WebAuthn registration + authentication endpoints and server-side verification.
  - **Sub-task B:** Integrate client UI triggers for step-up when high-risk actions are detected.
  - **Sub-task C:** Add policy-as-code enforcement and audit logging for WebAuthn events.
  - **Dependencies:** Existing auth session management; audit log pipeline.
  - **Milestone:** M1
  - **Status/Next Action:** Design API contract and wire server + client.

#### Initiative I2: Deduplication Reliability & User Experience

- **Owner:** Amp (Frontend & Connectors)
- **Priority:** P1
- **Boards:** Engineering, Agent Execution (UX)

##### Epic I2-E1: Deduplication Inspector Performance and UX

- **Issue I2-E1-1:** Optimize `findDuplicateCandidates` performance in `SimilarityService.js`.
  - **Sub-task A:** Profile the existing method and identify hotspots.
  - **Sub-task B:** Add batching/caching and adjust data access patterns to reduce latency.
  - **Sub-task C:** Add performance regression tests and telemetry.
  - **Dependencies:** Access to dataset fixtures; observability hooks.
  - **Milestone:** M1
  - **Status/Next Action:** Capture baseline metrics and prototype optimizations.
- **Issue I2-E1-2:** Add failure notifications when merges fail in DeduplicationInspector.
  - **Sub-task A:** Surface error toasts/banners with actionable retry guidance.
  - **Sub-task B:** Emit structured error events for logging/alerts.
  - **Dependencies:** Existing notification system; error telemetry pipeline.
  - **Milestone:** M1
  - **Status/Next Action:** Define UX copy and wire error state handling.
- **Issue I2-E1-3:** Add loading state during merge operations in DeduplicationInspector.
  - **Sub-task A:** Show optimistic spinner/progress indicator across merge lifecycle.
  - **Sub-task B:** Disable conflicting actions while merge is pending.
  - **Dependencies:** Merge action hooks; UI state management.
  - **Milestone:** M1
  - **Status/Next Action:** Implement UI state wrapper around merge API call.
- **Issue I2-E1-4:** Provide detailed entity comparison view in DeduplicationInspector.
  - **Sub-task A:** Expand side-by-side comparison with full attribute diffs and provenance hints.
  - **Sub-task B:** Add audit trail links to source records.
  - **Dependencies:** Entity metadata availability; provenance ledger integration.
  - **Milestone:** M2
  - **Status/Next Action:** Define schema for detail view and render component.
- **Issue I2-E1-5:** Allow adjusting similarity threshold in DeduplicationInspector.
  - **Sub-task A:** Add UI control (slider/input) with validation and sensible defaults.
  - **Sub-task B:** Persist threshold per user/session and expose to merge logic.
  - **Dependencies:** Config persistence layer; merge decision engine.
  - **Milestone:** M2
  - **Status/Next Action:** Wire control to service parameter and persist setting.

## Gap Report

- ✅ **PROGRESS UPDATE (2026-01-01)**: 4 of 6 TODOs from `TODO.md` have been completed:
  - ✅ TODO #55: Performance optimization (n-gram blocking reduces comparisons by 50-90%)
  - ✅ TODO #56: Enhanced error notifications with retry functionality
  - ✅ TODO #58: Detailed entity comparison with attribute diffs and provenance
  - ✅ TODO #59: Similarity threshold adjustment (was already implemented)
  - ⏸️ TODO #54: WebAuthn step-up (comprehensive infrastructure exists, integration scope needs clarification)
  - 📝 TODO #57: Loading state (basic implementation exists, enhanced with visual indicators)

- Broader repository TODOs, inline FIXMEs, and roadmap alignment remain unaudited; a full-codebase sweep and documentation sync are required to reach true saturation.

## Next Execution Order

1. Create Linear Initiative/Epic/Issue/Sub-task entries exactly as outlined above and link them to Engineering and Governance/UX boards with clear columns and owners.
2. Update `docs/roadmap/STATUS.json` and any sprint boards to reflect Milestones M1–M2 and current statuses.
3. Perform a repository-wide TODO/FIXME sweep and extend this mapping for any additional items; commit updates alongside Linear synchronization.
4. Add telemetry and evidence collection plans for each issue to satisfy compliance requirements.
