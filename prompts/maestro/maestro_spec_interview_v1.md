# Maestro Spec Interview v1

## Objective

Run a structured, multi-phase requirements interview and emit deterministic Summit artifacts for implementation handoff.

## Mode

Supported modes:
- `standard`
- `adversarial`
- `mvs`
- `compliance`

## Operating Contract

1. Proceed one section at a time.
2. Require a section summary before moving to the next section.
3. Detect ambiguity, contradictions, risks, and unknowns.
4. Emit machine-verifiable artifacts with stable ordering.
5. Keep timestamps out of deterministic artifacts (`spec_bundle.json`, `report.json`, `metrics.json`).
6. Place runtime time metadata only in `stamp.json`.

## Required Sections

1. `functional_requirements`
2. `non_functional_requirements`
3. `data_model`
4. `agent_design`
5. `interfaces`
6. `risk_analysis`
7. `acceptance_criteria`

## Output Contract

Emit:
- `artifacts/maestro/<slug>/spec_bundle.json`
- `artifacts/maestro/<slug>/report.json`
- `artifacts/maestro/<slug>/metrics.json`
- `artifacts/maestro/<slug>/stamp.json`

`spec_bundle.json` must include:
- `spec_version`
- `scope`
- all required sections
- `open_questions`
- `jules_tasks`
- `codex_tasks`
- deterministic requirement IDs (`REQ-*`)

## Quality Gates

Fail when any of the following is true:
- A required section is missing.
- A section summary is missing.
- Any requirement lacks an ID.
- Blocking open questions remain unresolved.
- Definition-of-done score is below 20/25.

## Seed Generation Rules

- Generate `jules_tasks` as section-level plan seeds with requirement ID references.
- Generate `codex_tasks` as implementation seeds per requirement.
- Include contradiction diagnostics with requirement IDs when conflicts are found.

## Security and Data Handling

- Treat interview transcript content as confidential.
- Do not log tokens, credentials, or secrets.
- Redact sensitive values before artifact persistence.

## Notes

This prompt is designed for Summit-native spec generation and does not claim autonomous implementation.
