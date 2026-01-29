## Summary

<!-- What does this PR do? Link to Jira ticket or issue. -->

## Type of Change

- [ ] Bug Fix
- [ ] New Feature
- [ ] Refactor
- [ ] Documentation
- [ ] Infrastructure

## Green CI Contract Checklist

<!-- Must be checked before merge. See docs/governance/GREEN_CI_CONTRACT.md -->

- [ ] **Lint**: Ran `pnpm lint` locally.
- [ ] **Tests**: Ran `pnpm test:unit` locally.
- [ ] **Determinism**: No leaked singletons or open handles.
- [ ] **Evidence**: Added at least one test case or verification step.

## Agentic Policy (if applicable)

<!-- If this PR is authored by an agent, you MUST include a PLAN.md and check these boxes. -->

- [ ] **Plan First**: Included `PLAN.md` (required for agentic PRs).
- [ ] **Stay in Loop**: Verified no `TODO` markers left by agent.
- [ ] **Review**: I have reviewed every line of agent-generated code.

## Verification Plan

<!-- How did you verify this change? -->

- [ ] Automated Test (Unit/Integration)
- [ ] Manual Verification (describe steps below)
- [ ] Snapshot / Screenshot

```bash
# Paste verification output here
```
