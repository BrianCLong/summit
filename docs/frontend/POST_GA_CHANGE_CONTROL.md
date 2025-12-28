# Post-GA Frontend Change Control (Summit)

**Scope (GA-locked UI):**

- `apps/web/src/pages/**`
- `apps/web/src/components/**`
- `apps/web/src/features/**`
- `apps/web/src/summitsight/**`
- `apps/web/src/telemetry/**`
- `apps/web/src/App.tsx`

These paths are considered **GA-locked** and must follow the rules below.

## Allowed Post-GA Changes

- Bug fixes that correct incorrect behavior or prevent crashes.
- Observability improvements (error visibility, telemetry reliability).
- Accessibility improvements and UX clarity that **do not** add new features.
- Performance fixes that do not alter product scope or metrics semantics.
- Documentation and operational guidance (no roadmap language).

## Prohibited Post-GA Changes

- New user-facing features or scope expansion.
- Changes that alter the semantics of metrics, labels, or claims.
- Experimental UX or “best‑effort” rendering that hides data gaps.
- Governance or compliance relaxation of any kind.

## Required Approvals

**Release Captain approval required when:**

- Modifying any GA-locked UI paths listed above.
- Changing user-visible text on critical screens (claims, status labels, warnings).
- Altering error states, loading states, or empty-state messaging.

**Compliance review required when:**

- Updating telemetry, analytics, or error reporting payloads.
- Changing any copy that describes data accuracy, confidence, or provenance.
- Adjusting access control, RBAC/ABAC gating, or data visibility.

**Explicit customer communication required when:**

- UI copy that describes system capability or data accuracy changes.
- UI labels for modeled/forecasted/simulated data change.

## Enforcement Expectations

- All changes must include deterministic tests for critical copy or labels.
- Do not merge if tests are flaky or if error states degrade into silence.
- `scripts/check-boundaries.cjs` must be green before submission.
- Release notes must explicitly call out any approved GA-locked changes.

## Ownership

- **Frontend Steward**: accountable for adherence to this document.
- **Release Captain**: final approval authority for GA-locked modifications.
