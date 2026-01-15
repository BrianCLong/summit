# Pages Automatic Rollback

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

When the Pages publish workflow detects a **FAIL** health status (or site safety gate failure), it automatically rolls back to the last known-good snapshot instead of blocking deployment entirely. This ensures the public site remains continuously available with safe content.

### Key Behaviors

| Health Level | Site Safety | Behavior                                                     |
| ------------ | ----------- | ------------------------------------------------------------ |
| OK           | Pass        | Deploy current build, store snapshot                         |
| WARN         | Pass        | Deploy current build, store snapshot, generate triage packet |
| FAIL         | Pass        | Restore snapshot, deploy snapshot, generate triage packet    |
| Any          | Fail        | Restore snapshot, deploy snapshot, generate triage packet    |

---

## Snapshot Storage

### Branch Structure

Snapshots are stored in a dedicated orphan branch:

```
Branch: release-ops-pages-snapshots

snapshots/
├── LATEST                          # Points to latest known-good snapshot ID
├── 20260108-123456-20806007401/    # Snapshot directory
│   ├── SHA256SUMS                  # Integrity checksums
│   ├── metadata.json               # Snapshot metadata
│   ├── index.html
│   ├── release_ops_single_page.html
│   ├── release_ops_single_page.md
│   ├── cycle_summary.md
│   ├── dashboard_summary.json
│   └── redaction_health.json
├── 20260107-093000-20805900123/    # Older snapshot
│   └── ...
└── ...
```

### Snapshot ID Format

Snapshot IDs follow the pattern: `{date}-{time}-{run_id}`

Example: `20260108-143256-20806007405`

### Retention

- Maximum **10 snapshots** are retained
- Older snapshots are automatically pruned when new ones are stored
- Snapshots contain only allowlisted files (no sensitive content)

---

## What Triggers Rollback

### 1. Redaction Health FAIL

When `redaction_health.json` reports level `FAIL`:

- Forbidden patterns were detected in sanitized output
- Current build cannot be safely published
- Rollback reason: `redaction_fail`

### 2. Site Safety Gate Failure

When the safety verification step detects:

- State files (`*_state.json`) in site directory
- Full `dashboard.json` present
- `state-snapshot/` directory present
- Rollback reason: `site_safety_fail`

---

## Rollback Process

### Automatic Flow

1. **Build** - Normal site build completes
2. **Safety Check** - Verify no blocked content
3. **Health Check** - Read redaction health level
4. **Detect FAIL** - If FAIL or safety gate failed:
   - Generate and upload triage packet
   - Restore last known-good snapshot to site directory
   - Generate rollback report
   - Generate deployment marker (status=ROLLED_BACK)
   - Regenerate index.html to display rollback banner
   - Deploy restored snapshot to Pages
5. **Complete** - Workflow succeeds with rollback summary

### Deployment Marker

Every deployment generates a `deployment_marker.json` file that indicates:

- **Status**: OK, WARN, or ROLLED_BACK
- **Run ID**: Source workflow run
- **Snapshot ID**: (for rollback only) Which snapshot was restored
- **Git SHA**: Commit that triggered the deployment
- **Timestamp**: When deployed

The index page displays this marker as a banner at the top, making it immediately visible to viewers what state the site is in

### Rollback Report

When rollback occurs, `rollback_report.md` and `rollback_report.json` are added to the deployed site:

```json
{
  "version": "1.0",
  "type": "rollback_report",
  "rollback": true,
  "timestamp": "2026-01-08T14:32:56Z",
  "failed_run_id": 20806007405,
  "restored_snapshot_id": "20260107-093000-20805900123",
  "reason": "redaction_fail",
  "reason_detail": "forbidden_hits_gt_0"
}
```

---

## First-Run Bootstrap

On the first run (or if no snapshots exist), rollback cannot occur because there's no snapshot to restore. In this case:

1. Workflow fails with explicit error message
2. Triage packet is still uploaded
3. Instructions provided in workflow summary

### To Bootstrap

1. **Fix the redaction issue** causing FAIL
2. **Re-run the orchestrator** workflow
3. When health is **OK** or **WARN**, a snapshot will be stored
4. Subsequent FAIL runs will have a snapshot to rollback to

### Manual Bootstrap

If you have a known-good site directory:

```bash
# Configure git
git config user.name "Your Name"
git config user.email "your@email.com"

# Store initial snapshot
./scripts/release/store_pages_snapshot.sh \
  --mode store \
  --site-dir path/to/valid-site \
  --run-id 0 \
  --verbose

# Push snapshot branch
git push origin release-ops-pages-snapshots
```

---

## Manual Operations

### List Available Snapshots

```bash
# Fetch snapshot branch
git fetch origin release-ops-pages-snapshots

# View snapshot history
git log release-ops-pages-snapshots --oneline

# List snapshot directories
git ls-tree release-ops-pages-snapshots:snapshots/
```

### View Current Snapshot

```bash
# Read LATEST pointer
git show release-ops-pages-snapshots:snapshots/LATEST

# View snapshot metadata
git show release-ops-pages-snapshots:snapshots/<id>/metadata.json
```

### Manual Restore

