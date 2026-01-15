# Release Train Dashboard

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08
**Version:** 2.0.0 (Policy-Driven)

## Overview

The Release Train Dashboard provides real-time visibility into the promotability status of all release candidates using the **same policy engine** that governs RC and GA pipelines. This ensures that what you see in the dashboard is exactly what the promotion gates will enforce.

### Key Principle: Policy-Driven

The dashboard is not an independent system. It computes promotability by:

1. Loading the same `REQUIRED_CHECKS_POLICY.yml` used by pipelines
2. Using the same base-selection algorithm (`compute_base_for_commit.sh`)
3. Running `verify-green-for-tag.sh` in report-only mode

This guarantees **zero drift** between dashboard status and actual pipeline decisions.

### Key Properties

- **Policy-aligned**: Uses same policy engine as RC/GA pipelines
- **Promotion readiness**: Clear promotable/blocked/pending status
- **Multi-format output**: Markdown dashboard + JSON data for automation
- **Machine-consumable**: JSON contract for downstream automation

---

## JSON Contract

The dashboard generates `artifacts/release-train/dashboard.json` with the following schema:

```json
{
  "repository": "owner/repo",
  "generated_at": "2026-01-08T12:00:00Z",
  "generator_version": "1.0.0",
  "candidates": [
    {
      "candidate_type": "main|rc",
      "tag": "v4.1.2-rc.3",
      "commit_sha": "a8b1963...",
      "base_sha": "79a2dee...",
      "changed_files_count": 15,
      "promotable_state": "success|blocked|pending",
      "top_blocker": "CI Core" | null,
      "checks": [
        {
          "name": "CI Core",
          "required": "always|conditional|conditional_skipped",
          "status": "success|failure|pending|skipped",
          "conclusion": "SUCCESS|FAILURE|MISSING|...",
          "url": "https://..."
        }
      ],
      "generated_at": "2026-01-08T12:00:00Z",
      "generator_version": "3.2.0"
    }
  ],
  "summary": {
    "total_candidates": 3,
    "promotable": 1,
    "blocked": 1,
    "pending": 1
  }
}
```

### Field Definitions

| Field                 | Type        | Description                                       |
| --------------------- | ----------- | ------------------------------------------------- |
| `candidate_type`      | string      | `main` for HEAD of main, `rc` for RC tags         |
| `tag`                 | string      | Tag name or `main`                                |
| `commit_sha`          | string      | Full commit SHA                                   |
| `base_sha`            | string      | Base reference used for changed file detection    |
| `changed_files_count` | number      | Number of files changed from base                 |
| `promotable_state`    | enum        | `success`, `blocked`, or `pending`                |
| `top_blocker`         | string/null | Name of first blocking check (if blocked/pending) |
| `checks`              | array       | Detailed check status list                        |

### Promotable State Definitions

| State     | Meaning                             | Action                        |
| --------- | ----------------------------------- | ----------------------------- |
| `success` | All required checks passed          | Safe to promote               |
| `blocked` | One or more required checks failed  | Fix failures before promoting |
| `pending` | Checks still running or not started | Wait for completion           |

### Check Required Types

| Type                  | Meaning                                              |
| --------------------- | ---------------------------------------------------- |
| `always`              | Always required for every commit                     |
| `conditional`         | Required because changed files matched path patterns |
| `conditional_skipped` | Not required (no matching path changes)              |

---

## Dashboard Sections

### Summary Table

| Metric           | Description                                   |
| ---------------- | --------------------------------------------- |
| Total Candidates | Number of evaluated release candidates        |
| Promotable       | Candidates safe to promote (all checks green) |
| Blocked          | Candidates with failed checks                 |
| Pending          | Candidates waiting for checks to complete     |

### Candidate Status

Each candidate shows:

| Status     | Indicator | Meaning                    |
| ---------- | --------- | -------------------------- |
| Promotable | ✅        | All required checks passed |
| Blocked    | ❌        | One or more checks failed  |
| Pending    | ⏳        | Checks still running       |

