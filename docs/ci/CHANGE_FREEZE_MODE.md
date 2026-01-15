# Change Freeze Mode

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

---

## Overview

Change Freeze Mode is an automatic governance mechanism that restricts release actions when the error budget is exhausted. It provides a safety valve that prevents cascading failures while still allowing emergency hotfixes.

### Key Principles

1. **Auto-Activate Only**: Freeze mode activates automatically, never deactivates automatically
2. **Hotfix Path Preserved**: Emergency hotfixes always allowed regardless of freeze state
3. **Bounded Overrides**: Temporary overrides expire, don't clear freeze
4. **Manual Reset Required**: Only humans can fully clear freeze mode

---

## When Freeze Activates

Freeze mode activates when:

- Error budget tier reaches **RED**
- Any budget is **exhausted** (rollbacks, FAILs, or WARNs)

The activation is recorded in `docs/releases/_state/freeze_mode.json`.

---

## What Freeze Blocks

| Release Type         | Blocked? | Notes                           |
| -------------------- | -------- | ------------------------------- |
| GA Promotion         | Yes      | Blocked until override or reset |
| RC→GA Promotion      | Yes      | Blocked until override or reset |
| Pages Publish (WARN) | Optional | Configurable in policy          |
| Hotfix Release       | **No**   | Always allowed                  |

---

## Release Paths During Freeze

### Hotfix Path (Always Allowed)

```bash
# Hotfix releases bypass freeze gate
gh workflow run hotfix-release.yml \
  -f version="4.1.2-hotfix.1" \
  -f commit_sha="abc123" \
  -f justification="Critical security patch" \
  -f incident_ticket="https://..."
```

### Override Path (Temporary)

```bash
# Request temporary override (requires environment approval)
gh workflow run release-override.yml \
  -f justification="Must ship feature for customer deadline" \
  -f ticket_url="https://..." \
  -f duration_hours=24
```

### Reset Path (Permanent)

Create a PR that sets `freeze_mode: false` in the state file:

```json
{
  "freeze_mode": false,
  "set_at": "2026-01-08T12:00:00Z",
  "reason": "manual_reset_after_remediation",
  "set_by": "human",
  "note": "Budget issues resolved, see PR #1234"
}
```

---

## Override System

### How Overrides Work

1. User triggers `release-override.yml` workflow
2. Workflow requires `release-override` environment approval
3. Upon approval, override is written with expiration time
4. Freeze gate checks for valid, non-expired override
5. If override is valid, release proceeds
6. Override expires automatically - freeze remains active

### Override Limitations

- Maximum duration: 24 hours
- Requires justification (50+ characters)
- Requires ticket URL
- Requires environment approval
- Does NOT clear freeze mode

### Override State

Override state is stored in `docs/releases/_state/release_override.json`:

```json
{
  "active": true,
  "set_at": "2026-01-08T10:00:00Z",
  "expires_at": "2026-01-09T10:00:00Z",
  "justification": "Critical customer deadline requires this release",
  "ticket_url": "https://...",
  "approved_via_environment": "release-override",
  "approved_by": "user",
  "note": "Temporary override - does not clear freeze mode"
}
```

---

## Freeze Gate Script

The `enforce_freeze_gate.sh` script enforces freeze mode:

```bash
# Check if GA release is allowed
./scripts/release/enforce_freeze_gate.sh --mode ga

# Check RC promotion
./scripts/release/enforce_freeze_gate.sh --mode rc

# Check Pages publish
./scripts/release/enforce_freeze_gate.sh --mode pages

# Hotfix (always exits 0)
./scripts/release/enforce_freeze_gate.sh --mode hotfix
```

### Exit Codes

| Code | Meaning                |
| ---- | ---------------------- |
| 0    | Allowed to proceed     |
| 1    | Blocked by freeze mode |
| 2    | Configuration error    |

### Options

| Option              | Description                                    |
| ------------------- | ---------------------------------------------- |
| `--mode MODE`       | Release mode: ga, rc, pages, hotfix (required) |
| `--tag TAG`         | Optional tag being released                    |
| `--sha SHA`         | Optional commit SHA                            |
| `--freeze-file F`   | Override freeze mode file path                 |
| `--override-file F` | Override release override file path            |
| `--dry-run`         | Check without blocking                         |
| `--verbose`         | Enable verbose logging                         |

---

## Pipeline Integration

### GA Pipeline

The GA pipeline includes a freeze gate check:

```yaml
freeze-gate:
  name: "🔒 Freeze Gate"
  runs-on: ubuntu-latest
  needs: gate
  if: needs.gate.outputs.is_ga == 'true'

  steps:
    - name: Checkout
      uses: actions/checkout@v4

    - name: Check Freeze Mode
      run: |
        scripts/release/enforce_freeze_gate.sh \
          --mode ga \
          --tag "${{ needs.gate.outputs.tag }}"
```

