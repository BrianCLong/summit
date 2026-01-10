# Release Blocker Escalation

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Release Blocker Escalation system implements SLO-style escalation for persistent release blockers. When a blocker exceeds time thresholds, it automatically escalates with labels and status updates, ensuring visibility without spam.

### Key Properties

- **SLO-driven**: Escalation based on configurable time thresholds
- **Spam-free**: Rate-limited updates (max once per hour per blocker)
- **Deterministic**: Consistent behavior based on policy file
- **Auditable**: All escalations tracked in state file

---

## Escalation Levels

### P0 (Critical/Blocked)

| Level    | Threshold | Labels Applied                                                            | Description       |
| -------- | --------- | ------------------------------------------------------------------------- | ----------------- |
| None     | < 1h      | (base labels)                                                             | Initial detection |
| Warn     | 1h        | `escalation:warn`, `needs-triage`                                         | First escalation  |
| Escalate | 4h        | `escalation:P0`, `escalation:4h+`, `needs-attention`                      | Significant delay |
| Page     | 8h        | `escalation:P0`, `escalation:8h+`, `needs-immediate-attention`, `on-call` | Critical delay    |

### P1 (Queued/Pending)

| Level    | Threshold | Labels Applied                                        | Description       |
| -------- | --------- | ----------------------------------------------------- | ----------------- |
| None     | < 4h      | (base labels)                                         | Initial detection |
| Warn     | 4h        | `escalation:warn`                                     | First escalation  |
| Escalate | 12h       | `escalation:P1`, `escalation:12h+`, `needs-attention` | Extended delay    |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Release Blocker Escalation Flow                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────┐    ┌────────────────────┐    ┌──────────────────┐   │
│  │ Scheduled Trigger │───▶│  Fetch Open Issues │───▶│  Read State File │   │
│  │   (every hour)    │    │  (release-blocker) │    │                  │   │
│  └───────────────────┘    └────────────────────┘    └────────┬─────────┘   │
│                                                              │              │
│                                                              ▼              │
│                                   ┌──────────────────────────────────┐     │
│                                   │     For Each Blocker:            │     │
│                                   │     1. Compute age               │     │
│                                   │     2. Determine escalation      │     │
│                                   │     3. Check update cadence      │     │
│                                   └───────────────┬──────────────────┘     │
│                                                   │                        │
│                           ┌───────────────────────┼───────────────────┐    │
│                           │                       │                   │    │
│                           ▼                       ▼                   ▼    │
│                   ┌───────────────┐    ┌──────────────────┐  ┌───────────┐│
│                   │ Escalation    │    │ Apply Labels     │  │ Update    ││
│                   │ Level Changed │───▶│ Update Issue     │  │ State File││
│                   └───────────────┘    └──────────────────┘  └───────────┘│
│                                                                             │
│                           ┌──────────────────────────────────────┐         │
│                           │     Generate Escalation Report       │         │
│                           │     (artifact + job summary)         │         │
│                           └──────────────────────────────────────┘         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Configuration

### Policy File

The escalation policy is defined in `docs/ci/BLOCKER_ESCALATION_POLICY.yml`:

```yaml
version: "1.0.0"

thresholds:
  p0:
    warn: 60 # 1 hour
    escalate: 240 # 4 hours
    page: 480 # 8 hours
  p1:
    warn: 240 # 4 hours
    escalate: 720 # 12 hours

update_cadence:
  min_minutes_between_updates: 60
  force_update_on_escalation: true

notifications:
  enabled: false
```

### Customizing Thresholds

To adjust thresholds:

1. Edit `docs/ci/BLOCKER_ESCALATION_POLICY.yml`
2. Update the threshold values (in minutes)
3. Commit and push

The changes take effect on the next workflow run.

### Enabling Notifications

To enable team mentions at escalation:

```yaml
notifications:
  enabled: true
  p0_escalate_notify:
    - "@org/release-engineering"
  p0_page_notify:
    - "@org/on-call"
```

**Warning:** Enable notifications cautiously to avoid noise.

---

## State Management

### State File

Escalation state is tracked in `docs/releases/_state/blockers_state.json`:

```json
{
  "version": "1.0.0",
  "last_updated": "2026-01-08T12:00:00Z",
  "blockers": {
    "issue:123": {
      "issue_number": 123,
      "first_seen": "2026-01-08T08:00:00Z",
      "last_seen": "2026-01-08T12:00:00Z",
      "last_issue_update": "2026-01-08T10:00:00Z",
      "escalation_level": "escalate",
      "severity": "P0"
    }
  }
}
```

### State Fields

| Field               | Description                                   |
| ------------------- | --------------------------------------------- |
| `issue_number`      | GitHub issue number                           |
| `first_seen`        | When the blocker was first detected           |
| `last_seen`         | When the blocker was last seen open           |
| `last_issue_update` | When the issue was last updated (for cadence) |
| `escalation_level`  | Current level: none/warn/escalate/page        |
| `severity`          | P0 or P1                                      |

