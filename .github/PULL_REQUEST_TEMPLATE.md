# Pull Request

## 📋 Description

### What does this PR do?
<!-- Brief summary of the changes in this PR -->

### Why are these changes needed?
<!-- Explain the motivation and context -->

### Related Issues
<!-- Link related issues using #issue-number -->
- Closes #
- Relates to #

### Type of Change
<!-- Mark the relevant option with an 'x' -->
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🔧 Configuration change
- [ ] ♻️ Refactoring (no functional changes)
- [ ] 🎨 Style/formatting changes
- [ ] ⚡ Performance improvement
- [ ] ✅ Test updates
- [ ] 🔒 Security fix
- [ ] 🏗️ Infrastructure/DevOps change

---

## 🧪 Testing

### Test Coverage
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

### Test Results
<!-- Provide evidence that tests pass -->
```bash
# Example:
pnpm test -- path/to/test.test.ts
# All tests passing ✓
```

### Golden Path Validation
- [ ] `make smoke` passes locally
- [ ] No regressions in golden path workflow

---

## ✅ Code Quality Checklist

### Development Standards
- [ ] Code follows project conventions (see [CLAUDE.md](../CLAUDE.md))
- [ ] TypeScript types are properly defined (no excessive `any`)
- [ ] Error handling is comprehensive
- [ ] Logging is appropriate and meaningful
- [ ] No console.log statements in production code
- [ ] Code is self-documenting with clear variable/function names
- [ ] Complex logic includes explanatory comments

### Security & Compliance
- [ ] No secrets or credentials in code
- [ ] Input validation implemented where needed
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] OPA policies verified (if applicable)
- [ ] Audit logging added for sensitive operations
- [ ] Authentication/authorization checked

### Performance
- [ ] No obvious performance regressions
- [ ] Database queries are optimized
- [ ] Large datasets handled efficiently
- [ ] No memory leaks introduced

### Testing
- [ ] Code coverage meets 80%+ threshold
- [ ] Edge cases tested
- [ ] Error scenarios tested
- [ ] Tests are deterministic (no flaky tests)
- [ ] No `.only()` or `.skip()` in committed tests

---

## 📚 Documentation

- [ ] README updated (if needed)
- [ ] API documentation updated (GraphQL schema, etc.)
- [ ] Inline code comments added for complex logic
- [ ] ADR created (if architectural decision)
- [ ] CHANGELOG updated (if applicable)
- [ ] Environment variable docs updated (if new vars added)

---

## 🔧 Build & CI

### Pre-Merge Validation
- [ ] `pnpm lint` passes
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` succeeds
- [ ] `pnpm ci` passes locally
- [ ] All CI checks are green
- [ ] No merge conflicts with target branch

### Dependencies
- [ ] No new dependencies added unnecessarily
- [ ] New dependencies are well-maintained and secure
- [ ] `pnpm-lock.yaml` updated (if deps changed)
- [ ] No high/critical security vulnerabilities

---

## 🎯 Deployment Considerations

### Breaking Changes
- [ ] Breaking changes are documented
- [ ] Migration guide provided (if applicable)
- [ ] Backwards compatibility maintained (or justified)

### Database Changes
- [ ] Database migrations included
- [ ] Migrations tested (up and down)
- [ ] Data migration strategy documented (if applicable)
- [ ] No data loss risk

### Infrastructure
- [ ] Docker configuration updated (if needed)
- [ ] Environment variables documented in `.env.example`
- [ ] Kubernetes manifests updated (if applicable)
- [ ] Observability updated (metrics, traces, logs)
- [ ] Grafana dashboards updated (if applicable)

### Feature Flags
- [ ] Feature flags used for risky changes (if applicable)
- [ ] Rollback plan documented

---

## 🧠 AI Copilot Review (Optional)

If using GitHub Copilot or similar tools:
- [ ] `/explain-changes` - Generate change summary
- [ ] `/generate-tests` - Suggest additional tests
- [ ] `/risk-callouts` - Identify potential risks
- [ ] `/summarize-diff` - Create diff summary

---

## 📸 Screenshots / Videos

<!-- If UI changes, include before/after screenshots or video demos -->
<!-- You can drag and drop images here -->

### Before
<!-- Screenshot or description of current behavior -->

### After
<!-- Screenshot or description of new behavior -->

---

## 🔍 Reviewer Checklist

<!-- For reviewers - ensure these are checked before approving -->

### Code Review
- [ ] Code is clear and maintainable
- [ ] Logic is sound and efficient
- [ ] Naming conventions followed
- [ ] No obvious bugs or issues
- [ ] Security considerations addressed

### Testing Review
- [ ] Tests adequately cover the changes
- [ ] Tests are well-written and maintainable
- [ ] Edge cases covered

### Documentation Review
- [ ] Documentation is clear and complete
- [ ] API changes properly documented
- [ ] Comments are helpful and accurate

---

## 📝 Additional Notes

<!-- Any additional context, gotchas, or items for reviewers to note -->

---

## 🚀 Post-Merge Tasks

<!-- List any tasks that need to be done after merging -->
- [ ] Deploy to staging
- [ ] Monitor error rates
- [ ] Update related documentation
- [ ] Notify stakeholders
- [ ] Create follow-up issues (if needed)

---

**Review Guidelines**: See [CODE_REVIEW_GUIDELINES.md](../docs/CODE_REVIEW_GUIDELINES.md) for detailed review standards.
