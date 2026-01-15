# Rollback Automation

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Rollback Automation system provides safe, auditable rollback of failed GA releases. It ensures proper cleanup of tags and releases while maintaining a complete audit trail.

### Key Properties

- **Safe execution**: Confirmation prompts and dry-run mode
- **Complete cleanup**: Removes Git tag and GitHub release
- **Audit trail**: Full state tracking and report generation
- **Issue tracking**: Automatic creation of rollback tracking issues
- **Approval gate**: Requires hotfix-release environment approval

---

## When to Use Rollback

Use rollback when a GA release:

1. **Causes production incidents**: Critical bugs affecting users
2. **Fails deployment**: Kubernetes/infrastructure failures
3. **Has security issues**: Discovered vulnerabilities
4. **Breaks compatibility**: Unexpected API breaking changes

---

## Rollback Process

### Automated Steps

1. **Validation**: Verify tag exists and format is correct
2. **Find Previous**: Identify last stable GA tag
3. **Approval**: Require environment approval (non-dry-run)
4. **Delete Tag**: Remove Git tag locally and remotely
5. **Delete Release**: Remove GitHub release
6. **Create Issue**: Track rollback with GitHub issue
7. **Generate Report**: Create detailed rollback report

### Manual Follow-up

1. Verify production is running previous version
2. Complete root cause analysis
3. Create fix PR
4. Schedule new release

---

## Usage

### Via GitHub Actions UI

1. Navigate to Actions -> Release Rollback
2. Click "Run workflow"
3. Fill in required fields:
   - `tag`: GA tag to rollback (e.g., v4.1.2)
   - `reason`: Why rollback is needed (min 20 chars)
4. Optional settings:
   - `create_issue`: Create tracking issue (default: true)
   - `dry_run`: Preview without executing (default: false)
5. Click "Run workflow"
6. **If not dry-run**: Approve in `hotfix-release` environment

### Via CLI

```bash
# Dry run (preview)
./scripts/release/rollback_release.sh \
  --tag v4.1.2 \
  --reason "Critical bug in payment processing" \
  --dry-run

# Execute rollback
./scripts/release/rollback_release.sh \
  --tag v4.1.2 \
  --reason "Critical bug in payment processing" \
  --create-issue

# Force (skip confirmation)
./scripts/release/rollback_release.sh \
  --tag v4.1.2 \
  --reason "Critical bug in payment processing" \
  --force
```

---

## Configuration Options

| Option           | Description                  | Default  |
| ---------------- | ---------------------------- | -------- |
| `--tag`          | GA tag to rollback           | Required |
| `--reason`       | Reason for rollback          | Required |
| `--dry-run`      | Preview without executing    | `false`  |
| `--force`        | Skip confirmation prompts    | `false`  |
| `--create-issue` | Create GitHub tracking issue | `false`  |

---

## Approval Process

Non-dry-run rollbacks require approval:

1. **Environment**: `hotfix-release`
2. **Required reviewers**: 1 (from SRE team)
3. **Wait timer**: None (immediate approval possible)

This ensures rollbacks are authorized while not delaying emergency response.

---

## Tracking Issue

When `--create-issue` is used, an issue is created with:

```markdown
## Release Rollback: v4.1.2

**Rolled Back At:** 2026-01-08T10:00:00Z
**Previous Stable:** v4.1.1
**Reason:** Critical bug in payment processing

---

## Rollback Actions Taken

- [x] Deleted GA tag: `v4.1.2`
- [x] Deleted GitHub release (if existed)
- [ ] Verified production is running previous stable version
- [ ] Notified stakeholders
- [ ] Root cause analysis started

## Post-Rollback Checklist

- [ ] Confirm production health
- [ ] Review error logs
- [ ] Identify root cause
- [ ] Create fix PR
- [ ] Schedule new release attempt

---

/label release-rollback,severity:P0
```

---

## Rollback Report

Generated reports include:

