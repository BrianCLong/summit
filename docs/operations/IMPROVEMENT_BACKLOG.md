# Continuous Improvement Backlog

This backlog captures small, bounded improvements with clear benefits, risks, and verification. Items should be cycle-time friendly (1–2 weeks) and traceable to metrics.

## How to Propose an Item

- Provide: owner, expected benefit, risk level (Low/Med/High), verification plan, target metric and baseline, dependencies, rollback plan.
- Link to evidence (dashboards/tests) and add to the weekly Ops Review for triage.
- Closed items must include realized impact and post-verification results.

## Active Items

| ID      | Description                                                | Expected Benefit                                   | Risk   | Verification Plan                                       | Target Metric                      |
| ------- | ---------------------------------------------------------- | -------------------------------------------------- | ------ | ------------------------------------------------------- | ---------------------------------- |
| CI-001  | Trim system prompts for investigation copilot              | Reduce token usage by 8–12% without response drift | Medium | A/B compare response quality; monitor cost per 1k calls | Cost per 1k copilot calls          |
| REL-001 | Add synthetic check for failover path on ingestion service | Catch partition regressions before release         | Low    | Synthetic probe each deploy; alert on failure           | P99 failover latency & error rate  |
| SEC-001 | Enforce monthly secret rotation reminder via policy check  | Reduce stale credentials in lower envs             | Low    | CI policy-as-code gate; verify rotation timestamps      | Number of stale secrets (>30 days) |

## Completed Items (sample format)

Document completion with: date, owner, realized benefit vs expected, verification evidence link, and follow-up actions if regression lock added.
