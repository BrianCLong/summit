# Post-Merge Comment Template

Use this template when PR #10202 (Merge Train Operations Suite) is merged.

---

## Comment to Post on PR #10202

````markdown
## ✅ Merge Train Operations Suite — Deployed!

**Deployment Complete:** $(date +"%Y-%m-%d %H:%M UTC")

### 🎯 Immediate Next Steps

1. **Verify nightly health workflow is scheduled:**
   ```bash
   gh workflow view merge-train-health.yml
   ```
````

2. **Run initial health check:**

   ```bash
   make -f Makefile.merge-train mt-health
   ```

3. **Optional: Configure Slack alerts**
   ```bash
   gh secret set SLACK_MERGE_TRAIN_WEBHOOK --body "https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
   ```

### 📊 First Nightly Report

The first automated health report will run tonight at **02:00 UTC** (~6 PM PT).

**Check it here:**

- Actions tab → Merge Train Health Check workflow
- Artifacts section → `merge-train-health-report-*`
- Issues tab → Look for 🚨 alerts if health <60

### 📈 Baseline Metrics (as of merge)

| Metric        | Current | Target (90d) |
| ------------- | ------- | ------------ |
| Open PRs      | 343     | <100         |
| Conflict Rate | ~57%    | <20%         |
| Avg PR Age    | ~60d    | <21d         |
| Merges/Week   | ~95     | >200         |

### 🚀 Week 1 Execution Plan

**Monday (Day 1):** Run triage on 148 conflicting PRs

```bash
make -f Makefile.merge-train mt-triage
```

**Tuesday (Day 2):** Generate hotspot report & update CODEOWNERS

```bash
make -f Makefile.merge-train mt-hotspots
# Review /tmp/hotspot-report.csv
# Update .github/CODEOWNERS as needed
```

**Wednesday (Day 3):** Close stale draft PRs

```bash
make -f Makefile.merge-train mt-close-stale
```

**Thursday (Day 4):** Review metrics & health trends

```bash
make -f Makefile.merge-train mt-health
make -f Makefile.merge-train mt-metrics
```

**Friday (Day 5):** Merge ready PRs (express + standard lanes)

```bash
make -f Makefile.merge-train mt-express-lane  # Auto-merge eligible
make -f Makefile.merge-train mt-standard-lane # Review-ready
```

### 📚 Documentation

- **Quick Start:** `docs/MERGE_TRAIN_README.md`
- **Operations:** `docs/merge-train-runbook.md`
- **Commands:** `docs/merge-train-quick-reference.md`
- **Session Log:** `docs/merge-train-session-2025-10-14.md`

### 🔔 Monitoring

**Nightly Health Workflow:** `.github/workflows/merge-train-health.yml`

- Runs daily at 02:00 UTC
- Creates Issues for critical health (<60 score)
- Comments on blocking PRs (>60 days + conflicting)
- Uploads report artifacts
- Posts to Slack (if configured)

**Health Score Thresholds:**

- 🟢 **80-100:** Healthy (business as usual)
- 🟡 **60-79:** Needs Attention (run triage weekly)
- 🔴 **0-59:** Critical (emergency sprint, escalate to DevEx)

### 🆘 Support

- **Questions:** Comment on this PR or open new issue with `merge-train` label
- **Bugs:** [New Issue](https://github.com/BrianCLong/summit/issues/new?labels=merge-train,bug)
- **Docs:** `make -f Makefile.merge-train help`
- **Owner:** @intelgraph-devops-team

---

🎉 **Thank you for reviewing!** The merge train is now operational and ready to accelerate our PR throughput.

Track progress at: [Merge Train Health Dashboard](https://github.com/BrianCLong/summit/actions/workflows/merge-train-health.yml)

```

---

## Slack Announcement Template

Post this in #engineering or #dev-announcements:

```

🚂 **Merge Train Operations Suite — Now Live!**

We've just deployed a comprehensive merge train system to help us process our PR backlog more efficiently.

**What's New:**
• Automated conflict triage & labeling
• Nightly health monitoring (with alerts)
• Express/Standard/Manual PR lanes
• Hotspot analysis for CODEOWNERS
• 10+ Makefile commands for daily ops

**Quick Commands:**
\`\`\`
make -f Makefile.merge-train mt-health # Check repo health
make -f Makefile.merge-train mt-express-lane # Find ready-to-merge PRs
make -f Makefile.merge-train help # See all commands
\`\`\`

**Current Stats:**
• 343 open PRs (target: <100 in 90 days)
• 57% conflict rate (target: <20%)
• 95 PRs/week velocity (target: >200)

**First Nightly Report:** Tonight at 2 AM UTC

**Docs:** \`docs/MERGE_TRAIN_README.md\`

Questions? Ask in #merge-train or ping @devex-team

````

---

## Post-Merge Validation Checklist

After merging PR #10202, verify:

- [ ] **Workflow is scheduled**
  ```bash
  gh workflow view merge-train-health.yml
  # Should show: "Scheduled" trigger with cron: '0 2 * * *'
````

- [ ] **Scripts are executable**

  ```bash
  ls -lh scripts/triage-conflicting-prs.sh
  ls -lh scripts/conflict-hotspot-report.sh
  ls -lh scripts/merge-train-health-dashboard.sh
  # All should show: -rwxr-xr-x
  ```

- [ ] **Makefile commands work**

  ```bash
  make -f Makefile.merge-train help
  make -f Makefile.merge-train mt-health
  # Should run without errors
  ```

- [ ] **CODEOWNERS is valid**

  ```bash
  # Visit: https://github.com/BrianCLong/summit/blob/main/.github/CODEOWNERS
  # Verify syntax and ownership assignments
  ```

- [ ] **Auto-resolve workflow is enabled**

  ```bash
  gh workflow list | grep "auto-resolve"
  # Should show: "Auto-resolve conflicts" (active)
  ```

- [ ] **First health report completes**
  ```bash
  # Wait for tonight's run at 02:00 UTC
  # Check: https://github.com/BrianCLong/summit/actions/workflows/merge-train-health.yml
  # Download artifact and verify report looks correct
  ```

---

## Troubleshooting Common Issues

### "make: command not found"

**Solution:** Use scripts directly:

```bash
./scripts/merge-train-health-dashboard.sh
./scripts/triage-conflicting-prs.sh
```

### "gh: command not found"

**Solution:** Install GitHub CLI:

```bash
brew install gh  # macOS
sudo apt install gh  # Ubuntu
```

### Workflow doesn't trigger

**Solution:** Manually trigger first run:

```bash
gh workflow run merge-train-health.yml
gh run watch  # Monitor progress
```

### Health score always shows critical

**Possible causes:**

- Open PR count is very high (>300)
- Conflict rate is high (>50%)
- Low merge velocity (<5/day)

**Solutions:** Follow Week 1 execution plan above

---

**Generated:** $(date +"%Y-%m-%d")
**Merge Train Version:** 1.0.0
