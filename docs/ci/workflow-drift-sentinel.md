# CI Workflow Drift Sentinel

## Purpose

The workflow drift sentinel prevents CI sprawl by enforcing governance rules on GitHub Actions workflows. It runs on every PR to catch violations before they merge.

## Problem Statement

Without enforcement, CI complexity grows uncontrolled:
- Workflow count: 5 → 50 → 260+ (exponential growth)
- Missing concurrency guards → queue saturation
- Duplicate workflows → redundant execution
- No path filters → unnecessary runs

Result: CI gridlock, merge trains stop, developer productivity crashes.

## Solution: Automated Governance

`scripts/ci/validate_workflows.mjs` enforces:

### 1. Maximum Workflow Count
**Rule**: ≤25 active workflows in `.github/workflows/`
**Rationale**: Forces consolidation, prevents sprawl
**Current**: 6-8 workflows (well under limit)

### 2. Required Workflows
**Rule**: Must have `pr-gate.yml` and `main-validation.yml`
**Rationale**: Core two-tier architecture
**Enforcement**: Hard error if missing

### 3. Concurrency Guards
**Rule**: All workflows must have `concurrency` block
**Rationale**: Prevents duplicate runs, reduces queue pressure
**Example**:
```yaml
concurrency:
  group: workflow-name-${{ github.ref }}
  cancel-in-progress: true
```

### 4. Path Filtering (Recommended)
**Rule**: Domain workflows should have path filters
**Applies to**: `server-ci.yml`, `client-ci.yml`, `infra-ci.yml`, `docs-ci.yml`
**Rationale**: Prevents unnecessary runs
**Enforcement**: Warning (not error)

### 5. Timeout Limits (Recommended)
**Rule**: Jobs should have `timeout-minutes`
**Rationale**: Prevents runaway jobs
**Enforcement**: Warning (not error)

### 6. Unique Workflow Names
**Rule**: No duplicate workflow names
**Rationale**: Prevents confusion, enables monitoring
**Enforcement**: Hard error if duplicate

## Integration

Runs automatically in `pr-gate.yml`:
```yaml
- name: CI Drift Sentinel
  run: node scripts/ci/validate_workflows.mjs
```

**When**: Every PR
**Duration**: <5 seconds
**Blocks merge**: Yes (if errors)

## Output

### Success
```
═══════════════════════════════════════
   CI Workflow Drift Sentinel
═══════════════════════════════════════

✅ Validating workflow count...
✅ Workflow count: 8/25 ✓

✅ Validating required workflows...
✅ Required workflow present: pr-gate.yml ✓
✅ Required workflow present: main-validation.yml ✓

✅ Validating individual workflows...
🔍 pr-gate.yml: Has concurrency guard ✓
🔍 main-validation.yml: Has concurrency guard ✓
🔍 server-ci.yml: Has concurrency guard ✓
🔍 server-ci.yml: Has path filters ✓
...

📦 Checking archived workflows...
ℹ️  Archived workflows: 215

═══════════════════════════════════════
   Summary
═══════════════════════════════════════
Errors:   0
Warnings: 0
═══════════════════════════════════════

✅ Workflow validation passed!
```

### Failure (Example)
```
═══════════════════════════════════════
   CI Workflow Drift Sentinel
═══════════════════════════════════════

❌ Too many workflows: 27 > 25
❌ Consider consolidating workflows or moving to archived/

❌ new-workflow.yml: Missing concurrency guard
  Add: concurrency:
    group: new-workflow-${{ github.ref }}
    cancel-in-progress: true

❌ duplicate-name.yml: Duplicate workflow name: server-tests

⚠️  slow-workflow.yml: Job 'build' missing timeout-minutes

═══════════════════════════════════════
   Summary
═══════════════════════════════════════
Errors:   3
Warnings: 1
═══════════════════════════════════════

❌ Validation failed with errors:
  - Too many workflows: 27 > 25
  - new-workflow.yml: Missing concurrency guard
  - duplicate-name.yml: Duplicate workflow name: server-tests

Process exited with code 1
```

## Bypass (Emergency)

To bypass validation temporarily (requires explicit PR justification):

1. **Comment out validation step** in pr-gate.yml:
```yaml
# - name: CI Drift Sentinel
#   run: node scripts/ci/validate_workflows.mjs
```

2. **Get approval from team lead**
3. **Create follow-up issue** to fix violations
4. **Re-enable validation** immediately after merge

**When to bypass**:
- ❌ "It's annoying" (not valid)
- ❌ "Too much work" (not valid)
- ✅ Critical hotfix blocking production
- ✅ Genuine emergency requiring immediate merge

## Maintenance

### Adding New Validation Rules

Edit `scripts/ci/validate_workflows.mjs`:

```javascript
validateNewRule() {
  this.log('\n🔍 Validating new rule...', 'info');

  // Check condition
  if (violationDetected) {
    this.error('Violation message');
    return false;
  }

  this.log('New rule passed ✓', 'info');
  return true;
}
```

Add to `run()` method:
```javascript
async run() {
  // ...existing validations...
  this.validateNewRule();
  // ...
}
```

### Updating Thresholds

To change max workflow count:
```javascript
const MAX_WORKFLOWS = 25; // Increase if justified
```

**Justification required**: Must document why increase is needed

### Excluding Workflows

To exclude from validation (e.g., reusable workflows):
```javascript
.filter(f => !f.startsWith('_')); // Exclude _auth-oidc.yml etc.
```

## Metrics

Track over time:
- **Workflow count trend**: Should stay flat or decrease
- **Violations per PR**: Should trend toward zero
- **Time to fix violations**: Should be <15 minutes
- **Bypass frequency**: Should be rare (<1% of PRs)

## Comparison: Before vs After

| Metric | Before Sentinel | After Sentinel |
|--------|----------------|----------------|
| **Workflow count** | 260+ | 6-8 (capped at 25) |
| **Concurrency guards** | ~30% | 100% (enforced) |
| **Duplicate names** | 5+ | 0 (prevented) |
| **Workflow sprawl** | Uncontrolled | Prevented |
| **CI incidents** | Monthly | Rare |

## Related Tools

### Workflow Cleanup Script
Identifies candidates for archiving:
```bash
node scripts/ci/workflow_cleanup.mjs
```

See: `docs/ci/workflow-cleanup-automation.md`

### Capacity Monitor
Real-time queue monitoring:
```bash
bash scripts/ci/monitor-runner-capacity.sh
```

See: `docs/runbooks/ci/workflow-capacity-management.md`

## References

- PR gate architecture: `docs/ci/pr-gate-architecture.md`
- Main validation: `docs/ci/main-branch-validation.md`
- Path filtering: `docs/ci/path-filtering-strategy.md`
- Consolidation plan: `docs/analysis/workflow-consolidation-plan.md`
- GitHub Actions best practices: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idconcurrency
