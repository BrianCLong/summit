# Maestro Decision Strip

**Priority:** P1
**Labels:** `analyst-experience`, `assistants`, `product`, `ui-ux`, `governance`

## Desired Outcome

Implement a "decision strip" on every lead in Analyst Assist v0.2 to make Maestro's governance visible and explicit.

## Description

To ensure that Maestro’s governance is felt in the UI, we need a decision strip on every lead. This strip will clearly show the decision status, confidence level, and a one-line governance rationale. It should also explicitly state the agent state so users always know who did what.

## Acceptance Criteria

- [ ] Decision strip is visible on every lead in the UI.
- [ ] Displays the current decision state (e.g., APPROVE, BLOCK, PENDING).
- [ ] Shows a confidence band/indicator for the decision.
- [ ] Includes a one-line governance rationale (e.g., "Blocked: insufficient corroborating sources; high source bias").
- [ ] Explicitly shows the agent state (e.g., "AI proposed, Maestro governed, human pending/confirmed") to clarify the chain of action.
