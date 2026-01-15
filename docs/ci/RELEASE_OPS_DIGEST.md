# Release Ops Digest

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Release Ops Digest generates a daily consolidated summary of all active release blockers, providing leadership visibility without spam. The digest includes blocker counts, aging statistics, queue status, and recommended actions.

### Key Properties

- **Single daily digest**: At most one digest per 24-hour window
- **Content deduplication**: No redundant posts if content unchanged
- **Actionable format**: Includes next steps and priority ordering
- **Artifact-first**: Always generates artifact, optional issue posting

---

## Digest Contents

### Sections

1. **Overview**
   - Total open blockers
   - P0 (critical) and P1 (pending) counts
   - Escalated issues count
   - Oldest blocker age

2. **CI Queue Status**
   - Queued workflow runs
   - In-progress workflow runs

3. **Promotable Candidates**
   - Release lines ready for GA promotion
   - (Requires Release Train Dashboard integration)

4. **Blocked Items (P0)**
   - Table of critical blockers
   - Issue link, age, labels, title

5. **Queued/Pending Items (P1)**
   - Table of non-critical blockers
   - Issue link, age, labels, title

6. **Aging Summary**
   - Distribution buckets: <1h, 1-4h, 4-12h, 12-24h, >24h

7. **Recommended Actions**
   - Prioritized next steps based on current state

---

## Example Digest

```markdown
# Release Ops Daily Digest

**Generated:** 2026-01-08T08:00:00Z
**Repository:** org/summit

---

## Overview

| Metric                  | Count  |
| ----------------------- | ------ |
| **Open Blockers**       | 5      |
| **P0 (Critical)**       | 2      |
| **P1 (Queued/Pending)** | 3      |
| **Escalated**           | 1      |
| **Oldest Blocker Age**  | 6h 30m |

### CI Queue Status

| Status      | Count |
| ----------- | ----- |
| Queued      | 3     |
| In Progress | 2     |

---

## Blocked Items (P0)

| Issue       | Age    | Labels                           | Title                         |
| ----------- | ------ | -------------------------------- | ----------------------------- |
| [#123](url) | 6h 30m | `escalation:P0, release-blocker` | Unit tests failing on main... |
| [#124](url) | 2h 15m | `severity:P0, release-blocker`   | SBOM generation timeout...    |

---

## Recommended Actions

1. **Triage P0 blockers** - 2 critical issues require immediate attention
2. **Investigate stale blockers** - Oldest blocker is 6h 30m old
```

---

## Rate Limiting

### Anti-Spam Mechanisms

1. **Time-based cadence**: Minimum 24 hours between digest posts
2. **Content hash**: Skip post if content identical to previous
3. **Force flag**: Override rate limit for urgent situations

### Rate Limit Logic

```
if (now - last_digest_at < 24_hours):
    # Generate artifact only, skip posting

elif (content_hash == last_digest_hash):
    # No changes, skip posting

else:
    # Generate and post digest
    # Update state with new timestamp and hash
```

---

## Configuration

### Policy File

The digest is configured via `docs/ci/RELEASE_OPS_DIGEST_POLICY.yml`:

```yaml
cadence:
  hours: 24
  force_on_escalation: true

content:
  max_blockers: 50
  include_sections:
    - overview
    - promotable_candidates
    - blocked_items
    - queued_or_pending
    - aging_summary

output:
  artifact: true
  issue_comment:
    enabled: false
    # target_issue_number: 123
```

### Enabling Issue Posting

To post digest to a tracking issue:

1. Create a pinned issue titled "Release Ops Status"
2. Note the issue number
3. Update policy:
   ```yaml
   output:
     issue_comment:
       enabled: true
       target_issue_number: 123
   ```
4. Commit and push

---

## Workflow Schedule

The digest workflow runs daily at 08:00 UTC:

```yaml
on:
  schedule:
    - cron: "0 8 * * *"
```

This timing:

- Aligns with business hours start (Americas/Europe overlap)
- Provides overnight status summary
- Runs after nightly CI completion

---

## Manual Invocation

### Via GitHub Actions UI

1. Navigate to Actions → Release Ops Digest
2. Click "Run workflow"
3. Optionally check "Force digest generation"
4. Click "Run workflow"

### Via CLI

```bash
# Standard run (rate-limited)
./scripts/release/generate_release_ops_digest.sh

# Force run (bypass rate limit)
./scripts/release/generate_release_ops_digest.sh --force

# Dry run (generate without state update)
./scripts/release/generate_release_ops_digest.sh --dry-run

# Custom output
./scripts/release/generate_release_ops_digest.sh --out /tmp/digest.md
```

---

## State Tracking

### State File

Digest state is tracked in `docs/releases/_state/digest_state.json`:

```json
{
  "version": "1.0.0",
  "last_digest_at": "2026-01-08T08:00:00Z",
  "last_digest_hash": "abc123def456",
  "last_comment_id": null
}
```

### State Fields

| Field              | Description                             |
| ------------------ | --------------------------------------- |
| `last_digest_at`   | ISO timestamp of last digest generation |
| `last_digest_hash` | Content hash for deduplication          |
| `last_comment_id`  | GitHub comment ID (if posting enabled)  |

---

## Troubleshooting

### Digest Not Generated

**Symptom:** Workflow runs but no digest artifact

**Diagnosis:**

- Check workflow logs for errors
- Verify GitHub API access
- Check rate limit state

**Resolution:**

- Use `--force` flag to bypass rate limit
- Verify `GITHUB_TOKEN` permissions

### Stale Data

**Symptom:** Digest shows outdated blocker information

**Diagnosis:**

- Check issue query results
- Verify labels are correctly applied

**Resolution:**

- Ensure issues have `release-blocker` label
- Re-run with `--force` flag

### Rate Limit Not Resetting

**Symptom:** Digest skipped even after 24 hours

**Diagnosis:**

- Check state file timestamps
- Verify timezone handling

**Resolution:**

- Use `--force` flag for immediate generation
- Manually reset state file if corrupted

---

## Integration with Other Systems

### Blocker Escalation

The digest reads escalation state from `blockers_state.json` to show:

- Escalation levels for each blocker
- Time since first detection

### Release Train Dashboard

When available, the digest integrates with dashboard data for:

- Promotable candidate detection
- Release line status
- RC/GA tag information

---

## References

- [Blocker Escalation](BLOCKER_ESCALATION.md)
- [Hotfix Override](../releases/HOTFIX_OVERRIDE.md)
- [Two-Person Approval](../releases/TWO_PERSON_APPROVAL.md)

---

## Change Log

| Date       | Change                     | Author               |
| ---------- | -------------------------- | -------------------- |
| 2026-01-08 | Initial Release Ops Digest | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
