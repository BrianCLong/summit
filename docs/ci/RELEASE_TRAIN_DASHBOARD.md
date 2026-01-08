# Release Train Dashboard

**Status:** Active (MVP-4)
**Owner:** Platform Engineering
**Last Updated:** 2026-01-08

## Overview

The Release Train Dashboard provides a visual overview of the release pipeline status, including health metrics, active blockers, CI status, and promotion readiness. It serves as a single pane of glass for release operations.

### Key Properties

- **Real-time health score**: 0-100 score based on blockers and CI status
- **Promotion readiness**: Clear yes/no indicator with blocking reasons
- **Multi-format output**: Markdown dashboard + JSON data
- **Historical tracking**: Health score history for trend analysis

---

## Dashboard Sections

### Health Score

A 0-100 score calculated from:

| Factor             | Impact     |
| ------------------ | ---------- |
| Each open blocker  | -5 points  |
| Each P0 blocker    | -20 points |
| Each failed CI run | -3 points  |

| Score Range | Status    | Emoji |
| ----------- | --------- | ----- |
| 90-100      | Excellent | 🟢    |
| 70-89       | Good      | 🟡    |
| 50-69       | Warning   | 🟠    |
| 0-49        | Critical  | 🔴    |

### Quick Stats

| Metric          | Description                          |
| --------------- | ------------------------------------ |
| Latest Stable   | Most recent GA release tag           |
| Latest RC       | Most recent release candidate        |
| Open Blockers   | Count of `release-blocker` issues    |
| P0 Critical     | Count of P0/escalated blockers       |
| CI Success Rate | Percentage of successful recent runs |
| Promotion Ready | Yes/No with blocking reasons         |

### Promotion Status

Shows whether the current RC can be promoted to GA:

- ✅ **Ready** - No blockers, CI passing
- ❌ **Blocked** - Lists blocking issues

### Release Lines

| Line   | Description                        |
| ------ | ---------------------------------- |
| Stable | Current production release         |
| RC     | Release candidate under validation |
| Main   | Active development branch          |

### CI Status

Recent workflow runs with status indicators:

| Status      | Indicator |
| ----------- | --------- |
| Success     | ✅        |
| Failure     | ❌        |
| In Progress | 🔄        |
| Queued      | ⏳        |
| Cancelled   | ⚫        |

### Active Blockers

Table of open release blockers with:

- Issue number (linked)
- Priority label
- Age
- Title (truncated)

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

## Manual Invocation

### Via GitHub Actions UI

1. Navigate to Actions → Release Train Dashboard
2. Click "Run workflow"
3. Optionally enable "Publish to GitHub Pages"
4. Click "Run workflow"

### Via CLI

```bash
# Generate dashboard
./scripts/release/generate_release_dashboard.sh

# Custom output paths
./scripts/release/generate_release_dashboard.sh \
  --out /tmp/dashboard.md \
  --json /tmp/dashboard.json

# Dry run (no state update)
./scripts/release/generate_release_dashboard.sh --dry-run
```

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

## References

- [Release Ops Index](RELEASE_OPS_INDEX.md)
- [Release Ops Digest](RELEASE_OPS_DIGEST.md)
- [Blocker Escalation](BLOCKER_ESCALATION.md)

---

## Change Log

| Date       | Change                          | Author               |
| ---------- | ------------------------------- | -------------------- |
| 2026-01-08 | Initial Release Train Dashboard | Platform Engineering |

---

**Document Authority**: Platform Engineering
**Next Review**: 2026-02-08 (or before MVP-5 kickoff)
