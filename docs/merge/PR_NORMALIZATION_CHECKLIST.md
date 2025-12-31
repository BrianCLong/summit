# PR Normalization Checklist

**Purpose**: Ensure all PRs (bot, agent, or human-authored) meet consistent quality standards before merge.

**Scope**: Applicable to all PRs targeting main/master or release branches.

---

## Pre-Merge Checklist

### 1. Branch Hygiene

- [ ] **Branch naming**: Follows convention (`feat/`, `fix/`, `chore/`, `docs/`, `claude/`, etc.)
- [ ] **Based on latest**: Rebased onto target branch (main/master)
- [ ] **Conflicts resolved**: No merge conflicts
- [ ] **Single purpose**: PR addresses one logical change (no scope creep)

### 2. Commit Quality

- [ ] **Conventional commits**: All commits follow `type(scope): message` format
  - Types: `feat`, `fix`, `chore`, `docs`, `ci`, `test`, `refactor`, `perf`, `style`
  - Examples:
    - ✅ `feat(auth): add OAuth2 support for SSO`
    - ✅ `fix(api): resolve race condition in user lookup`
    - ✅ `chore(deps): bump axios to 1.11.0`
    - ❌ `update stuff` (too vague)
    - ❌ `WIP fixing things` (not final)

- [ ] **Squash if needed**: Complex PRs should have 1-3 logical commits (not 20+ micro-commits)
- [ ] **No "oops" commits**: Fix-up commits should be squashed before merge
- [ ] **Sign-off**: Commits signed with DCO/GPG if required

### 3. Code Quality

- [ ] **No lockfile churn**: pnpm-lock.yaml changes only if PR modifies dependencies
- [ ] **No formatting-only changes**: Avoid bulk reformatting outside touched modules
- [ ] **No unrelated renames**: Variable/function renames only if part of PR scope
- [ ] **No commented code**: Remove or explain commented blocks
- [ ] **No debug artifacts**: Remove console.log, debugger statements, temp files
- [ ] **Security**: No hardcoded secrets, credentials, or API keys

### 4. Testing & Verification

- [ ] **Tests pass**: All CI checks green (or documented exceptions)
- [ ] **Lint passes**: `pnpm -w lint` succeeds
- [ ] **Type-check passes**: `pnpm -w typecheck` succeeds
- [ ] **Build succeeds**: `pnpm -w build` completes
- [ ] **Smoke tests**: `pnpm test:smoke` passes (if applicable)
- [ ] **Manual verification**: Commands run and documented in PR description

**Verification Template**:

```bash
# Commands run to verify this PR:
pnpm -w install
pnpm -w lint
pnpm -w typecheck
pnpm -w build
pnpm test:quick

# Additional verification (if applicable):
# - Tested feature X in browser
# - Ran migration script on dev database
# - Verified API endpoint with curl
```

### 5. PR Description Quality

- [ ] **What changed**: Clear summary of changes (1-3 sentences)
- [ ] **Why**: Rationale for the change (fixes bug, adds feature, improves performance)
- [ ] **How verified**: Commands run, manual testing steps
- [ ] **Risk/rollout notes**: Any deployment considerations, breaking changes, or rollback steps
- [ ] **Screenshots/demos**: For UI changes (before/after)
- [ ] **Links**: Related issues, design docs, or prior PRs

**PR Description Template**:

```markdown
## What changed

[Brief description of changes]

## Why

[Rationale - what problem does this solve?]

## How verified

[Commands run and manual testing]

## Risk/rollout notes

- **Breaking changes**: [Yes/No - describe if yes]
- **Database migrations**: [Yes/No - describe if yes]
- **Feature flags**: [Required/Not required]
- **Rollback plan**: [Describe if risky]

## Related

- Fixes #[issue number]
- Related to #[other PR]
- Design doc: [link]
```

### 6. Dependencies & Baseline

- [ ] **No baseline churn**: PR doesn't modify workspace config, tsconfig, eslint, or build tools (unless that's the purpose)
- [ ] **Dependency updates isolated**: Dependency bumps in separate PRs from feature work
- [ ] **No workspace changes**: package.json workspaces field untouched (unless intentional)
- [ ] **No breaking deps**: New dependencies vetted for security, license, and maintenance status

### 7. Documentation

- [ ] **README updated**: If PR changes CLI, API, or setup process
- [ ] **Inline docs**: Complex logic has comments explaining "why" (not "what")
- [ ] **API docs**: OpenAPI/GraphQL schema updated if API changed
- [ ] **Migration guide**: For breaking changes (if applicable)
- [ ] **Changelog**: Entry added (if using CHANGELOG.md or changesets)

### 8. Bot/Agent PR Specific

For PRs authored by bots or AI agents (dependabot, claude, copilot, etc.):

- [ ] **Review diff carefully**: Bots can introduce subtle bugs
- [ ] **Test thoroughly**: Automated PRs still need human verification
- [ ] **Check for drift**: Ensure bot didn't revert prior fixes
- [ ] **Audit for security**: Bots may pull in vulnerable versions
- [ ] **Merge strategy**: Squash commits for clean history

---

## Merge Execution Checklist

### Pre-Merge

1. [ ] All checkboxes above completed
2. [ ] CI status: ✅ All checks passed (or exceptions documented)
3. [ ] Reviews: Minimum required approvals obtained
4. [ ] Conflicts: None (rebase if needed)
5. [ ] Blocked by: No blocking dependencies on other PRs

### Merge