---

## Workflow Schedule

The escalation workflow runs every hour at minute 15:

```yaml
on:
  schedule:
    - cron: "15 * * * *"
```

This timing:

- Staggers from other hourly workflows
- Provides consistent escalation detection
- Allows time for transient issues to resolve

---

## Anti-Spam Mechanisms

### Update Cadence

Issues are only updated when:

1. **Escalation level changes** - Always update when escalating
2. **Cadence threshold met** - At least 60 minutes since last update
3. **Content materially changed** - Avoid redundant updates

### Label Deduplication

Labels are applied additively. The script checks existing labels before applying to avoid duplicates.

### State-Based Tracking

The state file tracks the last update time for each blocker, preventing rapid repeated updates.

---

## Issue Updates

When a blocker is updated, an "Escalation Status" section is added/updated:

```markdown
---

## Escalation Status

| Field | Value |
|-------|-------|
| **Level** | escalate |
| **Age** | 245 minutes |
| **First Seen** | 2026-01-08T08:00:00Z |
| **Last Updated** | 2026-01-08T12:05:00Z |

### Latest Run Links

- [Latest workflow runs](https://github.com/org/repo/actions)

---

_This section is automatically updated by the Release Blocker Escalation workflow._
```

---

## Manual Invocation

### Via GitHub Actions UI

1. Navigate to Actions → Release Blocker Escalation
2. Click "Run workflow"
3. Optionally enable "Dry run mode"
4. Click "Run workflow"

### Via CLI

```bash
# Dry run (print actions without modifying)
./scripts/release/escalate_release_blockers.sh --dry-run

# Live run
./scripts/release/escalate_release_blockers.sh

# With custom policy
./scripts/release/escalate_release_blockers.sh \
  --policy my-policy.yml \
  --state my-state.json
```

---

## Escalation Timeline Example

For a P0 blocker created at 08:00:

| Time  | Age  | Action                                                                   |
| ----- | ---- | ------------------------------------------------------------------------ |
| 08:00 | 0m   | Issue created, base labels applied                                       |
| 09:00 | 60m  | **Warn**: `escalation:warn`, `needs-triage` added                        |
| 10:00 | 120m | No change (cadence check)                                                |
| 11:00 | 180m | No change (cadence check)                                                |
| 12:00 | 240m | **Escalate**: `escalation:P0`, `escalation:4h+`, `needs-attention` added |
| 13:00 | 300m | Status update (cadence met)                                              |
| 14:00 | 360m | No change (cadence check)                                                |
| 15:00 | 420m | Status update (cadence met)                                              |
| 16:00 | 480m | **Page**: `escalation:8h+`, `needs-immediate-attention`, `on-call` added |

---

## Troubleshooting

### Labels Not Applied

**Symptom:** Escalation labels not appearing on issues

**Diagnosis:**

- Check workflow run logs
- Verify issue has `release-blocker` label
- Check GitHub API permissions

**Resolution:**

- Ensure workflow has `issues: write` permission
- Run workflow manually with dry-run to see computed actions

### Duplicate Updates

**Symptom:** Issue updated too frequently

**Diagnosis:**

- Check state file `last_issue_update` timestamps
- Verify cadence configuration

**Resolution:**

- Increase `min_minutes_between_updates` in policy
- Check for clock skew issues

### State File Conflicts

**Symptom:** State file commit fails

**Diagnosis:**

- Check for concurrent workflow runs
- Verify branch protection settings

**Resolution:**

- Workflow uses concurrency controls
- If persistent, check for manual edits to state file

---

## Labels Reference

| Label                       | Description                 | Applied At       |
| --------------------------- | --------------------------- | ---------------- |
| `release-blocker`           | Base label for all blockers | Initial creation |
| `escalation:warn`           | First escalation level      | P0: 1h, P1: 4h   |
| `escalation:P0`             | P0 blocker escalated        | 4h               |
| `escalation:P1`             | P1 blocker escalated        | 12h              |
| `escalation:4h+`            | P0 over 4 hours             | 4h               |
| `escalation:8h+`            | P0 over 8 hours             | 8h               |
| `escalation:12h+`           | P1 over 12 hours            | 12h              |
| `needs-triage`              | Requires triage             | P0: 1h, P1: 4h   |
| `needs-attention`           | Requires attention          | P0: 4h, P1: 12h  |
| `needs-immediate-attention` | Urgent attention            | P0: 8h           |
| `on-call`                   | Page on-call team           | P0: 8h           |

---

## References

- [Hotfix Override](../releases/HOTFIX_OVERRIDE.md)
- [Two-Person Approval](../releases/TWO_PERSON_APPROVAL.md)
- [Required Checks Policy](REQUIRED_CHECKS_POLICY.json)

---

## Change Log

| Date       | Change                     | Author               |
| ---------- | -------------------------- | -------------------- |
| 2026-01-08 | Initial Blocker Escalation | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
