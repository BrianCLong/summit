# CompanyOS UX System v0

## Purpose and scope

CompanyOS handles governance-heavy workflows that must feel explainable, safe, and fast. This document operationalizes the UX language, core components, accessibility bar, and the governance model for keeping the system cohesive as it grows across products.

## Principles

1. **Clarity over cleverness** – prefer explicit labels, progressive disclosure, and predictable placements for navigation and actions.
2. **Explainability by default** – each system action surfaces what happened, why, when, and by whom; provenance is always one tap away.
3. **Hierarchy and focus** – primary actions lead; secondary and tertiary affordances are visually distinct; command palette offers power access without clutter.
4. **Low cognitive load** – chunk complex flows; keep per-step decisions minimal; preserve user context when errors occur.
5. **Operational confidence** – always show status, risk, confidence, and source with timestamps; dual-modality cues (color + icon + text) are required.
6. **Resilience** – offline/read-only states are explicit; autosave and drafts avoid data loss; components degrade gracefully.
7. **Accessibility as baseline** – target WCAG 2.1 AA (aspire to AAA for contrast/keyboard); every component ships with ARIA-first contracts.

## Design language

### Color

- Neutral base: cool gray ramp for surfaces and dividers; avoid pure black/white to reduce glare.
- Semantic ramps (50–900): Success (green), Info (blue), Warning (amber), Danger (crimson), Neutral (gray), Pending (indigo), Confidence (teal). Use 500/600 for primary fills; 700+ for text on light backgrounds.
- Contrast: minimum 4.5:1 for text; 7:1 for critical status and audit badges. Never rely on color alone—always pair with icon and label.
- Background layering: `surface/0` (page), `surface/1` (cards), `surface/2` (overlays); elevation uses shadow softness not opacity changes to protect contrast.

### Typography

- Typeface: System UI with Inter fallback; monospace (JetBrains Mono/Consolas) for IDs, logs, and policy text.
- Scale: 12/14 (metadata), 16 (body), 18 (emphasis), 20/24/32 (headings). Line height 1.4–1.6; letter spacing normal except all-caps labels (+0.5 tracking).
- Content rules: Sentence case; avoid jargon; tooltips <120 characters; truncation always accompanied by full-value hover/focus reveal.

### Spacing and layout rhythm

- Base grid: 4px. Core increments 4/8/12/16/24/32/48. Touch targets ≥44px in both axes.
- Layout containers: page max width 1280px with responsive gutters; split panes (35/65 default) for detail/trace views; breadcrumbs persist above h1.

### Motion

- Duration ≤200ms with ease-out on entrance, ease-in on exit; `prefers-reduced-motion` disables all non-essential transitions.
- Use motion to confirm state change (filters applied, save complete) not decoration. Focus ring transitions remain instantaneous.

### Iconography and illustration

- Icon grid 16/20/24; stroke-aligned; filled variants only for critical status. Illustrations for empty/error states must stay monochrome + accent to maintain neutrality.

## Accessibility standards

- **Keyboard**: skip links, logical tab order, roving tab index for composite widgets, focus-visible always on. Keyboard parity for all actions including filter builders and graph navigation.
- **Screen readers**: ARIA roles/labels; `aria-live` polite for async updates; errors announced and linked to fields; tables expose row/column headers and sort state.
- **Forms**: programmatic labels; helper text tied via `aria-describedby`; inline validation on blur and submit; summary region for multi-error review.
- **Localization**: support bidi text; avoid concatenated strings; pluralization-safe copy.

## Core components and patterns

### Layout and navigation

- App shell with left navigation for product areas and top bar for tenant/context switching. Command palette (Cmd/Ctrl+K) with fuzzy search and policy-aware visibility rules.
- Breadcrumbs for deep resources; contextual tabs for sub-views; split-pane for entity detail + audit/trace sidecar.

### Data display

- **Tables**: density modes (comfortable/dense), pinned columns, resizable widths, sortable/filterable headers, row states (draft/locked/audited). Bulk actions show safety rails and estimated impact.
- **Timelines/Event streams**: chronological with actor badge, source, confidence, and provenance chip; jump-to-incident; SLO overlays and breach annotations.
- **Graphs/Node-link**: clustering, mini-map, keyboard navigation, hover/focus tooltips with confidence + data source; hazard overlays for policy breaches.

### Input, forms, and filters

- **Forms**: stepper for high-risk flows; autosave drafts; review/confirm step with diff vs. previous state; destructive operations require typed acknowledgment and impact list.
- **Filters**: facet panel + advanced query builder; saved views; “filter effect” chip shows record impact delta; inline badges indicate applied policies.

### Feedback and resilience

- **Errors**: structure—what happened, why, how to fix, retry, and runbook link. Preserve user input; retries are idempotent.
- **Confirmations**: tiered—low (toast), medium (modal with summary), high (typed confirmation + countdown for irreversible actions).
- **Empty states**: “What you can do now,” import/upload affordance, sample data, permissions-aware copy.

