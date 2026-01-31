# Competitive Intelligence Targets

This directory stores per-target CI analysis artifacts. Each target gets its own folder under
`docs/ci/targets/<target_name>/` following the protocol defined in
`docs/ci/COMPETITIVE_INTELLIGENCE_PROTOCOL.md`.

## Expected Layout

```
<target_name>/
  intake.md
  source_index.yml
  extraction.yml
  extraction.md
  integration_plan.md
  risk_register.md
  progress.yml
  pr_<nn>.md
  transcendence_plan.md
  competitive_scorecard.md
  gates.md
```

## Determinism Requirements

- Stable ordering in YAML/markdown lists.
- No timestamps in deterministic artifacts.
- Runtime metadata belongs only in a dedicated stamp file.