### Detailed Check Status

For each candidate, the truth table shows:

| Column   | Description                                       |
| -------- | ------------------------------------------------- |
| Check    | Workflow name                                     |
| Required | `always`, `conditional`, or `conditional_skipped` |
| Status   | `success`, `failure`, `pending`, or `skipped`     |

### Action Queue

Lists blocked candidates with their top blockers for quick triage

---

## Example Dashboard

```markdown
# Release Train Dashboard

**Last Updated:** 2026-01-08 12:00 UTC
**Repository:** org/summit

---

## 🟡 Release Health: 75/100

### Quick Stats

| Metric              | Value         |
| ------------------- | ------------- |
| **Latest Stable**   | `v4.1.0`      |
| **Latest RC**       | `v4.2.0-rc.1` |
| **Open Blockers**   | 3             |
| **P0 Critical**     | 1             |
| **CI Success Rate** | 85%           |
| **Promotion Ready** | No            |

---

## Promotion Status

❌ **Not ready for promotion**

Blocking issues: 3 blocker(s), 2 failed run(s)

---

## Release Lines

| Line       | Status         | Latest Tag    | Notes              |
| ---------- | -------------- | ------------- | ------------------ |
| **Stable** | 🟢 Released    | `v4.1.0`      | Production         |
| **RC**     | 🟠 Blocked     | `v4.2.0-rc.1` | Has blockers       |
| **Main**   | 🔄 Development | `HEAD`        | Active development |
```

---

## Update Schedule

The dashboard updates automatically:

| Trigger               | Frequency     |
| --------------------- | ------------- |
| Scheduled             | Every 2 hours |
| Release published     | Immediately   |
| Blocker opened/closed | Immediately   |
| Blocker labeled       | Immediately   |
| Manual dispatch       | On demand     |

---

## JSON Data Format

The dashboard also generates a JSON file for programmatic access:

```json
{
  "timestamp": "2026-01-08T12:00:00Z",
  "repository": "org/summit",
  "versions": {
    "latest_stable": "v4.1.0",
    "latest_rc": "v4.2.0-rc.1"
  },
  "health": {
    "score": 75,
    "blocker_count": 3,
    "p0_count": 1,
    "p1_count": 2
  },
  "ci": {
    "success_rate": 85,
    "total_runs": 20,
    "failed_runs": 3
  },
  "promotion": {
    "ready": false
  },
  "blockers": [...],
  "recent_runs": [...]
}
```

---

## Running Locally

### Generate Dashboard

```bash
# Full generation with live GitHub API calls
./scripts/release/generate_release_train_dashboard.sh

# Dry run (show what would be generated)
./scripts/release/generate_release_train_dashboard.sh --dry-run

# Skip API calls (use empty status maps)
./scripts/release/generate_release_train_dashboard.sh --skip-api

# Verbose output
./scripts/release/generate_release_train_dashboard.sh --verbose

# Custom output directory
./scripts/release/generate_release_train_dashboard.sh \
  --output-dir /tmp/my-dashboard
```

### Output Files

| File                                       | Description             |
| ------------------------------------------ | ----------------------- |
| `artifacts/release-train/dashboard.json`   | Machine-readable JSON   |
| `docs/releases/RELEASE_TRAIN_DASHBOARD.md` | Human-readable markdown |

### Via GitHub Actions UI

1. Navigate to Actions → Release Train Dashboard
2. Click "Run workflow"
3. Optionally configure skip_api or verbose
4. Click "Run workflow"
5. Download artifacts when complete

---

## State Tracking

State tracked in `docs/releases/_state/dashboard_state.json`:

```json
{
  "version": "1.0.0",
  "last_update": "2026-01-08T12:00:00Z",
  "history": [
    {
      "timestamp": "2026-01-08T12:00:00Z",
      "health_score": 75,
      "blockers": 3
    },
    {
      "timestamp": "2026-01-08T10:00:00Z",
      "health_score": 80,
      "blockers": 2
    }
  ]
}
```

History is kept for the last 100 data points for trend analysis.

