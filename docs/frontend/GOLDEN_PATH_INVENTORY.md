# Golden Path Inventory (Frontend Contracts)

This inventory defines the protected user journeys for MVP-3-GA and the
contract tier that governs each journey. Tiers determine enforcement strength
in CI and release gating.

## Tier Definitions

- **Tier 0 — Release Blocking**: Must pass in CI. Any failure blocks release.
- **Tier 1 — Strong Signal**: Must be investigated before release.
- **Tier 2 — Informational**: Observability-only (non-blocking).

## Protected Journeys

### 1) First-Load & Access Contract (Tier 0 — Release Blocking)

- **Journey**: Unauthenticated user visits the app.
- **Truths enforced**:
  - App loads without blank or broken UI.
  - Access gating redirects to a clear sign-in state.
  - Authentication errors are explicit and non-deceptive.
- **Rationale**: Prevents silent access regressions and misleading initial states.

### 2) Core Dashboard Truth — Command Center (Tier 0 — Release Blocking)

- **Journey**: Authenticated user opens the Command Center dashboard.
- **Truths enforced**:
  - KPI panel renders with explicit provenance label.
  - Time window and units are visible.
  - Change context (e.g., “last hour”) is shown with metrics.
- **Rationale**: This is a GA-critical dashboard that must not misrepresent
  data semantics.

### 3) Core Dashboard Truth — Advanced Dashboard (Tier 0 — Release Blocking)

- **Journey**: Authenticated user opens the Advanced dashboard.
- **Truths enforced**:
  - Simulated data provenance is labeled.
  - Time-window semantics are disclosed.
  - Units are disclosed.
  - Governance safety note is visible.
- **Rationale**: Complex analytics need explicit disclosure to prevent
  overclaiming.

### 4) Read-Only Interaction Contract (Tier 1 — Strong Signal)

- **Journey**: Operator views the Command Center control row.
- **Truths enforced**:
  - Autonomy-adjacent actions are disabled.
  - Disabled actions include an explicit explanation.
- **Rationale**: Prevents UX-driven overclaim and accidental autonomy.

### 5) Governance & Safety Contract (Tier 0 — Release Blocking)

- **Journey**: Operator reviews dashboard safety notices.
- **Truths enforced**:
  - Observational-only language is visible.
  - No prescriptive or imperative language appears in safety notices.
- **Rationale**: Prevents deceptive autonomy signaling.

### 6) Failure & Degradation Contract (Tier 0 — Release Blocking)

- **Journey**: Backend telemetry fails while the UI is loaded.
- **Truths enforced**:
  - Global banner explicitly states telemetry failure.
  - Users are warned about stale or incomplete data.
- **Rationale**: Prevents false confidence when backend systems are degraded.

### 7) Core Dashboard Empty State — Supply Chain (Tier 1 — Strong Signal)

- **Journey**: Authenticated user opens the Supply Chain dashboard.
- **Truths enforced**:
  - Empty state is explicit about missing data and intent.
- **Rationale**: Avoids silent fallbacks or misleading blank states.
