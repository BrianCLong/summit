# Maestro vNext Starter Pack

Use this page to onboard teams quickly. Each row links **Schema → Example → Jira CSV** for the sprint that ships it.

| Area                       | Schema                                      | Example                             | Jira CSV                                        |
| -------------------------- | ------------------------------------------- | ----------------------------------- | ----------------------------------------------- |
| ChangePlan (Batch Changes) | `docs/schemas/changeplan.schema.json`       | `docs/examples/changeplan.yaml`     | `project_management/jira/composer-vnext+11.csv` |
| Migration Plans            | `docs/schemas/migration.schema.json`        | `docs/examples/migration.yaml`      | `project_management/jira/composer-vnext+31.csv` |
| Perf Budgets               | `docs/schemas/perf-budget.schema.json`      | `docs/examples/perf.budget.json`    | `project_management/jira/composer-vnext+20.csv` |
| Journey Budgets            | `docs/schemas/journey-budget.schema.json`   | `docs/examples/journey.budget.json` | `project_management/jira/composer-vnext+30.csv` |
| CBL v1                     | `docs/schemas/cbl.schema.json`              | `docs/examples/cbl.example.yaml`    | `project_management/jira/composer-vnext+24.csv` |
| Air‑Gap Bundle             | `docs/schemas/airgap-bundle.schema.json`    | _(create from exports)_             | `project_management/jira/composer-vnext+29.csv` |
| Evidence Pack v2           | `docs/schemas/evidence-pack-v2.schema.json` | _(emitted by pipeline)_             | `project_management/jira/composer-vnext+21.csv` |
| Experiment DSL             | `docs/schemas/experiment.schema.json`       | `docs/examples/experiment.yaml`     | `project_management/jira/composer-vnext+32.csv` |
| Runbook DSL                | `docs/schemas/runbook.schema.json`          | `docs/examples/runbook.yaml`        | `project_management/jira/composer-vnext+33.csv` |

## How to use

1. **Import Jira**: Upload the consolidated `project_management/jira/composer-vnext+15-35.csv` (or per-sprint CSVs).
2. **Enable CI validation**: The GitHub Action `validate-dsls.yml` auto-validates PRs and posts a summary comment.
3. **Pilot policies in shadow**: Start OPA in `shadow` mode using the sample input shape; flip to `enforce` by changing `mode`.
4. **Link examples to repos**: Copy templates from `docs/examples/*` into pilot repos and iterate.

> Tip: Guardrail-first rollout — start with `warn` (shadow) for 48h, then enforce.
