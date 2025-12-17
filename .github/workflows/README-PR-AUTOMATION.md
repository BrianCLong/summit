# PR Automation Workflows

This document describes the GitHub Actions workflows that automate pull request management in this repository.

## Overview

We've implemented five automation workflows to improve PR efficiency and code quality:

1. **Dependabot Auto-Merge** - Automatically merges dependency updates after CI passes
2. **PR Auto-Labeler** - Automatically labels PRs based on files changed and PR content
3. **Auto-Assign Reviewers** - Assigns reviewers based on CODEOWNERS file
4. **PR Size Checker** - Monitors PR size and suggests splits for large PRs
5. **Test Coverage Check** - Ensures PRs include appropriate test coverage

---

## 1. Dependabot Auto-Merge

**File:** `dependabot-auto-merge.yml`

### What it does

- Automatically approves and merges Dependabot PRs after CI checks pass
- Different behavior based on update type:
  - **Patch updates** (e.g., 1.0.0 → 1.0.1): Auto-merge immediately after CI
  - **Minor updates** (e.g., 1.0.0 → 1.1.0): Auto-merge after CI with approval
  - **Major updates** (e.g., 1.0.0 → 2.0.0): Only adds a warning comment, requires manual review

### Triggers

- When Dependabot opens or updates a PR
- When CI checks complete
- When workflow runs complete

### Features

- ✅ Waits for all CI checks to pass before merging
- ✅ Adds `auto-merge-candidate` label for tracking
- ✅ Posts detailed comments for major version updates
- ✅ Uses squash merge to keep history clean

### Example

```yaml
# Dependabot PR for patch update
Updates lodash from 4.17.20 to 4.17.21
→ Auto-approved → CI runs → Auto-merged
```

---

## 2. PR Auto-Labeler

**Files:** `pr-labeler.yml`, `labeler.yml`

### What it does

Automatically applies labels to PRs based on:
- **Files changed** (from `.github/labeler.yml` config)
- **PR title** (conventional commit patterns)
- **PR body content** (keywords and markers)

### Label Categories

#### Type Labels
- `type: documentation` - Docs, markdown files
- `type: dependencies` - Package.json, lock files
- `type: security` - Security-related changes
- `type: tests` - Test files
- `type: ci/cd` - Workflow files
- `type: infrastructure` - Terraform, K8s, Docker
- `type: configuration` - Config files
- `type: database` - Migrations, schema changes
- `type: feature` - New features (from title)
- `type: bugfix` - Bug fixes (from title)
- `type: refactor` - Refactoring (from title)
- `type: performance` - Performance improvements (from title)

#### Area Labels
- `area: frontend` - Client, React, UI components
- `area: backend` - Server, API, services
- `area: graphql` - GraphQL schema, resolvers
- `area: python` - Python files
- `area: data-pipelines` - Data pipeline changes
- `area: observability` - Monitoring, metrics, tracing

#### Priority Labels
- `priority: high` - Critical files changed
- `breaking-change` - Breaking changes detected

#### Size Labels
- `size: XS` - < 10 files changed
- `size: S` - 10-29 files changed
- `size: M` - 30-99 files changed
- `size: L` - 100-499 files changed
- `size: XL` - 500+ files changed

#### Status Labels
- `status: wip` - Work in progress
- `status: needs-review` - Ready for review

### Triggers

- PR opened, synchronized, reopened, or edited

### Configuration

Edit `.github/labeler.yml` to customize file-based labeling rules.

### Example

```yaml
# PR that changes client/src/App.tsx and adds tests
→ Labeled: area: frontend, type: tests, size: S
```

---

## 3. Auto-Assign Reviewers

**File:** `pr-auto-assign-reviewers.yml`

### What it does

- Parses `.github/CODEOWNERS` file
- Matches changed files to code owners
- Automatically requests reviews from appropriate team members and teams
- Posts a comment listing assigned reviewers

### Features

- ✅ Skips draft PRs
- ✅ Skips Dependabot PRs
- ✅ Won't assign PR author as reviewer
- ✅ Prioritizes owners by number of files they own that changed
- ✅ Limits to max 3 users and 2 teams
- ✅ Handles both user and team assignments

### Triggers

- PR opened, reopened, or marked ready for review

### CODEOWNERS Format

```bash
# Directory-based ownership
/client/**                    @frontend-team
/server/**                    @backend-team

# Specific files
.github/workflows/**          @devops-team @alice
package.json                  @devops-team
```

### Example

```yaml
# PR changes files in /server/api and /server/auth
# CODEOWNERS: /server/** @backend-team @bob
→ Assigns: @backend-team, @bob
→ Comments: "👋 Auto-assigned reviewers based on CODEOWNERS"
```

---

## 4. PR Size Checker

**File:** `pr-size-checker.yml`

### What it does

- Calculates PR size based on lines changed and files modified
- Adds appropriate size label
- Warns about large PRs and suggests splitting
- Provides analysis to help identify split boundaries

### Size Thresholds

| Size | Lines Changed | Files | Label | Action |
|------|---------------|-------|-------|--------|
| XS   | < 50          | < 5   | `size: XS` | None |
| S    | < 200         | < 15  | `size: S` | None |
| M    | < 500         | < 30  | `size: M` | None |
| L    | < 1000        | < 50  | `size: L` | ⚠️ Warning comment |
| XL   | > 1000        | > 50  | `size: XL` | 🚨 Strong warning |

### Features

- ✅ Updates size label on every sync
- ✅ Removes old size labels automatically
- ✅ Provides actionable suggestions for splitting
- ✅ Analyzes file changes by directory and type
- ✅ Updates existing comments instead of spamming