### Explainability, policy, and audit surfacing

- Persistent audit tray (recent actions with who/when/why); exportable JSON/PDF. Controls carry policy badges (policy name, enforcement mode, last evaluation).
- “Why did this happen?” panel with rule evaluation tree, inputs, overrides, lineage, confidence, and auditor notes.
- Every component emits structured telemetry: actor, action, inputs, outcome, confidence, source, timestamp, duration, and provenance reference.

### Status, risk, and confidence visuals

- Status pill = color + icon + text; include timestamp/source on hover. Risk badge expresses likelihood × impact with banding; confidence bar (0–100) labeled Low <40, Medium 40–70, High >70 with rationale link.
- Trend indicators (sparkline + delta) for SLOs and health; avoid red saturation unless breach confirmed.

## Design tokens and theming

- **Token tiers**:
  - Core primitives (raw values) scoped by mode (light/dark) and platform.
  - Semantic tokens (intent-based: `color.intent.success`, `color.surface.2`, `border.focus`).
  - Component decisions (`button.primary.bg`, `table.header.height`, `focus.ring.width`).
- **Distribution**: Publish `@intelgraph/design-tokens` (JSON + CSS vars) and `@intelgraph/ui-tokens` (platform-agnostic). Include type definitions for token names and a snapshot test suite.
- **Theming**: CSS custom properties injected at root; design tokens versioned with SemVer; light/dark/system themes plus high-contrast variant. Runtime theme switch respects `prefers-color-scheme`.

## Component implementation contracts

- React + Web Component wrappers with ARIA-first props; server-driven config schema for audit/policy widgets.
- Events emitted in a structured format (`component`, `action`, `metadata`, `provenance`, `confidence`, `timestamp`).
- Layout primitives expose slots for audit/provenance chips; tables/graphs accept `renderExplain` hooks for custom rationale content.

## Governance and contribution model

- **Source of truth**: paired Figma library + code packages; changes require synchronized updates and changelog entries.
- **RFC workflow**: design ADR (problem, options, decision), engineering spec (API/props, accessibility notes), and telemetry schema. Require paired review (design + eng) and accessibility sign-off before merge.
- **Versioning and deprecation**: SemVer; backward-compatible token updates allowed in patch; breaking component changes only in majors with codemods and migration guides.
- **Documentation**: Storybook/MDX per component with accessibility notes, theming hooks, interaction states, and telemetry contract.

## Quality, testing, and telemetry

- **Usability**: task-based tests on critical flows (policy edit, audit review, incident triage); record time-to-confidence and error recovery rate.
- **Heuristics**: Nielsen + internal explainability checklist; ship a per-component heuristic scorecard.
- **Accessibility**: automated axe/Pa11y in CI; manual screen reader and keyboard sweeps; color-blind simulation snapshots for tables/graphs; contract tests for focus management.
- **Telemetry**: capture interaction funnels, rage-clicks, keyboard usage %, “why panel open” frequency, explainability satisfaction prompt, and SLO visibility interactions. Non-PII, opt-in, with retention policy and audit export.

## Implementation and rollout

- **Packages**: `@intelgraph/design-tokens`, `@intelgraph/ui` (React + web components), `@intelgraph/ui-storybook` for documentation and visual regression baselines.
- **Pipelines**: lint tokens for contrast and naming collisions; Chromatic/Playwright visual regressions on Storybook stories; contract tests for component APIs and token snapshots; provenance event schema validation.
- **Adoption guide**: prefer new features in `packages/`; apply strangler pattern to retire legacy styles; enforce lint rule banning unthemed colors.
- **Rollout steps**: alpha (design+eng only), beta (one pilot product area), GA (org-wide) gated on a11y score, usability success rate, and telemetry health.

## Risk, status, and confidence guidance

- Risk is a pair: likelihood and impact; never compress into a single color. Show both with tooltips explaining calculation and source.
- Status badges always include label + icon + color; timestamps and source links on hover; unresolved incidents stay sticky until acknowledged.
- Confidence bands drive component affordances (e.g., low confidence disables bulk approval; medium requires secondary confirmation; high allows streamlined actions).

## Innovation track (forward-looking)

- Adaptive explainability depth tuned to user role and task criticality.
- Policy simulator UI for "what-if" scenarios with visual diffs and replayable traces.
- Trust overlays on graphs/tables showing provenance density and data freshness heatmaps.
- AI-assisted authoring that drafts form responses with inline rationale and policy references.

## Operational readiness checklist

- ☐ Component exposes ARIA contract and focus management docs.
- ☐ Telemetry schema merged and validated; emits provenance and confidence.
- ☐ Visual regression and a11y tests exist for all interactive states.
- ☐ Docs updated with migration notes and Storybook MDX examples.
- ☐ Deprecations announced with codemod if applicable; rollout owner assigned.