```bash
# Restore to site directory
./scripts/release/store_pages_snapshot.sh \
  --mode restore \
  --site-dir site/release-ops \
  --verbose

# Dry run first
./scripts/release/store_pages_snapshot.sh \
  --mode restore \
  --site-dir site/release-ops \
  --dry-run
```

### Force Store New Snapshot

```bash
# Store current site as snapshot (must pass allowlist check)
./scripts/release/store_pages_snapshot.sh \
  --mode store \
  --site-dir site/release-ops \
  --run-id 12345 \
  --verbose
```

---

## Scripts Reference

### store_pages_snapshot.sh

Manages snapshot storage and restoration.

```bash
# Store mode
./scripts/release/store_pages_snapshot.sh \
  --mode store \
  --site-dir <dir> \
  --run-id <id> \
  [--snapshot-id <custom-id>] \
  [--dry-run] [--verbose]

# Restore mode
./scripts/release/store_pages_snapshot.sh \
  --mode restore \
  --site-dir <dir> \
  [--dry-run] [--verbose]
```

| Option          | Description                                  |
| --------------- | -------------------------------------------- |
| `--mode`        | Required: `store` or `restore`               |
| `--site-dir`    | Site directory (default: `site/release-ops`) |
| `--run-id`      | GitHub run ID (for store mode)               |
| `--snapshot-id` | Custom snapshot ID (optional)                |
| `--dry-run`     | Show what would be done                      |
| `--verbose`     | Enable verbose logging                       |

### write_rollback_report.sh

Generates rollback report files.

```bash
./scripts/release/write_rollback_report.sh \
  --site-dir <dir> \
  --failed-run-id <id> \
  --snapshot-id <id> \
  --reason <reason> \
  [--reason-detail <text>] \
  [--verbose]
```

| Option            | Description                                       |
| ----------------- | ------------------------------------------------- |
| `--site-dir`      | Output directory                                  |
| `--failed-run-id` | Run ID that failed                                |
| `--snapshot-id`   | Restored snapshot ID                              |
| `--reason`        | `redaction_fail`, `site_safety_fail`, or `manual` |
| `--reason-detail` | Additional detail                                 |

---

## Workflow Integration

The `publish-release-ops-pages.yml` workflow handles rollback automatically:

```yaml
# Simplified flow
steps:
  - Build Pages Site
  - Verify Site Contents # Sets safety_passed output
  - Check Redaction Health # Sets level output
  - Generate Triage Packet # If WARN/FAIL
  - Upload Triage Packet # If WARN/FAIL

  # Rollback path (FAIL or safety gate failed)
  - Restore Last Known-Good Snapshot
  - Handle No Snapshot Available # First-run case
  - Write Rollback Report
  - Rollback Summary

  # Success path (OK/WARN)
  - Warn Summary # If WARN

  # Deploy (both paths)
  - Setup Pages
  - Upload Pages Artifact
  - Deploy to GitHub Pages

  # Post-deploy (success path only)
  - Store Snapshot # If OK/WARN
  - Publish Summary
```

---

## Troubleshooting

### Rollback Failed: No Snapshot Available

**Symptom:** Workflow fails with "No previous snapshot exists"

**Cause:** First run or snapshots were deleted

**Resolution:**

1. Fix the redaction issue causing FAIL
2. Re-run with OK/WARN health to bootstrap
3. Or manually create initial snapshot

### Snapshot Branch Not Found

**Symptom:** Error about missing `release-ops-pages-snapshots` branch

**Resolution:** The branch is created automatically on first successful store. Ensure you have a successful OK/WARN run first.

### Checksum Verification Failed

**Symptom:** Restore fails with checksum error

**Cause:** Snapshot may be corrupted

**Resolution:**

1. Check snapshot branch for issues
2. Try restoring older snapshot manually
3. May need to bootstrap fresh

### Worktree Conflicts

**Symptom:** Git worktree errors during store/restore

**Resolution:**

```bash
# Clean up any stale worktrees
git worktree list
git worktree prune
rm -rf .snapshot-work
```

---

## Security Considerations

- Snapshots contain **only allowlisted files**
- No state files or sensitive content in snapshots
- Checksums verify snapshot integrity
- Snapshot branch is separate from main codebase
- Workflow requires `contents: write` permission

---

## References

- **Snapshot Script**: `scripts/release/store_pages_snapshot.sh`
- **Rollback Report Script**: `scripts/release/write_rollback_report.sh`
- **Deployment Marker Script**: `scripts/release/write_deployment_marker.sh`
- **Pages Workflow**: `.github/workflows/publish-release-ops-pages.yml`
- **Allowlist**: `docs/ci/PAGES_PUBLISH_ALLOWLIST.md`
- **Redaction Health**: `docs/ci/REDACTION_HEALTH.md`
- **Triage Packet**: `docs/ci/REDACTION_TRIAGE_PACKET.md`

---

## Change History

| Version | Date       | Changes                         |
| ------- | ---------- | ------------------------------- |
| 1.0.0   | 2026-01-08 | Initial rollback implementation |
| 1.1.0   | 2026-01-08 | Added deployment status marker  |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
