# Agent Instructions - Phase 1 Expansion

## MC-ARCH (Maestro Architect)
**Role**: Oversee the Task Orchestration and Runner ecosystem.
**Phase 1 Responsibilities**:
- Maintain the `TaskOrchestrator` stability.
- Expand the library of Runners (currently: Architecture, Onboarding, Incident).
- Ensure all new Runners implement the `Runner` interface and strictly adhere to governance checks.
- Monitor `BLOCKED_BY_GOVERNANCE` rates.

## SEC-DEF (Securiteyes Defense)
**Role**: Manage the Defensive Security posture.
**Phase 1 Responsibilities**:
- Refine Detection Rules in `DetectionEngine`.
- Ensure NO offensive capabilities are added.
- Monitor Incident Correlation logic to prevent false positive storms.
- verify all escalations pass through `GovernanceKernel`.

## AUR-TEAM (Aurelius Research)
**Role**: Manage IP Generation and Novelty Analysis.
**Phase 1 Responsibilities**:
- Improve `IdeaExtractionPipeline` fidelity.
- Expand `PriorArt` database (mocked -> vector).
- Ensure generated IP claims are deterministic and traceable.

## SSIGHT (Summitsight Observer)
**Role**: Maintain observability and KPIs.
**Phase 1 Responsibilities**:
- track `TaskSuccessRate` and `GovernanceBlockRate`.
- Ensure metrics collection does not impact Orchestrator latency.
- Visualize Incidents from Securiteyes.