If freeze is active and no valid override exists, the workflow fails at this step with clear remediation instructions.

---

## Clearing Freeze Mode

### Prerequisites

1. Investigate and resolve underlying budget issues
2. Ensure current budget tier is improving
3. Document remediation in PR

### Process

1. Create a branch:

   ```bash
   git checkout -b clear-freeze-mode
   ```

2. Edit `docs/releases/_state/freeze_mode.json`:

   ```json
   {
     "freeze_mode": false,
     "set_at": "2026-01-08T12:00:00Z",
     "reason": "manual_reset_after_remediation",
     "set_by": "human",
     "tier": null,
     "expires_at": null,
     "note": "Resolved rollback issues, see incident postmortem #123"
   }
   ```

3. Commit and push:

   ```bash
   git add docs/releases/_state/freeze_mode.json
   git commit -m "chore: clear freeze mode after remediation

   Resolved: <description>
   Postmortem: <link>
   Evidence: <link to budget panel showing improvement>"
   git push -u origin clear-freeze-mode
   ```

4. Create PR and get approval

5. Merge - freeze mode is now cleared

### Best Practices

- Don't clear freeze just to ship a release (use override instead)
- Include evidence of improvement (budget panel, SLO report)
- Reference postmortem or remediation ticket
- Get appropriate approvals

---

## Blocked Release Message

When freeze blocks a release, operators see:

```
==============================================
  CHANGE FREEZE MODE ACTIVE
==============================================

Release mode 'ga' is blocked due to error budget exhaustion.

Freeze Details:
  Reason: error_budget_EMERGENCY
  Tier: RED
  Set at: 2026-01-08T08:00:00Z

Options:

  1. Use hotfix-release workflow (always allowed)
     gh workflow run hotfix-release.yml

  2. Request temporary override
     gh workflow run release-override.yml \
       -f justification='Reason for override' \
       -f ticket_url='https://...' \
       -f duration_hours=24

  3. Wait for manual freeze reset
     Create PR to set freeze_mode=false in:
     docs/releases/_state/freeze_mode.json

==============================================
```

---

## State Files

### freeze_mode.json

Location: `docs/releases/_state/freeze_mode.json`

```json
{
  "freeze_mode": true,
  "set_at": "2026-01-08T08:00:00Z",
  "reason": "error_budget_EMERGENCY",
  "set_by": "automation",
  "tier": "RED",
  "expires_at": null,
  "note": "Automatically set due to budget exhaustion."
}
```

### release_override.json

Location: `docs/releases/_state/release_override.json`

```json
{
  "active": true,
  "set_at": "2026-01-08T10:00:00Z",
  "expires_at": "2026-01-09T10:00:00Z",
  "justification": "...",
  "ticket_url": "...",
  "approved_via_environment": "release-override",
  "approved_by": "user",
  "note": "Temporary override - does not clear freeze mode"
}
```

---

## Environment Setup

### release-override Environment

To enable override approval:

1. Go to Settings → Environments
2. Create `release-override` environment
3. Configure required reviewers (e.g., release engineering team)
4. Optionally add deployment branch rules

---

## Troubleshooting

### Freeze Won't Clear

1. Ensure you're editing via PR (not direct push)
2. Verify JSON syntax is valid
3. Set `set_by: "human"` to indicate manual reset
4. Get PR approved before merge

### Override Not Working

1. Check override hasn't expired
2. Verify override file has `active: true`
3. Ensure override was committed after freeze was set
4. Run gate script with `--verbose` to debug

### Gate Script Errors

1. Exit code 2 = configuration error
2. Check file paths are correct
3. Verify jq is available
4. Run with `--verbose` for details

---

## Security Considerations

- Freeze mode protects against velocity-induced incidents
- Override requires environment approval (audit trail)
- Hotfix path requires its own approval workflow
- All state changes are committed with attribution

---

## References

- **Gate Script**: `scripts/release/enforce_freeze_gate.sh`
- **Override Workflow**: `.github/workflows/release-override.yml`
- **Freeze State**: `docs/releases/_state/freeze_mode.json`
- **Override State**: `docs/releases/_state/release_override.json`
- **Error Budget**: `docs/ci/ERROR_BUDGET.md`
- **GA Pipeline**: `.github/workflows/release-ga-pipeline.yml`

---

## Change History

| Version | Date       | Changes                                   |
| ------- | ---------- | ----------------------------------------- |
| 1.0.0   | 2026-01-08 | Initial change freeze mode implementation |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
