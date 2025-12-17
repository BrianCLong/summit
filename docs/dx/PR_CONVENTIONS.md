# Pull Request Conventions

> **Goal**: Ship quality code quickly with minimal review friction.

## PR Size Guidelines

| Size | Lines Changed | Review Time | Recommendation |
|------|---------------|-------------|----------------|
| 🟢 Small | < 200 | < 30 min | Ideal |
| 🟡 Medium | 200-500 | 30-60 min | Acceptable |
| 🟠 Large | 500-1000 | 1-2 hours | Split if possible |
| 🔴 XL | > 1000 | 2+ hours | Must split |

**Check your PR size:**
```bash
summit pr size
```

## PR Checklist

Before submitting, ensure:

### Code Quality
- [ ] `summit lint` passes
- [ ] `summit typecheck` passes (or `pnpm typecheck`)
- [ ] No `console.log` in production code
- [ ] No commented-out code

### Testing
- [ ] `summit test` passes
- [ ] New code has tests
- [ ] `summit smoke` passes

### Security
- [ ] No secrets/credentials in code
- [ ] No `.env` files committed
- [ ] Input validation on user data
- [ ] Auth checks on new endpoints

### Documentation
- [ ] Complex logic has comments
- [ ] Public APIs have JSDoc
- [ ] Breaking changes documented

**Run full check:**
```bash
summit pr check
```

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(api): add entity search endpoint` |
| `fix` | Bug fix | `fix(graph): resolve connection timeout` |
| `docs` | Documentation | `docs(readme): update quickstart` |
| `style` | Formatting | `style(api): fix indentation` |
| `refactor` | Code restructure | `refactor(auth): extract token validation` |
| `perf` | Performance | `perf(query): add index for entity lookup` |
| `test` | Tests | `test(api): add entity resolver tests` |
| `chore` | Maintenance | `chore(deps): update pnpm-lock.yaml` |
| `ci` | CI/CD | `ci(github): add caching to workflow` |
| `build` | Build system | `build(docker): optimize image size` |

### Scope

Use the affected area:
- `api`, `web`, `gateway` - Services
- `graph`, `auth`, `copilot` - Features
- `db`, `redis`, `neo4j` - Data stores
- `ci`, `docker`, `k8s` - Infrastructure
- `deps` - Dependencies
- `dx` - Developer experience

### Examples

```bash
# Feature
feat(copilot): add streaming response support

# Bug fix with issue reference
fix(auth): prevent token refresh race condition

Closes #123

# Breaking change
feat(api)!: change entity response format

BREAKING CHANGE: Entity responses now use camelCase keys.
Migration: Update client code to use `entityType` instead of `entity_type`.
```

## PR Title Format

Same as commit message first line:
```
<type>(<scope>): <description>
```

Examples:
- `feat(api): add bulk entity import endpoint`
- `fix(web): resolve investigation list pagination`
- `docs(dx): add onboarding checklist`

## PR Description Template

```markdown
## Summary
<!-- 1-3 sentences describing the change -->

## Changes
<!-- Bulleted list of specific changes -->
- Added X
- Updated Y
- Fixed Z

## Test Plan
<!-- How to verify this works -->
- [ ] Automated tests pass
- [ ] Manual testing steps:
  1. Do X
  2. Verify Y

## Screenshots
<!-- If UI changes, add before/after screenshots -->

## Related Issues
<!-- Link to related issues/tickets -->
Closes #123
```

## Review Guidelines

### For Authors

1. **Self-review first** - Read your own diff before requesting review
2. **Small PRs** - Split large changes into logical chunks
3. **Clear context** - Explain *why*, not just *what*
4. **Respond promptly** - Address feedback within 24 hours
5. **Don't force-push** - After review starts, add new commits

### For Reviewers

1. **Be timely** - Review within 24 hours
2. **Be constructive** - Suggest improvements, don't just criticize
3. **Use prefixes**:
   - `nit:` - Minor style suggestion, optional
   - `suggestion:` - Improvement idea, discuss
   - `question:` - Need clarification
   - `blocker:` - Must fix before merge
4. **Approve when ready** - Don't block on nits

## Merge Strategy

- **Default**: Squash and merge (clean history)
- **Large features**: Merge commit (preserve PR commits)
- **Never**: Rebase and merge (rewrites history)

## Branch Naming

```
<type>/<description>
```

Examples:
- `feature/entity-search`
- `fix/auth-timeout`
- `docs/api-examples`
- `refactor/query-layer`

## CI Requirements

All PRs must pass:
1. ✅ Lint check
2. ✅ Type check
3. ✅ Unit tests
4. ✅ Integration tests
5. ✅ Smoke tests
6. ✅ Security scan (Gitleaks)

Check locally before pushing:
```bash
summit pr check
```

## Quick Reference

```bash
# Before creating PR
summit pr check           # Run all validations
summit pr size            # Check PR size

# Commit
git add .
git commit -m "feat(scope): description"

# Push and create PR
git push -u origin feature/my-feature
# Then create PR on GitHub
```
