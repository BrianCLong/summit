## Pull Request Checklist

### Basic Requirements

- [ ] Code follows existing style guidelines
- [ ] Self-review of code completed
- [ ] Comments added to complex/unclear code
- [ ] Documentation updated if needed
- [ ] Tests added/updated for new functionality

### Security & Compliance

- [ ] No secrets or credentials committed
- [ ] Security implications considered and documented
- [ ] Database migrations are backward compatible (if applicable)
- [ ] Breaking changes are documented and approved
- [ ] GDPR compliance maintained for data handling

### Quality Gates

- [ ] All CI checks passing
- [ ] Code coverage maintained or improved
- [ ] Performance impact assessed (if applicable)
- [ ] Accessibility standards maintained (for UI changes)

### Release Impact

- [ ] Version bump type assessed (major/minor/patch)
- [ ] Release notes updated (for user-facing changes)
- [ ] Migration guide provided (for breaking changes)
- [ ] Rollback plan documented (for high-risk changes)

### Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Refactoring (no functional changes)

### Testing

- [ ] Unit tests pass locally
- [ ] Integration tests pass locally
- [ ] Manual testing completed
- [ ] Edge cases considered and tested

### Additional Context

<!-- Add any additional context, screenshots, or notes here -->

### Reviewer Focus Areas

<!-- Help reviewers by highlighting specific areas that need attention -->

---

By submitting this PR, I confirm:

- [ ] I have read and agree to the contribution guidelines
- [ ] This code follows our security and compliance policies
- [ ] I understand the review process and requirements

## Type

- [ ] Feature - [ ] Bug - [ ] Chore - [ ] Security - [ ] Docs

## Checklist

- [ ] Conventional Commit title
- [ ] Linked issue(s): #
- [ ] Tests added/updated
- [ ] Telemetry added (logs/metrics/traces)
- [ ] Docs updated
- [ ] No secrets/keys in diff
- [ ] Feature flag checklist completed (if applicable, see `docs/flags.md`)

## Screenshots/Notes
