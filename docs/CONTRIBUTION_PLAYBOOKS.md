# Contribution Playbooks

These playbooks provide repeatable templates for common contribution types. Copy the relevant template into your issue or pull request description and replace the placeholders. Every playbook aligns with the Golden Path (make bootstrap && make up && make smoke) and our Conventional Commit and PR metadata requirements.

## Feature Contribution Playbook

**When to use:** New capability, enhancement, or configuration toggle.

**Template:**

```markdown
### Summary

- Feature goal:
- User impact:
- Feature flag or rollout plan:

### Plan

- Scope of change:
- Data/Schema impact (migrations, seeds):
- Backward compatibility strategy:
- Observability updates (metrics/logs/traces):

### Definition of Done

- [ ] Acceptance criteria validated
- [ ] Tests updated (unit/integration/e2e as applicable)
- [ ] Docs updated (user + operator)
- [ ] Golden Path (`make bootstrap && make up && make smoke`) passes
- [ ] Rollout + rollback plan documented
- [ ] Security/privacy review completed if data is touched
```

## Bugfix Contribution Playbook

**When to use:** Defect fix, regression patch, stability or performance correction.

**Template:**

```markdown
### Summary

- Issue link / reproduction steps:
- Expected vs actual:

### Scope & Safeguards

- Blast radius assessment:
- Guardrails (feature flag, canary, metrics/alerts):

### Definition of Done

- [ ] Reproduction validated
- [ ] Failing test added or updated
- [ ] Fix implemented with minimal surface area
- [ ] Regression test passes
- [ ] Golden Path (`make bootstrap && make up && make smoke`) passes
- [ ] Backport/hotfix plan (if needed)
```

## Documentation Contribution Playbook

**When to use:** New docs, doc updates, diagrams, or runbooks.

**Template:**

```markdown
### Summary

- Documentation intent:
- Audience (developer/operator/user):

### Coverage

- Pages/files touched:
- Diagrams or examples added:

### Definition of Done

- [ ] Content reviewed for accuracy and scope
- [ ] Links verified (no dead references)
- [ ] Style/voice matches repository standards
- [ ] Screenshots/assets committed (if UI change)
- [ ] PR template completed with doc context
```

## How to use these templates

1. Copy the relevant template into your issue or PR description.
2. Fill in each field with concrete details (no placeholders in final review).
3. Keep scope tight—one contribution type per PR wherever possible.
4. Attach evidence artifacts (screenshots, logs, test output) to support review.
5. Tag the Release Captain (Jules) if your change affects release timing or gating.

These playbooks ensure every contribution is reviewable, auditable, and shippable on first pass.