---

## GitHub Pages Publishing

To publish the dashboard to GitHub Pages:

1. Enable GitHub Pages in repository settings
2. Run workflow with "Publish to GitHub Pages" checked
3. Dashboard will be available at `https://<org>.github.io/<repo>/dashboard.html`

---

## Integration

### With Release Ops Digest

The daily digest can reference dashboard metrics for trend information.

### With On-Call Handoff

Handoff notes include current health score from dashboard.

### With CI/CD

Other workflows can fetch `dashboard.json` artifact for decision-making.

---

## Troubleshooting

### Dashboard Shows Stale Data

**Symptom:** Dashboard doesn't reflect recent changes

**Diagnosis:**

- Check workflow run logs
- Verify trigger conditions

**Resolution:**

- Run workflow manually
- Check `GITHUB_TOKEN` permissions

### Health Score Seems Wrong

**Symptom:** Score doesn't match visible blockers

**Diagnosis:**

- Check label matching
- Verify issue query

**Resolution:**

- Ensure issues have `release-blocker` label
- Check P0/P1 label patterns in script

### JSON Not Generated

**Symptom:** Only markdown output, no JSON

**Diagnosis:**

- Check output directory permissions
- Review script execution logs

**Resolution:**

- Verify `jq` is available
- Check output path is writable

---

## Customization

### Adjusting Health Score Weights

Edit `scripts/release/generate_release_dashboard.sh`:

```bash
# Current weights
score=$((score - blocker_count * 5))   # -5 per blocker
score=$((score - p0_count * 20))        # -20 per P0
score=$((score - failed_runs * 3))      # -3 per failure
```

### Adding Custom Sections

Add new sections in the markdown generation block:

```bash
# In generate_release_dashboard.sh
echo "## Custom Section"
echo ""
echo "Your custom content here"
```

---

## Consuming the Dashboard

### From Other Workflows

Download and use the dashboard JSON:

```yaml
- name: Download Dashboard
  uses: actions/download-artifact@v4
  with:
    name: release-train-dashboard

- name: Check Promotability
  run: |
    BLOCKED=$(jq -r '.summary.blocked' artifacts/release-train/dashboard.json)
    if [[ "${BLOCKED}" -gt 0 ]]; then
      echo "::warning::${BLOCKED} blocked candidates"
    fi
```

### From Scripts

```bash
# Check if any candidates are blocked
if jq -e '.summary.blocked > 0' dashboard.json; then
  echo "Blocked candidates detected"
fi

# Get list of blocked candidates
jq -r '.candidates[] | select(.promotable_state == "blocked") | .tag' dashboard.json

# Get top blocker for each blocked candidate
jq -r '.candidates[] | select(.promotable_state == "blocked") | "\(.tag): \(.top_blocker)"' dashboard.json
```

### Automation Integration

The dashboard JSON is designed to be consumed by:

1. **Issue Automation**: Create/update blocked release issues
2. **Escalation**: Trigger alerts when candidates remain blocked
3. **Handoff Notes**: Include promotability status in shift handoffs
4. **Digest**: Summarize dashboard state in daily reports

---

## References

- **Generator Script**: `scripts/release/generate_release_train_dashboard.sh`
- **Verification Script**: `scripts/release/verify-green-for-tag.sh`
- **Base Computation**: `scripts/release/compute_base_for_commit.sh`
- **Policy File**: `docs/ci/REQUIRED_CHECKS_POLICY.yml`
- **Required Checks Docs**: `docs/ci/REQUIRED_CHECKS.md`
- **Workflow**: `.github/workflows/release-train-dashboard.yml`
- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Release Ops Digest](RELEASE_OPS_DIGEST.md)
- [Blocker Escalation](BLOCKER_ESCALATION.md)

---

## Change Log

| Date       | Change                          | Author               |
| ---------- | ------------------------------- | -------------------- |
| 2026-01-08 | Initial Release Train Dashboard | Platform Engineering |
| 2026-01-08 | v2.0.0: Policy-driven dashboard | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
