# Guided Workflows Stabilization Prompt

## Objective

Stabilize the guided workflows implementation by correcting validation rules, tool output mapping, and fallback handling; improve UI data entry validation and array/number handling; and update blueprint examples/documentation to reflect the hardened behavior.

## Scope

- packages/agent-lab/src
- ui/src/components/GuidedWorkflows.jsx
- workflows/blueprints
- docs/guided-workflows.md

## Requirements

- Fix validation rules to support numeric ranges and array length checks.
- Ensure tool outputs are surfaced for output mapping and trace/debug capture.
- Enforce rate limits and fallback step routing in the orchestrator.
- Add client-side required-field validation and support for number/array inputs.
- Update blueprint examples to use the corrected validation rules.
- Keep changes self-contained and aligned with existing governance/policy tooling.