### Triggers

- PR opened, synchronized, or reopened

### Example Output

For an XL PR:

```markdown
🚨 **PR is very large** (XL)

This PR has **1500 lines changed** across **75 files**.

### 🎯 Recommendation: Consider splitting this PR

1. **Split by feature**: Separate independent features
2. **Split by layer**: Separate backend, frontend, infrastructure
3. **Split by type**: Separate refactoring from new features

### 🔍 Analysis

**Top directories changed:**
- `client`: 30 files
- `server`: 25 files
- `.github`: 20 files
```

---

## 5. Test Coverage Check

**File:** `pr-test-coverage-check.yml`

### What it does

- Analyzes changed files to detect source code changes
- Checks if corresponding test files are included
- Adds appropriate labels (`needs-tests`, `has-tests`, `needs-more-tests`)
- Posts helpful comments with test recommendations

### Features

- ✅ Skips docs-only and config-only PRs
- ✅ Skips Dependabot PRs
- ✅ Calculates test-to-source file ratio
- ✅ Suggests test file locations
- ✅ Supports `no-tests-required` label override
- ✅ Updates existing comments

### Test Detection Patterns

Recognizes these as test files:
- `*.test.{ts,tsx,js,jsx}`
- `*.spec.{ts,tsx,js,jsx}`
- `__tests__/**/*`
- `tests/**/*`
- `e2e/**/*`
- `*.e2e.*`

### Labels

- `needs-tests` - Source changes without test changes
- `needs-more-tests` - Low test-to-source ratio (< 0.3)
- `has-tests` - Good test coverage
- `no-tests-required` - Override for test-exempt changes

### Triggers

- PR opened, synchronized, or reopened

### Example Output

```markdown
⚠️ **Missing Tests**

This PR modifies **5 source file(s)** but doesn't include any test changes.

### 🧪 Test Coverage Recommendations

Please consider adding tests for:
- `src/services/auth.ts`
- `src/utils/validation.ts`
- ...

### 📝 Test File Conventions

For `src/foo/bar.ts`, add tests at:
- `src/foo/bar.test.ts` (co-located)
- `src/foo/__tests__/bar.test.ts`
- `tests/foo/bar.test.ts`

### 🤔 Is this a test-exempt change?

Add the `no-tests-required` label if tests aren't needed.
```

---

## Configuration

### Required Permissions

All workflows use these permissions:

```yaml
permissions:
  contents: read
  pull-requests: write
  checks: read  # for dependabot workflow
```

### Required Secrets

- `GITHUB_TOKEN` - Automatically provided by GitHub Actions

### Repository Settings

For Dependabot auto-merge to work:

1. Enable **Allow auto-merge** in repository settings
2. Enable **Require status checks to pass before merging**
3. Configure required checks in branch protection rules

### Disabling Workflows

To disable a workflow, add this to the top of the jobs section:

```yaml
jobs:
  job-name:
    if: ${{ false }}
```

---

## Best Practices

### For Contributors

1. **Use conventional commit format in PR titles**
   - `feat: Add user authentication`
   - `fix: Resolve memory leak in cache`
   - `docs: Update API documentation`

2. **Keep PRs small** (aim for S or M size)
   - Easier to review
   - Faster to merge
   - Easier to debug if issues arise

3. **Include tests with code changes**
   - Add tests in the same PR as the code
   - If tests aren't needed, add `no-tests-required` label and explain why

4. **Review automated comments**
   - Size warnings indicate potential issues
   - Test coverage comments are helpful reminders
   - Reviewer assignments are based on CODEOWNERS

### For Maintainers

1. **Keep CODEOWNERS up to date**
   - Review quarterly or when team structure changes
   - Add high-churn files to prevent review bottlenecks

2. **Adjust thresholds as needed**
   - Edit workflow files to change size thresholds
   - Update labeler.yml to refine label patterns

3. **Monitor workflow effectiveness**
   - Check if Dependabot PRs are merging smoothly
   - Review if labels are being applied correctly
   - Ensure reviewers are being assigned appropriately

---

## Troubleshooting

### Dependabot auto-merge not working

- Check that branch protection rules allow auto-merge
- Verify all required CI checks are passing
- Check workflow run logs for errors

### Labels not being applied

- Verify `.github/labeler.yml` patterns are correct
- Check workflow permissions include `pull-requests: write`
- Review workflow run logs for errors

### Reviewers not being assigned

- Verify `.github/CODEOWNERS` file exists and is valid
- Check that referenced users/teams have repository access
- Ensure PR is not in draft state

### Test check false positives

- Add `no-tests-required` label to exempt PRs
- Update test detection patterns in workflow if needed
- Check workflow run logs to see how files were categorized

---

## Contributing

To modify these workflows:

1. Edit the workflow files in `.github/workflows/`
2. Update `.github/labeler.yml` for label patterns
3. Update `.github/CODEOWNERS` for reviewer assignments
4. Test changes in a feature branch PR
5. Submit PR with updated documentation

---

## Support

For issues or questions about PR automation:

1. Check workflow run logs in the Actions tab
2. Review this documentation
3. Open an issue with the `github-actions` label
4. Contact @intelgraph-devops-team

---

## Version History

- **2025-11-20**: Initial implementation
  - Dependabot auto-merge with CI wait
  - Comprehensive PR labeler with type/area detection
  - CODEOWNERS-based reviewer assignment
  - PR size checker with split suggestions
  - Test coverage checker with intelligent detection
