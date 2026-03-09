# Agent Capability Graph Runbooks

## Runbooks
- **failed graph validation in PR:** Investigate missing or denied edges in the proposed graph traversal.
- **required-check mismatch vs graph policy:** Compare the exported `requiredChecks` in the compiler with the actual CI config.
- **drift alert triage:** Review `drift-report.json` to identify unauthorized new agents/tools.
- **emergency disable of graph enforcement workflow:** Skip the `agent-capability-graph` check via a hotfix configuration toggle.
- **snapshot hash mismatch investigation:** Validate the generated `EVID:agent-capability-graph:v1:plan:0001` hash against `stamp.json`.

## Alerts
- graph drift count > 0 on main
- denied edge attempts spike week-over-week
- validation runtime budget exceeded
- evidence contract failures on main
- mismatch between required checks and graph-exported checks

## SLO / SLA assumptions
- 99% successful graph validation execution on default branch
- 0 unauthorized traversals merged to main
- drift detection alert within 24 hours of policy mismatch
