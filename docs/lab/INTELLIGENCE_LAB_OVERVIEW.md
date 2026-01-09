# Summit Intelligence Lab Overview

## What the Intelligence Lab is

Summit Intelligence Lab is a sandboxed experimentation surface for OSINT/IntelGraph methods. It
packages repeatable investigation recipes (playbooks + datasets + metrics) so analyst-engineers can
run, compare, and evolve analytic methods over time without touching production paths.

## Who it is for

- Analyst-engineers building and refining investigative methods.
- Red teams validating defensive analytic coverage.
- Method developers iterating on IntelGraph graph recipes and metrics.

## Relationship to existing Summit workflows

- **Observer mode:** The lab uses observer data sources as fixtures or curated inputs, keeping
  experimentation isolated from live connectors by default.
- **IntelGraph production usage:** The lab mirrors IntelGraph patterns while enforcing a lab-only
  profile to prevent accidental production integrations.
- **GA/stabilization governance:** Lab artifacts are non-blocking and do not alter GA policies;
  lab-only profiles remain opt-in and are governed by `policies/lab.yml`.

## Guardrails and governance

- Lab recipes must run under the lab profile or fail fast.
- Live connectors remain disabled unless explicitly enabled in policy.
- All lab outputs are stored under `artifacts/lab/` for repeatable comparison.

## Getting started

1. Start the lab profile: `make lab-up`.
2. Run a recipe: `node scripts/lab/run_recipe.mjs --recipe=COMPETITIVE_LANDSCAPE_V1`.
3. Generate the dashboard: `node scripts/lab/generate_lab_dashboard.mjs`.

The lab is intentionally constrained to keep experimentation fast and safe.
