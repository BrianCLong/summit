# Merge Train Operations

**Status:** ✅ Operational (as of 2025-10-14)
**Health:** See nightly reports in Actions tab
**Owner:** DevEx Team (@intelgraph-devops-team)

---

## Quick Start

### Daily Operations

```bash
# Check merge train health
make -f Makefile.merge-train mt-health

# Triage conflicting PRs
make -f Makefile.merge-train mt-triage

# View express lane (auto-merge ready)
make -f Makefile.merge-train mt-express-lane
```

### One-Time Setup

1. **Enable nightly health checks** (automated via GitHub Actions)
   - Workflow runs nightly at 2 AM UTC
   - Creates GitHub issues for critical health (<60/100)
   - Optionally posts to Slack (add `SLACK_MERGE_TRAIN_WEBHOOK` secret)

2. **Add to your shell profile** (optional convenience)
   ```bash
   echo 'alias mt="make -f Makefile.merge-train"' >> ~/.bashrc
   source ~/.bashrc
   # Now you can use: mt help, mt mt-health, etc.
   ```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Merge Train Operations Suite                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐│
│  │   Scripts       │  │   Workflows      │  │  Makefile  ││
│  │                 │  │                  │  │            ││
│  │ • triage-*.sh   │  │ • auto-resolve   │  │ mt-triage  ││
│  │ • hotspot-*.sh  │  │ • health-check   │  │ mt-health  ││
│  │ • dashboard.sh  │  │ • (nightly)      │  │ mt-metrics ││
│  └─────────────────┘  └──────────────────┘  └────────────┘│
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Documentation                           │  │
│  │                                                      │  │
│  │ • merge-train-runbook.md (ops procedures)           │  │
│  │ • merge-train-quick-reference.md (commands)         │  │
│  │ • merge-train-session-2025-10-14.md (summary)      │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Available Commands

Run `make -f Makefile.merge-train help` for full list. Key commands:

| Command            | Description            | Typical Use                      |
| ------------------ | ---------------------- | -------------------------------- |
| `mt-health`        | Quick health check     | Daily morning check              |
| `mt-triage`        | Triage conflicting PRs | When conflict rate >50%          |
| `mt-hotspots`      | Identify hot files     | Weekly, before CODEOWNERS update |
| `mt-close-stale`   | Close old drafts       | Weekly cleanup                   |
| `mt-metrics`       | Detailed metrics       | Weekly review meeting            |
| `mt-express-lane`  | List auto-merge ready  | Identify quick wins              |
| `mt-standard-lane` | List review-ready PRs  | Weekly sprint                    |
| `mt-manual-lane`   | List complex PRs       | Monthly deep dive                |

---

## Health Scoring

The system calculates a composite health score (0-100) based on:

### Factors (deductions)

- **Open PR count:** -20 if >300, -10 if >200
- **Conflict rate:** -25 if >50%, -15 if >30%
- **Merge velocity:** -15 if <5 merges/day
- **Old PRs:** -20 if >50 aged PRs, -10 if >30

### Thresholds

- **80-100:** 🟢 Healthy (normal operations)
- **60-79:** 🟡 Needs Attention (run triage, close stale)
- **0-59:** 🔴 Critical (escalate to DevEx, weekly sprint)

---

## Operational Procedures

### Daily (5 minutes)

```bash
# 1. Check health
make -f Makefile.merge-train mt-health

# 2. If any express lane PRs ready, notify team
make -f Makefile.merge-train mt-express-lane
```

### Weekly (1 hour - Friday 10-11 AM)

```bash
# 1. Generate hotspot report
make -f Makefile.merge-train mt-hotspots

# 2. Review and update CODEOWNERS if needed
vim .github/CODEOWNERS

# 3. Triage conflicting PRs
make -f Makefile.merge-train mt-triage

# 4. Close stale drafts
make -f Makefile.merge-train mt-close-stale

# 5. Review metrics
make -f Makefile.merge-train mt-metrics
```

### Emergency (Health <60)

```bash
# 1. Check what's wrong
make -f Makefile.merge-train mt-health

# 2. Immediate triage
make -f Makefile.merge-train mt-triage

# 3. Close all stale drafts
make -f Makefile.merge-train mt-close-stale

# 4. Notify team in #dev channel
# "🚨 Merge train health critical (score: XX). Running emergency triage."

# 5. Schedule extra PR review session
# Aim to merge 20+ PRs in next 24h
```

---

## Automated Workflows

### 1. Auto-Resolve Conflicts

**File:** `.github/workflows/auto-resolve-conflicts.yml`

**Trigger:** On PR open or sync

**Action:** Automatically regenerates lockfiles when conflicts detected

**Example:**