```markdown
# Release Rollback Report

**Tag:** v4.1.2
**Timestamp:** 2026-01-08T10:00:00Z
**Previous Stable:** v4.1.1
**Reason:** Critical bug in payment processing

---

## Actions Taken

1. ✅ Validated rollback request
2. ✅ Identified previous stable tag: v4.1.1
3. ✅ Deleted GA tag: v4.1.2
4. ✅ Deleted GitHub release (if existed)
5. ✅ Updated rollback state

---

## Recovery Steps

...
```

---

## State Tracking

State in `docs/releases/_state/rollback_state.json`:

```json
{
  "version": "1.0.0",
  "last_rollback": "2026-01-08T10:00:00Z",
  "last_result": {
    "tag": "v4.1.2",
    "reason": "Critical bug in payment processing",
    "previous_tag": "v4.1.1",
    "status": "completed",
    "timestamp": "2026-01-08T10:00:00Z"
  },
  "rollbacks": [...]
}
```

---

## Safety Features

### Confirmation Prompt

```
╔════════════════════════════════════════════════════════════════╗
║                    ⚠️  ROLLBACK CONFIRMATION                    ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║  This will DELETE the following:                               ║
║                                                                ║
║  • Git tag: v4.1.2                                            ║
║  • GitHub release: v4.1.2                                     ║
║                                                                ║
║  Previous stable version: v4.1.1                              ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Are you sure you want to proceed? (type 'ROLLBACK' to confirm):
```

### Dry Run Mode

Always use `--dry-run` first to preview:

```bash
./scripts/release/rollback_release.sh --tag v4.1.2 --reason "Testing" --dry-run
```

This shows all actions without executing them.

---

## Post-Rollback Procedures

### Immediate (Within 1 Hour)

1. **Verify Production**: Confirm previous version is running
2. **Check Health**: Monitor error rates, latency, availability
3. **Notify Stakeholders**: Inform team and affected parties

### Short-term (Within 24 Hours)

1. **Root Cause Analysis**: Identify why the release failed
2. **Document Findings**: Update the tracking issue
3. **Create Fix**: Develop and test the fix

### Medium-term (Within 48 Hours)

1. **Postmortem**: Complete postmortem document
2. **Process Improvements**: Identify process gaps
3. **Re-release Plan**: Schedule corrected release

---

## Integration with Other Systems

### Hotfix Override

If urgent fix is needed:

```bash
# After rollback, if hotfix is ready:
gh workflow run hotfix-release.yml \
  -f version="4.1.2-hotfix.1" \
  -f commit_sha="<fix-sha>" \
  -f justification="Fix for rollback issue" \
  -f incident_ticket="ISSUE-123"
```

### Pre-Release Health

After rollback, verify health:

```bash
./scripts/release/pre_release_health_check.sh --report
```

---

## Best Practices

1. **Always dry-run first**: Preview before executing
2. **Document thoroughly**: Include detailed reason
3. **Create tracking issue**: Enable follow-up tracking
4. **Notify immediately**: Don't wait to inform stakeholders
5. **Complete postmortem**: Learn from the incident

---

## Troubleshooting

### Tag Not Found

```bash
# Verify tag exists
git tag -l "v4.1.2"

# Fetch tags if missing
git fetch --tags
```

### Previous Tag Not Found

```bash
# List all GA tags
git tag -l 'v[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | grep -v '\-rc\.'
```

### GitHub Token Issues

```bash
# Verify authentication
gh auth status

# Re-authenticate if needed
gh auth login
```

---

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Hotfix Override](../releases/HOTFIX_OVERRIDE.md)
- [Pre-Release Health](PRE_RELEASE_HEALTH.md)
- [Incident Response Runbook](../runbooks/INCIDENT_RESPONSE.md)

---

## Change Log

| Date       | Change                      | Author               |
| ---------- | --------------------------- | -------------------- |
| 2026-01-08 | Initial Rollback Automation | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
