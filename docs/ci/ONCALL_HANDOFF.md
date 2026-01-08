# On-Call Handoff Generator

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The On-Call Handoff Generator creates concise, actionable handoff notes for release operations shift transitions. Notes are designed to be copy-pasteable into Slack, email, or GitHub discussions.

### Key Properties

- **Shift-aware**: Automatically detects current shift and generates appropriate handoff
- **Actionable**: Prioritizes urgent items and provides clear next steps
- **Multi-format**: Generates both Markdown and Slack-friendly plain text
- **Context preservation**: Carries forward notes from previous shift

---

## Shift Schedule

Release operations follows a follow-the-sun model with three shifts:

| Shift    | Hours (UTC) | Handoff Time |
| -------- | ----------- | ------------ |
| APAC     | 00:00-08:00 | 07:30 UTC    |
| EMEA     | 08:00-16:00 | 15:30 UTC    |
| Americas | 16:00-00:00 | 23:30 UTC    |

Handoff notes are generated 30 minutes before each shift change.

---

## Handoff Note Contents

### Quick Status

Summary dashboard with status indicators:

- Open Blockers count and status
- P0 Critical count
- Active Escalations
- Failed CI Runs
- Overall Status (OK/WARNING/CRITICAL)

### Active Blockers

Top 5 open release blockers, sorted by age:

- Issue number with link
- Truncated title

### Active Escalations

P0 escalated issues requiring immediate attention.

### Recommended Actions

Prioritized action items based on current state:

1. **[URGENT]** items for P0 blockers and escalations
2. CI failures to review
3. Monitoring recommendations

### Context from Previous Shift

Notes carried forward from the outgoing shift, preserving institutional knowledge across handoffs.

### Quick Links

Direct links to:

- Open blockers query
- CI runs dashboard
- Release Ops Digest

---

## Example Handoff Note

### Markdown Format

```markdown
# Release Ops On-Call Handoff

**From:** Americas | **To:** APAC
**Generated:** 2026-01-08T23:30:00Z
**Repository:** org/summit

---

## Quick Status

| Metric             | Value | Status |
| ------------------ | ----- | ------ |
| Open Blockers      | 3     | [WARN] |
| P0 Critical        | 1     | [CRIT] |
| Active Escalations | 1     | [WARN] |
| Failed CI Runs     | 0     | [OK]   |

**Overall Status:** CRITICAL

---

## Active Blockers

- [#456](url) SBOM generation failing on arm64 builds...
- [#455](url) E2E tests flaky in matrix config...
- [#454](url) Dependency scan timeout on large repos...

---

## Recommended Actions

1. **[URGENT]** Triage 1 P0 blocker(s) immediately
2. **[URGENT]** Address 1 active escalation(s)
3. Monitor 3 open blocker(s)
```

### Slack Format

```
:handshake: *Release Ops Handoff: Americas -> APAC*
_2026-01-08 23:30 UTC_

*Quick Status:* CRITICAL
- Blockers: 3 (P0: 1)
- Escalations: 1
- Failed CI: 0

:rotating_light: *Urgent Actions:*
- Triage 1 P0 blocker(s)
- Address 1 escalation(s)

*Top Blockers:*
- #456: SBOM generation failing on arm64 builds...
- #455: E2E tests flaky in matrix config...
- #454: Dependency scan timeout on large repos...

<https://github.com/org/summit/issues?q=is%3Aopen+label%3Arelease-blocker|View all blockers>
```

---

## Workflow Schedule

The handoff workflow runs automatically before each shift change:

```yaml
on:
  schedule:
    - cron: "30 7 * * *" # Before EMEA -> Americas
    - cron: "30 15 * * *" # Before Americas -> APAC
    - cron: "30 23 * * *" # Before APAC -> EMEA
```

---

## Manual Invocation

### Via GitHub Actions UI

1. Navigate to Actions → On-Call Handoff
2. Click "Run workflow"
3. Select shift (or leave as "auto")
4. Optionally add context message
5. Click "Run workflow"

### Via CLI