```yaml
# PR #12345 has conflict in package-lock.json
# Workflow detects, regenerates, commits, pushes
# Comments: "✅ Auto-resolved lockfile conflicts"
```

### 2. Nightly Health Check

**File:** `.github/workflows/merge-train-health.yml`

**Trigger:** Daily at 2 AM UTC (or manual)

**Action:**

1. Runs health dashboard script
2. Uploads report artifact
3. Creates GitHub issue if score <60
4. Posts to Slack (if configured)
5. Comments on blocking PRs

**Setup Slack (optional):**

```bash
# Add repository secret
gh secret set SLACK_MERGE_TRAIN_WEBHOOK --body "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

---

## Integration with Existing Tools

### Git Hooks

Add to `.git/hooks/pre-push`:

```bash
#!/bin/bash
# Check merge train health before pushing
make -f Makefile.merge-train mt-health
```

### CI/CD Pipeline

Add health gate to main CI:

```yaml
# .github/workflows/ci.yml
- name: Check merge train health
  run: |
    HEALTH=$(make -f Makefile.merge-train mt-health | grep "Score:" | awk '{print $2}' | cut -d'/' -f1)
    if [ "$HEALTH" -lt 50 ]; then
      echo "::warning::Merge train health is critical ($HEALTH/100)"
    fi
```

### Slack Bot

Post daily summaries:

```bash
# Cron: 0 9 * * * (9 AM daily)
./scripts/merge-train-health-dashboard.sh && \
  curl -X POST $SLACK_WEBHOOK -d @/tmp/merge-train-health-$(date +%Y-%m-%d).md
```

---

## Troubleshooting

### "Command not found: make"

**Fix:** Install make or use scripts directly:

```bash
# Instead of: make -f Makefile.merge-train mt-triage
# Use: ./scripts/triage-conflicting-prs.sh
```

### "Permission denied" on scripts

**Fix:** Ensure scripts are executable:

```bash
chmod +x scripts/*.sh
```

### "gh: command not found"

**Fix:** Install GitHub CLI:

```bash
brew install gh  # macOS
sudo apt install gh  # Ubuntu
```

### Health score always low despite efforts

**Possible causes:**

1. **High PR creation rate** → Enforce PR limits per developer
2. **Complex changes** → Encourage smaller PRs, feature flags
3. **Insufficient reviewer capacity** → Add more reviewers to CODEOWNERS
4. **CI bottlenecks** → Review GitHub Actions concurrency limits

**Solutions:** See `docs/merge-train-runbook.md` § "Long-term Strategy"

---

## Metrics & KPIs

### Current Baseline (2025-10-14)

- Open PRs: 343
- Conflict rate: 57%
- Avg PR age: ~60 days
- Merges/week: ~95

### Targets (3 months)

- Open PRs: <100
- Conflict rate: <20%
- Avg PR age: <21 days
- Merges/week: >200
- Health score: >80 (sustained)

### Tracking

View historical trends:

```bash
# Last 30 days of health scores
ls -lt /tmp/merge-train-health-*.md | head -30
```

Or query GitHub Actions artifacts API.

---

## FAQs

**Q: Why isn't my PR auto-merging?**

A: Check if it meets express lane criteria:

- <100 LOC
- Green CI (fast lane)
- No conflicts
- Has `merge-train:express` label (auto-applied)

**Q: How do I prioritize my PR?**

A: Add to express lane by keeping it small (<100 LOC) with green CI.

**Q: What if I disagree with conflict triage?**

A: Comment on the PR explaining why it should stay open. Remove `stale` label.

**Q: Can I disable auto-comments on my PR?**

A: Add `merge-train:exempt` label (requires DevEx approval).

**Q: How often should we run triage?**

A: Daily if conflict rate >50%, weekly otherwise.

---

## Change Log

### 2025-10-14 - Initial Release

- ✅ 95 PRs merged in first execution
- ✅ Scripts created (triage, hotspot, dashboard)
- ✅ Makefile with 10+ commands
- ✅ Workflows (auto-resolve, health check)
- ✅ Documentation suite (runbook, quick ref, session summary)

### Future Enhancements

- [ ] Auto-merge express lane PRs (requires approval gate)
- [ ] Grafana dashboard for real-time metrics
- [ ] Slack bot for interactive commands
- [ ] Pre-merge linting/autofix workflow
- [ ] Predictive conflict analysis

---

## Support

- **GitHub Issues:** [Report bugs](https://github.com/BrianCLong/summit/issues/new?labels=merge-train)
- **Slack:** #merge-train (internal)
- **Docs:** `docs/merge-train-runbook.md`
- **Owner:** @intelgraph-devops-team

---

**Last Updated:** 2025-10-14
**Version:** 1.0.0
**Status:** ✅ Operational
