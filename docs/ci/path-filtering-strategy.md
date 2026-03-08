# Path-Filtering Strategy

## Overview

Path filtering ensures CI workflows only run when relevant files change, dramatically reducing unnecessary job execution.

## Problem

Without path filtering:
```
Docs-only PR → Triggers server tests, client tests, infra tests
Result: Wasted CI resources, longer queue times
```

With path filtering:
```
Docs-only PR → Only docs-ci runs
Result: 90% fewer CI jobs for this PR
```

## Implemented Workflows

### 1. server-ci.yml

**Triggers when**:
- `server/**` - Server code changes
- `packages/**` - Shared packages (may affect server)
- `package.json` - Dependency changes
- `pnpm-lock.yaml` - Lock file changes
- `.github/workflows/server-ci.yml` - Workflow itself

**Runs**:
- Server typecheck
- Server unit tests
- Server smoke tests

**Expected impact**: Only ~30% of PRs touch server code

### 2. client-ci.yml

**Triggers when**:
- `client/**` - Client code changes
- `apps/**` - Frontend apps
- `packages/**` - Shared packages (may affect client)
- `package.json` - Dependency changes
- `pnpm-lock.yaml` - Lock file changes
- `.github/workflows/client-ci.yml` - Workflow itself

**Runs**:
- Client typecheck
- Client unit tests
- Client smoke tests
- Web app tests

**Expected impact**: Only ~35% of PRs touch client code

### 3. infra-ci.yml

**Triggers when**:
- `infra/**` - Infrastructure code
- `terraform/**` - Terraform configs
- `docker/**` - Docker configs
- `docker-compose*.yml` - Compose files
- `Dockerfile` - Main dockerfile
- `k8s/**` - Kubernetes manifests
- `helm/**` - Helm charts
- `.github/workflows/infra-ci.yml` - Workflow itself

**Runs**:
- Docker validation
- docker-compose validation
- Terraform fmt check
- Terraform validate
- K8s manifest validation

**Expected impact**: Only ~10% of PRs touch infrastructure

### 4. docs-ci.yml

**Triggers when**:
- `docs/**` - Documentation
- `*.md` - Root-level markdown files
- `adr/**` - Architecture Decision Records
- `.github/workflows/docs-ci.yml` - Workflow itself

**Runs**:
- Markdown linting
- Broken link checking
- Governance docs validation

**Expected impact**: ~20% of PRs are docs-only

## Combined Impact

### Before Path Filtering
```
Typical PR: Runs ALL workflows
Server CI: 100% of PRs
Client CI: 100% of PRs
Infra CI: 100% of PRs
Docs CI: 100% of PRs
Total: 4 workflows × 900 PRs = 3,600 runs
```

### After Path Filtering
```
Server-only PR: Only server-ci runs
Typical PR: Runs 1-2 relevant workflows
Docs-only PR: Only docs-ci runs

Expected distribution:
- Server CI: 30% of PRs = 270 runs
- Client CI: 35% of PRs = 315 runs
- Infra CI: 10% of PRs = 90 runs
- Docs CI: 20% of PRs = 180 runs
Total: ~855 runs (76% reduction)
```

## Path Overlap Strategy

Some paths appear in multiple workflows (e.g., `packages/**`). This is intentional:

**Rationale**: Shared packages may affect multiple components, so both should test

**Alternative considered**: Create separate `packages-ci.yml`
**Why rejected**: Would require coordination; better to run both affected tests

## Maintenance

### Adding New Paths

When adding new top-level directories, update relevant workflows:

```yaml
# Add to appropriate workflow
on:
  pull_request:
    paths:
      - "new-directory/**"
```

### Verifying Filters

Use the CI drift sentinel (coming in PR 4) to ensure all workflows have path filters.

## Escape Hatches

### Force Full CI

To run all CI on a PR regardless of paths:

**Option 1**: Add `[ci full]` to commit message
**Option 2**: Use workflow_dispatch trigger manually
**Option 3**: Comment `/run-all-ci` (if bot configured)

### Disable Filtering

To temporarily disable path filtering on a workflow, comment out the `paths` section:

```yaml
on:
  pull_request:
    # paths:  # Commented out - runs on all PRs
    #   - "server/**"
```

## Metrics to Track

After deployment, monitor:

- **Workflow trigger rate**: What % of PRs trigger each workflow?
- **False negatives**: PRs that should have triggered but didn't
- **False positives**: PRs that triggered unnecessarily
- **Total CI job reduction**: Compare before/after job counts

**Target**: 70-80% reduction in total CI jobs

## References

- Path filtering docs: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetpathspaths-ignore
- PR gate architecture: `docs/ci/pr-gate-architecture.md`
- Consolidation plan: `docs/analysis/workflow-consolidation-plan.md`