```bash
# Auto-detect shift
./scripts/release/generate_oncall_handoff.sh

# Force specific shift
./scripts/release/generate_oncall_handoff.sh --shift americas

# Add context for next shift
./scripts/release/generate_oncall_handoff.sh --context "Release candidate RC-4.2.1 is ready for smoke testing"

# Generate Slack-friendly output
./scripts/release/generate_oncall_handoff.sh --slack-out /tmp/handoff_slack.txt

# Dry run (no state update)
./scripts/release/generate_oncall_handoff.sh --dry-run
```

---

## Configuration

### Policy File

The handoff is configured via `docs/ci/ONCALL_HANDOFF_POLICY.yml`:

```yaml
schedule:
  shift_changes:
    - "08:00" # EMEA -> Americas
    - "16:00" # Americas -> APAC
    - "00:00" # APAC -> EMEA
  lead_time_minutes: 30

content:
  max_blockers: 5
  max_recent_events: 10
  include_sections:
    - summary
    - active_blockers
    - pending_actions
```

### Customizing Shifts

To adjust shift times for your organization:

1. Edit `docs/ci/ONCALL_HANDOFF_POLICY.yml`
2. Update `schedule.shift_changes` times
3. Update `.github/workflows/oncall-handoff.yml` cron expressions
4. Commit and push

---

## State Tracking

### State File

Handoff state is tracked in `docs/releases/_state/handoff_state.json`:

```json
{
  "version": "1.0.0",
  "last_handoff_at": "2026-01-08T23:30:00Z",
  "last_handoff_shift": "americas",
  "previous_context": "RC-4.2.1 ready for smoke testing",
  "last_blocker_snapshot": [...]
}
```

### State Fields

| Field                   | Description                        |
| ----------------------- | ---------------------------------- |
| `last_handoff_at`       | ISO timestamp of last handoff      |
| `last_handoff_shift`    | Which shift generated last handoff |
| `previous_context`      | Context notes to carry forward     |
| `last_blocker_snapshot` | Blocker state for change detection |

---

## Adding Context for Next Shift

To pass notes to the incoming shift:

### Via CLI

```bash
./scripts/release/generate_oncall_handoff.sh \
  --context "CI queue is backed up due to GitHub outage. Expected to clear by 02:00 UTC."
```

### Via Workflow

1. Trigger manual workflow run
2. Enter context in the "Additional context" field
3. Context will appear in the generated handoff note

---

## Slack Integration (Optional)

To post handoffs directly to Slack:

1. Create a Slack incoming webhook
2. Add webhook URL as repository secret `SLACK_RELEASE_OPS_WEBHOOK`
3. Update policy to enable Slack posting:
   ```yaml
   output:
     slack_webhook:
       enabled: true
   ```
4. Add webhook step to workflow (see workflow for template)

---

## Troubleshooting

### Missing Blocker Data

**Symptom:** Handoff shows 0 blockers when issues exist

**Diagnosis:**

- Verify issues have `release-blocker` label
- Check GitHub token permissions

**Resolution:**

- Ensure workflow has `issues: read` permission
- Verify label spelling matches policy

### Wrong Shift Detected

**Symptom:** Handoff shows incorrect shift

**Diagnosis:**

- Check system UTC time
- Review shift boundary logic

**Resolution:**

- Use `--shift` flag to force correct shift
- Verify workflow cron times are UTC

### Context Not Preserved

**Symptom:** Previous shift notes not appearing

**Diagnosis:**

- Check state file for `previous_context`
- Verify state file is being committed

**Resolution:**

- Ensure workflow has `contents: write` permission
- Check for commit conflicts

---

## Integration with Other Systems

### Release Ops Digest

The handoff generator reads blocker state from the same sources as the daily digest, ensuring consistency.

### Blocker Escalation

Escalation status is reflected in the handoff note, highlighting P0 escalations prominently.

---

## References

- [Release Ops Digest](RELEASE_OPS_DIGEST.md)
- [Blocker Escalation](BLOCKER_ESCALATION.md)
- [Two-Person Approval](../releases/TWO_PERSON_APPROVAL.md)

---

## Change Log

| Date       | Change                          | Author               |
| ---------- | ------------------------------- | -------------------- |
| 2026-01-08 | Initial On-Call Handoff release | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
