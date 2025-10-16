# Maestro Composer vNext+11…35 Execution Pack

This pack adds import-ready Jira CSVs, core schemas, and example configs for all vNext sprints 11–35. Use project_management/jira CSVs to seed issues, and docs/schemas + docs/examples to wire CI and policies incrementally.

Highlights

- ChangePlan.yaml schema and example for Batch Change Orchestrator (vNext+11)
- Experiment/Runbook/Migration/PerfBudget/JourneyBudget/CBL/Airgap/Evidence schemas (vNext+12…+35)
- Per-sprint Jira CSVs (+15…+35) and a consolidated import

Next Steps

1. Import desired CSVs into Jira (one per sprint or the consolidated file)
2. Adopt schemas gradually (validate in CI), starting with changeplan.schema.json and perf/journey budgets
3. Use examples in docs/examples as templates when piloting features
