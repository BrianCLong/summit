# Accessibility & Keyboard Evidence

This folder anchors accessibility and keyboard-navigation smoke evidence for the GA keyboard gate.

## Scope
- Accessibility coverage: keyboard navigation + core UI flows.
- Keyboard focus order validation for critical workflows.

## Evidence Workflow
Run `pnpm run test:a11y-gate` and attach the generated reports to this directory before release gating.