6. [ ] **Merge strategy selected**:
   - ✅ Squash (default for small PRs)
   - ✅ Rebase (for clean, atomic commits)
   - ❌ Merge commit (avoid unless necessary)

7. [ ] **Merge commit message**: Descriptive, follows convention

### Post-Merge

8. [ ] **Verify main**: Check CI on main/master post-merge
9. [ ] **Monitor**: Watch for regressions in next 24 hours
10. [ ] **Cleanup**: Delete merged branch
11. [ ] **Update ledger**: Record merge in `docs/merge/MERGE_LOG.md`

---

## Merge Blockers (Do Not Merge If)

### Critical Blockers

- ❌ **CI failing**: Any required check is red
- ❌ **Conflicts**: Merge conflicts exist
- ❌ **Security scan fails**: Vulnerabilities introduced
- ❌ **Breaking main**: PR would break main branch build
- ❌ **Missing approvals**: Required reviews not obtained
- ❌ **WIP**: PR marked as draft or work-in-progress

### Review Blockers

- ❌ **No description**: PR has empty or template-only description
- ❌ **Too large**: PR changes >1000 lines without justification
- ❌ **Mixed concerns**: PR does multiple unrelated things
- ❌ **No tests**: Feature PR with zero test coverage (unless explicitly waived)

### Policy Blockers

- ❌ **License issues**: New dependencies with incompatible licenses
- ❌ **Secrets exposed**: Hardcoded credentials detected
- ❌ **Audit trail missing**: No sign-off or DCO
- ❌ **Breaking without plan**: Breaking change without migration guide

---

## Special Cases

### Emergency Hotfixes

For critical production fixes:

- [ ] Labeled `hotfix` or `emergency`
- [ ] Minimal scope (only the fix, no extras)
- [ ] Expedited review (same-day if possible)
- [ ] Extra caution: Test thoroughly despite urgency
- [ ] Post-merge: Create follow-up PR for comprehensive fix if needed

### Dependency Updates

For bot-generated dependency PRs:

- [ ] Review changelog/release notes of updated package
- [ ] Check for breaking changes
- [ ] Verify no new vulnerabilities introduced
- [ ] Run full test suite (not just quick checks)
- [ ] Group related updates (e.g., all eslint plugins together)

### Baseline/Tooling Changes

For PRs that modify workspace setup, build config, or CI:

- [ ] Extra scrutiny: These affect all developers and CI
- [ ] Test locally: Verify install, build, lint, test all work
- [ ] Communicate: Notify team before merge (may require local cleanup)
- [ ] Document: Clear instructions if developers need to run commands post-pull

---

## Automation Opportunities

Consider automating these checks:

- [Danger.js](https://danger.systems/) for PR description validation
- [Conventional Commits](https://www.conventionalcommits.org/) linter
- Lockfile change detection (flag if unrelated to PR scope)
- PR size limits (warn if >500 lines)
- Required labels (e.g., `feat`, `fix`, `breaking`)
- Automated dependency review (e.g., Dependabot, Renovate)

---

## Templates

### Minimal PR Description

````markdown
## What

Fixes race condition in user authentication flow.

## Why

Users occasionally saw "session expired" errors when navigating between pages.

## Verified

```bash
pnpm -w lint && pnpm -w test:unit
```
````

Manually tested login/logout flow 20 times - no errors.

## Risk

Low - only affects auth module, no DB changes.

````

### Comprehensive PR Description

```markdown
## Summary
Add Redis caching layer to reduce database load on high-traffic endpoints.

## Changes
- Added `packages/cache` with Redis client wrapper
- Modified API endpoints to use cache-aside pattern
- Added cache invalidation on data mutations
- Updated environment variables (see .env.example)

## Why
Database CPU usage spiking to 90%+ during peak hours. Profiling showed repeated identical queries.

## How Verified
```bash
# Baseline tests
pnpm -w install
pnpm -w lint
pnpm -w typecheck
pnpm -w build
pnpm test:integration

# Load testing
cd benchmarks && npm run load-test
# Results: 95% reduction in DB queries, p99 latency down from 450ms to 80ms
````

## Risk Assessment

**Severity**: Medium
**Rollout**: Gradual (feature flag: `ENABLE_REDIS_CACHE`)
**Rollback**: Set flag to false, no data loss (cache is not source of truth)
**Database migrations**: None
**Breaking changes**: None (opt-in via env var)

## Dependencies

- Requires Redis 6+ in production
- Added ioredis@5.x dependency
- Local dev: `docker-compose up redis`

## Monitoring

- Added Datadog metrics: `cache.hit`, `cache.miss`, `cache.error`
- Alert if cache hit rate <70%

## Related

- Fixes #1234 (Database performance degradation)
- Design doc: [link to RFC]
- Metrics dashboard: [link]

```

---

## Appendix: Express 5 Specific Guidance

For PRs touching Express server code, see also:
- [Express 5 Conflict Cookbook](./express5_conflict_cookbook.md)

Key points:
- Use `throw` in async handlers (not `next(err)`)
- One global error handler only
- Use `res.status(x).json(...)` for responses
- Return after responding to avoid "headers already sent"

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-31 | Initial checklist created | Claude (normalize-pr-backlog session) |
| 2025-12-31 | Added bot/agent PR guidance | Claude |
| 2025-12-31 | Added Express 5 reference | Claude |

---

**Next**: See [PR_MERGE_LEDGER.md](./PR_MERGE_LEDGER.md) for current merge queue and [MERGE_LOG.md](./MERGE_LOG.md) for historical record.
```
