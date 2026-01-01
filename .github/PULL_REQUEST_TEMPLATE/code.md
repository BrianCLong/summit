---
name: Code Change
about: Standard pull request for code changes (features, fixes, refactors)
title: ''
labels: 'area/code'
assignees: ''
---

## Summary

<!-- Concise description of what this PR does (1-2 sentences) -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactoring (no functional changes, code improvement)
- [ ] Performance improvement
- [ ] Documentation update

## Risk Assessment

<!-- Select one -->
- [ ] **Low**: No production impact, isolated change
- [ ] **Medium**: Touches shared components, needs review
- [ ] **High**: Critical path, security-sensitive, or wide-reaching

<!-- If High, tag with `risk/high` label -->

## Changes

<!-- Bullet points of what changed -->

-
-
-

## Testing

<!-- How was this tested? -->

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing performed
- [ ] CI passing (all gates green)

**Test Commands**:
```bash
pnpm test:unit
pnpm test:integration
make smoke
```

## Evidence

<!-- Required for compliance -->

- [ ] All tests pass locally
- [ ] No new lint warnings (`pnpm lint`)
- [ ] Typecheck passes (`pnpm typecheck`)
- [ ] Deterministic build verified (if applicable)

## Security Checklist

<!-- Check all that apply -->

- [ ] No secrets added to code
- [ ] Input validation added (if handling user input)
- [ ] Authorization checks present (if modifying access control)
- [ ] Audit trail updated (if high-risk operation)
- [ ] Dependencies scanned (no critical CVEs)

## Governance

- [ ] Changes comply with `AGENTS.md` and governance framework
- [ ] Policy updates included (if modifying authorization/access)
- [ ] Documentation updated (`README.md`, `docs/`)
- [ ] ADR created (if architectural decision)

## Rollback Plan

<!-- How to rollback if this causes issues in production? -->

- Revert commit: `git revert <sha>`
- Rollback command:
- Impact of rollback:

## Related Issues

Closes #
Related to #

## Reviewers

<!-- Tag specific reviewers if needed -->

@username

---

**Pre-Merge Checklist** (for reviewers):

- [ ] Code review complete
- [ ] Tests reviewed and adequate
- [ ] Documentation reviewed
- [ ] Security implications considered
- [ ] CI gates passed (ci-core, ci-verify)
