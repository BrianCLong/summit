# Continuous Improvement Backlog

This backlog captures small, bounded improvements with clear benefits, risks, and verification.
Items should be cycle-time friendly (1–2 weeks) and traceable to metrics.

## Intake Workflow

1. **Propose:** Add item with owner, benefit, risk, verification, and baseline metric.
2. **Triage:** Weekly Ops Review assigns priority and target sprint.
3. **Execute:** Deliver change with evidence and rollback plan.
4. **Verify:** Validate impact and update entry with outcomes.

## Definition of Done

- Verification completed with evidence link.
- Rollback documented.
- Regression locks added if the item prevents known failure modes.
- Results summarized in the monthly risk review.

## Backlog Record Template

| Field             | Description                |
| ----------------- | -------------------------- |
| ID                | CI-### / REL-### / SEC-### |
| Owner             | Accountable DRI            |
| Expected Benefit  | Quantified improvement     |
| Risk              | Low / Medium / High        |
| Verification Plan | Test or metric + threshold |
| Target Metric     | Baseline + target          |
| Rollback Plan     | Trigger + steps            |
| Evidence Link     | Dashboard/test output      |

## Active Items

| ID      | Description                                                | Expected Benefit                                   | Risk   | Verification Plan                                       | Target Metric                      |
| ------- | ---------------------------------------------------------- | -------------------------------------------------- | ------ | ------------------------------------------------------- | ---------------------------------- |
| CI-001  | Trim system prompts for investigation copilot              | Reduce token usage by 8–12% without response drift | Medium | A/B compare response quality; monitor cost per 1k calls | Cost per 1k copilot calls          |
| REL-001 | Add synthetic check for failover path on ingestion service | Catch partition regressions before release         | Low    | Synthetic probe each deploy; alert on failure           | P99 failover latency & error rate  |
| SEC-001 | Enforce monthly secret rotation reminder via policy check  | Reduce stale credentials in lower envs             | Low    | CI policy-as-code gate; verify rotation timestamps      | Number of stale secrets (>30 days) |

## Completed Items (sample format)

Document completion with: date, owner, realized benefit vs expected, verification evidence link,
and follow-up actions if regression lock added.
