# CI/CD Best Practices & Troubleshooting Guide

> **Last Updated**: 2025-11-20
> **Audience**: Developers, DevOps Engineers, SREs
> **Purpose**: Comprehensive guide to Summit's CI/CD pipelines, best practices, and troubleshooting

## Table of Contents

1. [Overview](#overview)
2. [CI/CD Pipeline Architecture](#cicd-pipeline-architecture)
3. [Workflow Descriptions](#workflow-descriptions)
4. [Best Practices](#best-practices)
5. [Troubleshooting Guide](#troubleshooting-guide)
6. [Performance Optimization](#performance-optimization)
7. [Security Considerations](#security-considerations)
8. [Monitoring and Observability](#monitoring-and-observability)

---

## Overview

Summit uses GitHub Actions for CI/CD with a multi-layered approach to ensure code quality, security, and performance. Our pipeline philosophy:

- **Fast Feedback**: Catch issues early with quick validation checks
- **Comprehensive Testing**: Multiple layers of testing (unit, integration, E2E, performance)
- **Security First**: Automated security scanning and vulnerability detection
- **Quality Gates**: Code quality, complexity, and maintainability checks
- **Automated Releases**: Release notes generation and semantic versioning
- **Performance Monitoring**: Bundle size tracking and runtime performance regression testing

### Key Principles

1. **Green Main Branch**: The main branch should always be deployable
2. **Fail Fast**: Quick validation checks run first to provide fast feedback
3. **Parallel Execution**: Independent checks run in parallel for speed
4. **Idempotency**: Workflows should be repeatable and deterministic
5. **Security by Default**: All PRs undergo security scanning
6. **Performance Awareness**: Track and prevent performance regressions

---

## CI/CD Pipeline Architecture

### Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│                    Pull Request Opened                       │
└────────────────────┬────────────────────────────────────────┘
                     │
    ┌────────────────┴────────────────┐
    │                                  │
    v                                  v
┌───────────────┐              ┌──────────────┐
│  Quick Checks │              │  PR Analysis │
│  - Lint       │              │  - Size      │
│  - Format     │              │  - Risk      │
│  - Secrets    │              │  - Labels    │
└───────┬───────┘              └──────┬───────┘
        │                             │
        └──────────┬──────────────────┘
                   │
                   v
        ┌──────────────────┐
        │  Build & Test    │
        │  - Typecheck     │
        │  - Unit Tests    │
        │  - Integration   │
        └────────┬─────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
    v                         v
┌──────────┐         ┌────────────────┐
│ Quality  │         │   Security     │
│ Gates    │         │   Scanning     │
│ - Complex│         │   - Gitleaks   │
│ - Maintain│        │   - Trivy      │
│ - Duplic │         │   - Audit      │
└────┬─────┘         └────────┬───────┘
     │                        │
     └──────────┬─────────────┘
                │
                v
      ┌─────────────────┐
      │  Performance    │
      │  - Bundle Size  │
      │  - Build Time   │
      │  - Runtime      │
      └────────┬────────┘
               │
               v
      ┌────────────────┐
      │  High Risk?    │
      │  - E2E Tests   │
      │  - Extra Review│
      └────────┬───────┘
               │
               v
      ┌────────────────┐
      │   Merge to     │
      │     Main       │
      └────────┬───────┘
               │
               v
      ┌────────────────┐
      │  Release       │
      │  - Build       │
      │  - Tag         │
      │  - Deploy      │
      └────────────────┘
```

### Workflow Files

| Workflow | Trigger | Purpose | Duration |
|----------|---------|---------|----------|
| `ci.yml` | PR, main push | Core CI pipeline | ~10-15 min |
| `pr-size-check.yml` | PR open/sync | Analyze PR size | ~1 min |
| `pr-validation.yml` | PR open/sync | Comprehensive validation | ~15-30 min |
| `code-quality-gates.yml` | PR code changes | Quality analysis | ~5-10 min |
| `performance-regression.yml` | PR, main push | Performance testing | ~10-15 min |
| `release-notes.yml` | Tag push, main push | Generate release notes | ~2-5 min |
| `security.yml` | PR, scheduled | Security scanning | ~10-15 min |

---

## Workflow Descriptions

### 1. PR Size Check (`pr-size-check.yml`)

**Purpose**: Analyze PR size and provide splitting recommendations

**Triggers**:
- Pull request opened
- Pull request synchronized (new commits)
- Pull request reopened

**What it does**:
- Counts changed files and lines
- Categorizes PR size (XS, S, M, L, XL)
- Detects mixed concerns (infrastructure + code + docs)
- Identifies large single-file changes (>500 lines)
- Provides specific splitting recommendations
- Adds size label to PR

**Size Categories**:
- **XS**: < 100 lines changed (🟢 Excellent)
- **S**: 100-299 lines (🟢 Good)
- **M**: 300-599 lines (🟡 Moderate)
- **L**: 600-999 lines (🟠 Large)
- **XL**: 1000+ lines (🔴 Too Large)

**Best Practices**:
- Aim for XS or S sized PRs
- Split large PRs by:
  - Directory/module
  - Feature vs tests
  - Infrastructure vs application code
- Use stacked PRs for large features

**Example Output**:
```markdown
## 🟢 PR Size Analysis

**Size**: `S` (245 lines changed)

### 📊 Statistics
- **Files changed**: 8
- **Additions**: +189
- **Deletions**: -56
- **Total changes**: 245

### ✅ Great job!
This PR is well-sized and should be easy to review.
```

---

### 2. Code Quality Gates (`code-quality-gates.yml`)

**Purpose**: Enforce code quality standards through automated analysis

**Triggers**:
- Pull requests modifying code files (.ts, .tsx, .js, .jsx, .py, .go, .rs)
- Manual workflow dispatch

**Quality Checks**:

#### Complexity Analysis
- **Cyclomatic Complexity**: Target < 15
- **Maintainability Index**: Target > 65
- Tools: `complexity-report`, `radon` (Python)

#### Code Duplication
- **Target**: < 5% duplication
- Tool: `jscpd`
- Detects copy-paste code across files

#### Technical Debt
- Scans for: TODO, FIXME, HACK, XXX markers
- Reports count and locations
- Recommends follow-up actions

#### Enhanced Linting
- ESLint with SARIF output
- Prettier formatting checks
- Console statement detection in production code
- Security linting rules

**Thresholds & Actions**:

| Metric | Threshold | Action |
|--------|-----------|--------|
| Cyclomatic Complexity | > 15 | ⚠️ Warning + recommendations |
| Maintainability Index | < 65 | ⚠️ Warning + refactoring suggestions |
| Code Duplication | > 5% | ⚠️ Warning + extract utilities suggestion |
| Lint Errors | > 0 | ❌ Fail + error list |
| Console Statements | Any | ⚠️ Warning (production code) |

**Example Output**:
```markdown
## 🎯 Code Quality Analysis

### 🧮 Complexity Analysis
⚠️ **High complexity detected**

**TypeScript/JavaScript files:**
- `src/services/entityService.ts`: Cyclomatic complexity = 18 (target: <15)
- `src/utils/dataProcessor.ts`: Cyclomatic complexity = 22 (target: <15)

**Recommendations:**
- Consider breaking down complex functions into smaller, focused functions
- Extract complex logic into separate helper functions
- Add unit tests for complex code paths

### 🔍 Code Duplication
✅ No significant code duplication detected

### 💳 Technical Debt Markers
Found 5 technical debt markers:
- TODO: 3
- FIXME: 2
- HACK: 0

**Details:**
- `src/api/routes.ts:45`: TODO: Add rate limiting
- `src/db/migrations/001.ts:12`: FIXME: Handle edge case
- `src/utils/parser.ts:89`: TODO: Optimize performance
```

---

### 3. Performance Regression Testing (`performance-regression.yml`)

**Purpose**: Detect and prevent performance degradations

**Triggers**:
- Pull requests with code or dependency changes
- Push to main branch
- Manual workflow dispatch

**Performance Metrics**:

#### Bundle Size Analysis
- Tracks total bundle size
- Identifies large files (>500KB)
- Compares with base branch
- Alerts on >5% increase

#### Build Performance
- Build time measurement
- TypeScript typecheck duration
- Test suite execution time
- Tracks trends over time

#### Runtime Performance
- Load testing with k6
- API response time (P95, P99, average)
- Error rate monitoring
- Throughput measurement

**Performance Targets**:

| Metric | Target | Warning Threshold |
|--------|--------|-------------------|
| P95 Response Time | < 500ms | > 500ms |
| Bundle Size Growth | < 5% | > 5% |
| Build Time | Stable | > 10% increase |
| Error Rate | < 1% | > 1% |

**Example Output**:
```markdown
## ⚡ Performance Analysis

### 📦 Bundle Size
**Total Size**: 3.45 MB
✅ Bundle size is acceptable

### 🏗️ Build Performance
- **Build time**: 127s
- **Typecheck time**: 34s
- **Test time**: 89s

### 🚀 Runtime Performance
- **Average response time**: 124ms
- **P95 response time**: 287ms
- **P99 response time**: 456ms

✅ Response times are within acceptable range

---
💡 **Performance targets**: P95 < 500ms, Bundle growth < 5%, Build time minimal
```

---

### 4. Automated Release Notes (`release-notes.yml`)

**Purpose**: Generate comprehensive release notes from conventional commits

**Triggers**:
- Push to main branch
- Tag creation (v*.*.*)
- GitHub release creation
- Manual workflow dispatch

**Features**:
- Parses conventional commits
- Categorizes changes by type
- Identifies breaking changes
- Links to commits and PRs
- Generates statistics
- Updates GitHub releases

**Commit Types Recognized**:
- `feat`: New features ✨
- `fix`: Bug fixes 🐛
- `perf`: Performance improvements ⚡
- `refactor`: Code refactoring ♻️
- `docs`: Documentation 📚
- `test`: Tests 🧪
- `chore`: Maintenance 🔧
- `BREAKING CHANGE`: Breaking changes ⚠️

**Example Output**:
```markdown
# Release Notes

## v1.2.0

**Release Date**: 2025-11-20
**Range**: v1.1.0...v1.2.0

### 📊 Summary

- ✨ **New Features**: 5
- 🐛 **Bug Fixes**: 12
- ⚠️ **Breaking Changes**: 0

### ✨ Features

- **api**: Add GraphQL subscription support ([a1b2c3d](https://github.com/...))
- **ui**: Implement dark mode toggle ([e4f5g6h](https://github.com/...))
- **search**: Add full-text search capability ([i7j8k9l](https://github.com/...))

### 🐛 Bug Fixes

- **auth**: Fix token refresh race condition ([m0n1o2p](https://github.com/...))
- **graph**: Resolve Neo4j connection timeout ([q3r4s5t](https://github.com/...))
```

---

### 5. Automated Dependency Updates (Renovate)

**Purpose**: Keep dependencies up-to-date automatically

**Configuration**: `renovate.json`

**Update Strategy**:

#### Auto-merge (Enabled)
- Patch updates for production dependencies
- Minor + patch updates for dev dependencies
- Lock file maintenance
- Docker image digest updates

#### Manual Review (Required)
- Major version updates
- Breaking changes
- Core dependencies (TypeScript, React, etc.)

**Grouping Strategy**:
- GitHub Actions updates (weekly)
- TypeScript ecosystem (grouped)
- React ecosystem (grouped)
- Testing libraries (grouped)
- Build tools (grouped)
- GraphQL packages (grouped)
- Database clients (grouped)
- Docker base images (grouped)

**Schedule**:
- Regular updates: Monday before 8am
- Lock file maintenance: Monday before 5am
- Security updates: Immediate (any time)

**Example PR**:
```markdown
🤖 chore(deps): Update testing libraries

**Package**: jest, @testing-library/react, playwright
**Change**: Multiple minor updates
**Age**: Various
**Adoption**: High
**Confidence**: High

✅ All tests passed
✅ Security scan passed
✅ Auto-merge enabled (passes CI)
```

---

## Best Practices

### Pull Request Guidelines

#### Size Recommendations
1. **Keep PRs Small**
   - Target: < 300 lines changed
   - Ideal: < 100 lines changed
   - Never exceed 1000 lines without explicit approval

2. **Single Responsibility**
   - One feature or fix per PR
   - Don't mix refactoring with new features
   - Separate infrastructure changes from application code

3. **Incremental Changes**
   - Break large features into multiple PRs
   - Use feature flags for incomplete features
   - Stack PRs when dependencies exist

#### Commit Message Standards

Follow **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, missing semicolons, etc.
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `perf`: Performance improvement
- `test`: Adding missing tests
- `chore`: Maintenance tasks

**Examples**:
```
feat(api): add entity search endpoint

Implements full-text search across entities using Neo4j
full-text indexes. Includes pagination and filtering.

Closes #123

---

fix(auth): resolve token refresh race condition

The token refresh logic had a race condition when multiple
requests triggered refresh simultaneously. Added mutex lock
to ensure single refresh operation.

Fixes #456

---

BREAKING CHANGE: remove deprecated API endpoints

The /api/v1/legacy endpoints have been removed. Use
/api/v2 endpoints instead.

Closes #789
```

#### Code Review Process

1. **Self-Review First**
   - Review your own diff before requesting review
   - Check for console.log, debugger statements
   - Ensure tests are included
   - Verify documentation is updated

2. **Address CI Failures**
   - Fix all linting errors
   - Resolve failing tests
   - Address security warnings
   - Fix complexity issues

3. **Respond to Feedback**
   - Address all review comments
   - Explain decisions when appropriate
   - Request re-review after changes

### CI/CD Optimization

#### Speed Up CI Runs

1. **Use Caching Effectively**
   ```yaml
   - uses: actions/cache@v4
     with:
       path: ~/.pnpm-store
       key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
       restore-keys: |
         ${{ runner.os }}-pnpm-
   ```

2. **Run Jobs in Parallel**
   ```yaml
   jobs:
     lint:
       runs-on: ubuntu-latest
       steps: [...]

     test:
       runs-on: ubuntu-latest
       steps: [...]

     typecheck:
       runs-on: ubuntu-latest
       steps: [...]
   ```

3. **Use Matrix Builds Sparingly**
   - Only test on Node versions you support
   - Consider testing main version on every PR, others on main push

4. **Skip Unnecessary Jobs**
   ```yaml
   on:
     pull_request:
       paths:
         - '**.ts'
         - '**.tsx'
         - '**.js'
         - '**.jsx'
   ```

#### Reduce Build Times

1. **Optimize TypeScript Compilation**
   - Use project references (`tsconfig.build.json`)
   - Enable incremental compilation
   - Use `tsc -b` for monorepo builds

2. **Optimize Test Execution**
   - Run tests in parallel: `--maxWorkers=50%`
   - Use test sharding for large suites
   - Skip E2E tests for draft PRs

3. **Optimize Docker Builds**
   - Use multi-stage builds
   - Leverage BuildKit caching
   - Use smaller base images (alpine)

### Security Best Practices

#### Secret Management

1. **Never Commit Secrets**
   - Use `.env` files (gitignored)
   - Store secrets in GitHub Secrets
   - Use secret scanning (Gitleaks)

2. **Rotate Secrets Regularly**
   - Change default passwords
   - Rotate API keys quarterly
   - Update JWT secrets on security incidents

3. **Principle of Least Privilege**
   - Grant minimum required permissions
   - Use separate service accounts
   - Implement RBAC/ABAC

#### Dependency Security

1. **Keep Dependencies Updated**
   - Enable Renovate auto-merge for patches
   - Review security advisories weekly
   - Use `pnpm audit` in CI

2. **Scan for Vulnerabilities**
   - Trivy for container images
   - npm audit for Node dependencies
   - SBOM generation for compliance

3. **Pin Docker Image Digests**
   ```yaml
   FROM node:20-alpine@sha256:abc123...
   ```

### Testing Best Practices

#### Test Pyramid

```
        /\
       /  \  E2E (Few)
      /____\
     /      \ Integration (Some)
    /________\
   /          \ Unit (Many)
  /__________\
```

1. **Unit Tests** (70-80%)
   - Fast execution
   - Test individual functions/modules
   - Mock external dependencies

2. **Integration Tests** (15-20%)
   - Test module interactions
   - Use test databases
   - Mock external APIs

3. **E2E Tests** (5-10%)
   - Test critical user flows
   - Run against full stack
   - Expensive and slow

#### Test Quality

1. **Test Naming**
   ```typescript
   describe('EntityService', () => {
     describe('create', () => {
       it('should create entity with valid data', () => {});
       it('should throw error when name is missing', () => {});
       it('should validate entity type', () => {});
     });
   });
   ```

2. **Test Structure (AAA)**
   ```typescript
   it('should calculate total correctly', () => {
     // Arrange
     const items = [1, 2, 3];

     // Act
     const result = calculateTotal(items);

     // Assert
     expect(result).toBe(6);
   });
   ```

3. **Test Coverage**
   - Target: 80% overall coverage
   - Critical paths: 100% coverage
   - Don't chase 100% blindly

---

## Troubleshooting Guide

### Common CI Failures

#### 1. Lint Failures

**Error**:
```
Error: 'foo' is assigned a value but never used  @typescript-eslint/no-unused-vars
```

**Solutions**:
```bash
# Auto-fix linting issues
pnpm run lint --fix

# Check specific files
pnpm exec eslint src/path/to/file.ts --fix

# Disable rule for specific line (use sparingly)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const unusedVar = 'value';
```

#### 2. TypeScript Errors

**Error**:
```
TS2322: Type 'string' is not assignable to type 'number'.
```

**Solutions**:
```bash
# Run typecheck locally
pnpm typecheck

# Clear TypeScript cache
rm -rf node_modules/.cache/typescript

# Rebuild project references
pnpm exec tsc -b --clean
pnpm exec tsc -b
```

#### 3. Test Failures

**Error**:
```
FAIL src/services/entityService.test.ts
  ● EntityService › create › should create entity

    Expected: 200
    Received: 500
```

**Solutions**:
```bash
# Run tests locally
pnpm test

# Run specific test file
pnpm test entityService.test.ts

# Run in watch mode
pnpm test --watch

# Clear Jest cache
jest --clearCache

# Run with verbose output
pnpm test --verbose
```

#### 4. Docker Build Failures

**Error**:
```
ERROR [builder 3/8] COPY package*.json ./
COPY failed: file not found
```

**Solutions**:
```bash
# Check Dockerfile context
ls -la

# Verify .dockerignore
cat .dockerignore

# Build locally
docker build -t test .

# Clear Docker cache
docker builder prune -af
```

#### 5. Permission Denied

**Error**:
```
Error: Resource not accessible by integration
```

**Solutions**:
1. Check workflow permissions:
   ```yaml
   permissions:
     contents: write
     pull-requests: write
   ```

2. Verify GITHUB_TOKEN has required scopes
3. Check branch protection rules
4. Ensure workflow has `write` access

#### 6. Out of Memory

**Error**:
```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solutions**:
```bash
# Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 pnpm build

# In GitHub Actions
env:
  NODE_OPTIONS: --max-old-space-size=4096
```

#### 7. Timeout Errors

**Error**:
```
Error: The operation was canceled.
```

**Solutions**:
```yaml
# Increase job timeout
jobs:
  build:
    timeout-minutes: 30  # default is 6 hours

# Increase step timeout
- name: Long running task
  timeout-minutes: 15
  run: ./long-task.sh
```

#### 8. Cache Issues

**Error**:
```
Warning: Cache restore failed: Unable to find cache
```

**Solutions**:
```bash
# Clear workflow cache via GitHub UI
# Settings > Actions > Caches > Delete

# Or use GitHub CLI
gh cache list
gh cache delete <cache-id>

# Update cache key
key: ${{ runner.os }}-pnpm-v2-${{ hashFiles('pnpm-lock.yaml') }}
```

### Debugging Workflows

#### Enable Debug Logging

1. **Repository Secret**:
   ```
   ACTIONS_STEP_DEBUG = true
   ACTIONS_RUNNER_DEBUG = true
   ```

2. **View debug logs**:
   - Re-run workflow
   - Download logs
   - Search for `::debug::` messages

#### Re-run Failed Jobs

```bash
# Via GitHub CLI
gh run rerun <run-id>

# Re-run only failed jobs
gh run rerun <run-id> --failed
```

#### Test Workflows Locally

```bash
# Install act (GitHub Actions local runner)
brew install act  # macOS
# or
curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act pull_request

# Run specific job
act -j build

# With secrets
act -s GITHUB_TOKEN=ghp_xxx
```

#### Access Workflow Artifacts

```bash
# Via GitHub CLI
gh run download <run-id>

# Download specific artifact
gh run download <run-id> -n artifact-name

# Via API
curl -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/$OWNER/$REPO/actions/artifacts
```

---

## Performance Optimization

### CI Pipeline Optimization

#### 1. Optimize pnpm Install

```yaml
# Use frozen-lockfile
- name: Install dependencies
  run: pnpm install --frozen-lockfile

# Cache pnpm store
- uses: actions/cache@v4
  with:
    path: ~/.pnpm-store
    key: ${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}
    restore-keys: ${{ runner.os }}-pnpm-
```

#### 2. Optimize TypeScript Build

```yaml
# Use incremental builds
- name: Build
  run: pnpm build
  env:
    TS_NODE_TRANSPILE_ONLY: true

# Use project references
pnpm exec tsc -b tsconfig.build.json
```

#### 3. Optimize Test Execution

```yaml
# Run tests in parallel
- name: Test
  run: pnpm test --maxWorkers=50% --coverage

# Skip coverage for faster feedback
- name: Quick test
  if: github.event.pull_request.draft == true
  run: pnpm test --maxWorkers=100% --no-coverage
```

#### 4. Use Concurrency Groups

```yaml
# Cancel previous runs
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

#### 5. Conditional Execution

```yaml
# Skip jobs for specific paths
on:
  pull_request:
    paths-ignore:
      - '**.md'
      - 'docs/**'

# Skip for draft PRs
jobs:
  expensive-job:
    if: github.event.pull_request.draft == false
    steps: [...]
```

### Build Optimization

#### 1. Reduce Bundle Size

```javascript
// Use dynamic imports
const Component = lazy(() => import('./Component'));

// Tree shaking
export { specificExport } from './module';

// Remove unused dependencies
pnpm prune
```

#### 2. Optimize Docker Images

```dockerfile
# Multi-stage builds
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
```

#### 3. Use BuildKit Caching

```yaml
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build with cache
  uses: docker/build-push-action@v6
  with:
    context: .
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

---

## Security Considerations

### Workflow Security

#### 1. Use Pinned Actions

```yaml
# ❌ Don't use tags
- uses: actions/checkout@v4

# ✅ Use commit SHA
- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1
```

#### 2. Limit Permissions

```yaml
# Minimal permissions
permissions:
  contents: read
  pull-requests: write

# No permissions
permissions: {}
```

#### 3. Validate Inputs

```yaml
on:
  workflow_dispatch:
    inputs:
      tag:
        description: 'Release tag'
        required: true
        pattern: '^v[0-9]+\.[0-9]+\.[0-9]+$'
```

#### 4. Secure Secrets

```yaml
# Use secrets, not env vars
- name: Deploy
  run: ./deploy.sh
  env:
    API_KEY: ${{ secrets.API_KEY }}

# Don't log secrets
- name: Debug
  run: echo "***REDACTED***"
```

### Dependency Security

#### 1. Regular Audits

```bash
# Run security audit
pnpm audit

# Fix vulnerabilities
pnpm audit --fix

# Check for known vulnerabilities
pnpm audit --audit-level moderate
```

#### 2. Scan Docker Images

```yaml
- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myimage:latest
    format: 'sarif'
    output: 'trivy-results.sarif'
    severity: 'CRITICAL,HIGH'
```

#### 3. SBOM Generation

```yaml
- name: Generate SBOM
  uses: anchore/sbom-action@v0
  with:
    path: .
    format: spdx-json
    output-file: sbom.spdx.json
```

---

## Monitoring and Observability

### CI/CD Metrics

Track these metrics:

1. **Pipeline Success Rate**
   - Target: > 95%
   - Alert: < 90%

2. **Mean Time to Feedback**
   - Target: < 10 minutes
   - Alert: > 20 minutes

3. **Build Duration**
   - Track percentiles (P50, P95, P99)
   - Alert on regressions

4. **Test Flakiness**
   - Track flaky test rate
   - Target: < 1%

5. **Deployment Frequency**
   - Track deployments per day/week
   - Monitor trends

### GitHub Actions Insights

Access via GitHub UI:
- Actions tab → Workflows → [Workflow] → Insights
- View duration trends, success rates, job timings

### Custom Dashboards

Create Grafana dashboards for:
- Build times over time
- Test execution duration
- Failure rates by job
- Cache hit rates
- Resource usage

---

## Quick Reference

### Common Commands

```bash
# Run CI checks locally
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build

# Fix issues
pnpm run lint --fix
pnpm run format

# Clear caches
rm -rf node_modules .turbo .next dist
pnpm install

# Docker
docker-compose -f docker-compose.dev.yml up
docker-compose -f docker-compose.dev.yml down -v

# Git
git commit -m "feat(scope): description"
git push origin feature-branch
```

### Useful Links

- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Renovate Documentation](https://docs.renovatebot.com)
- [Conventional Commits](https://www.conventionalcommits.org)
- [Semantic Versioning](https://semver.org)
- [CLAUDE.md](../CLAUDE.md) - Project conventions

---

## Getting Help

### Internal Resources

1. **Documentation**: Check `docs/` directory
2. **CLAUDE.md**: AI assistant guide with project context
3. **Workflow Comments**: Read inline comments in workflow files

### External Resources

1. **GitHub Community**: [GitHub Community Forum](https://github.community)
2. **Stack Overflow**: Tag questions with `github-actions`
3. **GitHub Support**: For enterprise issues

### Escalation

1. Check this troubleshooting guide
2. Search GitHub Issues
3. Ask in team chat
4. Create issue with:
   - Workflow run link
   - Error message
   - Steps to reproduce
   - Expected vs actual behavior

---

**Remember**:
- Keep the main branch green 🟢
- Write good commit messages 📝
- Review your own PRs first 👀
- Fix CI failures promptly 🔧
- Monitor performance metrics 📊
- Keep dependencies updated 📦
- Security first, always 🔒

---

*Last Updated: 2025-11-20*
*Maintainers: DevOps Team*
