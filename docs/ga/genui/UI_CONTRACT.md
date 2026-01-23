# Summit Generative UI Contract (UI Plan)

This contract is anchored to the Summit Readiness Assertion and is the authoritative policy for
model-generated UI plans in CompanyOS. It dictates the present controls and the required future
state for generative experiences. All implementations must align to this contract or be rejected at
policy preflight.

## Core Contract

1. **Structured Plan Only**
   - The model emits a JSON UI Plan. Summit renders the plan with signed components.
   - Raw HTML/JS from a model is prohibited in production surfaces.

2. **Component Registry Enforcement**
   - Every panel references a registered component (KPI, Table, Timeline, GraphView, Checklist,
     Diff, Callout, Form, Stepper, CitationList).
   - Unregistered components are rejected by the plan linter and policy filter.

3. **Provenance-First Panels**
   - Panels that assert facts must include citations before render.
   - Citation requirements are validated by plan linting and enforced during repair.

4. **Policy-Governed Rendering**
   - UI Plans pass OPA policy filters before rendering.
   - Tenant constraints (theme, accessibility, network policy) are part of the plan and enforced.

5. **Deterministic Evidence Bundles**
   - Each run stores prompt ID, tool I/O, plan hash, and renderer version.
   - Evidence bundles are replayable and auditable.

## Layout Grammar (Summary)

- `layout.pages[]` → `sections[]` → `panels[]`
- Each `panel` binds to a component kind with data requests, actions, and citation IDs.

## Required Accessibility Baseline

- Keyboard navigation required.
- Reduced motion preference respected.
- Contrast ratios meet tenant policy thresholds.

## Authority Files

- `docs/ga/genui/UI_CONTRACT.md` (this file)
- `docs/ga/genui/TOOL_MANUAL.md`
- `docs/ga/genui/ANTI_FOOTGUNS.md`

Summit executes the contract now and defines the future behavior by rejecting non-conforming plans.
