# Frontend Overview (GA + Post-GA)

**Status:** Governed reference for current main
**Scope:** Web experiences supporting Investigation → Entities → Relationships → Copilot → Results

## 1) Frontend Entry Points

- **Primary web app:** `apps/` (Summit web application surface).
- **Legacy client:** `client/` (legacy IntelGraph surface).
- **Shared libraries:** `packages/` for reusable UI and shared logic.

## 2) Runtime Layer & Ops Console Surfaces

- Runtime health and release state are represented through ops-aligned UI/reporting surfaces.
- Operational source-of-truth inputs come from `docs/ops/COMMAND_CENTER.md` and `docs/ops/READINESS_INDEX.md`.
- Telemetry narratives remain consistent with `docs/agents/agent-telemetry.md`.

## 3) Connector & GA Support Surfaces

- Connector GA documentation remains anchored to `docs/architecture/CONNECTOR_GA_SUMMARY.md`.
- UI-facing connector narratives must remain consistent with release-readiness evidence.

## 4) Data Flow (Web)

1. **UI → API:** client requests traverse GraphQL/REST interfaces in server zone.
2. **State → Evidence:** operator-visible states map to evidence artifacts in `docs/ops/`.
3. **Results → Governance:** rendered outcomes remain bounded by governance and readiness constraints.

## 5) Architecture Lab Fence

- Architecture Lab work must use `archlab/*` branches.
- Treat changes as post-GA unless explicitly tagged `GA-support`.
- Keep Architecture Lab work docs-only while GA stabilization is active.

## 6) Merge-Readiness Criteria (Docs Lane)

- All assertions are backed by linked source artifacts.
- No runtime behavior changes are introduced from this document lane.
- Any ambiguous status must become an owner-assigned action in ops docs.
