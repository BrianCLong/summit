# RepoOS Operator Runbook

**Version:** 1.0.0
**Last Updated:** 2026-03-09
**On-Call:** RepoOS Team

## Quick Reference

| Command | Purpose |
|---------|---------|
| `node scripts/validate-repoos.mjs` | Run health checks |
| `node scripts/repoos-dashboard.mjs` | Live monitoring dashboard |
| `node /tmp/repoos-analysis.mjs` | Generate PR analysis |
| `gh workflow run repoos-continuous-monitoring.yml` | Trigger monitoring workflow |
| `gh workflow run repoos-auto-batch.yml` | Trigger auto-batching |

## System Overview

RepoOS (Repository Operating System) is an automated PR management system consisting of:

1. **Patch Window Manager** - Batches related PRs by concern
2. **Frontier Lock Protocol** - Prevents multi-agent conflicts
3. **Entropy Monitor** - Detects repository chaos
4. **ML Intelligence** - AI/ML-powered optimization

## Normal Operations

### Daily Checks (5 minutes)

1. **Check System Status**
   ```bash
   node scripts/validate-repoos.mjs
   ```
   All checks should pass. If not, see [Troubleshooting](#troubleshooting).

2. **Review Dashboard**
   ```bash
   node scripts/repoos-dashboard.mjs
   ```
   - Status should be "OPERATIONAL"
   - Entropy should be "STABLE" or "WATCH"
   - Stale PRs should be < 10

3. **Check GitHub Actions**
   ```bash
   gh workflow list | grep repoos
   gh run list --workflow=repoos-continuous-monitoring.yml --limit 5
   ```
   Recent runs should be successful (green ✓).

### Weekly Tasks (15 minutes)

1. **Review Metrics**
   - Check `artifacts/repoos-monitor.json` for trends
   - Review stale PR count over time
   - Analyze concern distribution changes

2. **Tune Configuration** (if needed)
   - Adjust patch window durations in `.repoos/patch-windows.yml`
   - Update lock timeouts if contention detected
   - Modify entropy thresholds if false positives occur

3. **Review Alerts**
   ```bash
   gh issue list --label repoos-alert
   ```
   Address any open alerts.

## Monitoring

### Key Metrics

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Stale PRs | < 5 | 5-10 | > 10 |
| Total PRs | < 100 | 100-150 | > 150 |
| Entropy | STABLE | WATCH | WARNING/CRITICAL |
| Workflow Success | > 95% | 90-95% | < 90% |

### Alerts

RepoOS generates alerts via:
- **GitHub Issues** - Labeled `repoos-alert`
- **Workflow Failures** - Email notifications
- **Health Degradation** - Automatic issue creation

**Response Time:**
- P0 (Critical): 15 minutes
- P1 (High): 1 hour
- P2 (Medium): 4 hours
- P3 (Low): Next business day

## Troubleshooting

### Issue: Validation Checks Failing

**Symptoms:** `node scripts/validate-repoos.mjs` shows failures

**Solutions:**

1. **"Missing files"**
   ```bash
   # Ensure you're on correct branch
   git branch --show-current

   # Pull latest
   git pull origin main
   ```

2. **"Uncommitted changes"**
   ```bash
   # Review and commit/stash changes
   git status
   git add .
   git commit -m "chore: commit pending changes"
   ```

3. **"GitHub CLI not authenticated"**
   ```bash
   gh auth login
   # Follow prompts
   ```

4. **"Analysis report is old"**
   ```bash
   node /tmp/repoos-analysis.mjs
   ```

### Issue: High Stale PR Count

**Symptoms:** > 10 PRs older than 30 days

**Solutions:**

1. **Review stale PRs**
   ```bash
   gh pr list --search "created:<$(date -d '30 days ago' +%Y-%m-%d)" --limit 20
   ```

2. **Identify owners and ping**
   ```bash
   # For each stale PR:
   gh pr comment <number> --body "@author Please update or close this PR"
   ```

3. **Close abandoned PRs**
   ```bash
   # If author unresponsive after 7 days:
   gh pr close <number> --comment "Closing due to inactivity. Please reopen if still relevant."
   ```

### Issue: Entropy Reaches WARNING/CRITICAL

**Symptoms:** Dashboard shows entropy "WARNING" or "CRITICAL"

**Root Cause:** Too many concurrent changes causing repository chaos

**Solutions:**

1. **Immediate (< 15 min):**
   ```bash
   # Pause auto-batching
   gh workflow disable repoos-auto-batch.yml

   # Alert team
   echo "⚠️  RepoOS Entropy Critical - Pausing auto-batch" | gh issue create --title "RepoOS Alert" --body-file -
   ```

2. **Short-term (< 1 hour):**
   - Review active PR count
   - Identify and merge quick-wins (low-risk PRs)
   - Defer non-urgent PRs

3. **Long-term:**
   - Increase patch window duration
   - Add rate limiting to batch processing
   - Review team coordination practices

### Issue: Workflow Failures

**Symptoms:** GitHub Actions workflows showing red ✗

**Solutions:**

1. **Check workflow logs**
   ```bash
   gh run view --log
   ```

2. **Common failures:**

   **API Rate Limit**
   - Wait 1 hour for reset
   - Consider reducing monitoring frequency

   **Permission Denied**
   - Check workflow permissions in `.github/workflows/`
   - Verify `GITHUB_TOKEN` has required scopes

   **Script Errors**
   - Review error message
   - Test script locally: `node <script-path>`
   - Fix and push update

3. **Re-run failed workflow**
   ```bash
   gh run rerun <run-id>
   ```

### Issue: Dashboard Not Updating

**Symptoms:** `node scripts/repoos-dashboard.mjs` shows stale data

**Solutions:**

1. **Refresh analysis**
   ```bash
   node /tmp/repoos-analysis.mjs
   ```

2. **Check GitHub API**
   ```bash
   gh pr list --limit 1
   # Should succeed without errors
   ```

3. **Verify artifacts directory**
   ```bash
   ls -la artifacts/repoos-analysis.json
   cat artifacts/repoos-analysis.json | jq '.timestamp'
   ```

## Maintenance

### Monthly Tasks

1. **Review and clean old artifacts**
   ```bash
   # Keep only last 30 days
   find artifacts/ -name "repoos-*.json" -mtime +30 -delete
   ```

2. **Update dependencies**
   ```bash
   # If Node dependencies added
   npm audit
   npm update
   ```

3. **Review and tune thresholds**
   - Analyze false positive rate for alerts
   - Adjust entropy thresholds if needed
   - Update concern patterns based on new PR types

### Quarterly Tasks

1. **Performance review**
   - Measure average batch processing time
   - Analyze lock contention rates
   - Review entropy stability over quarter

2. **Capacity planning**
   - Project PR growth
   - Plan infrastructure scaling if needed
   - Review storage for artifacts

3. **Training updates**
   - Update this runbook with new learnings
   - Train new team members on RepoOS

## Emergency Procedures

### Emergency: Complete System Failure

**Symptoms:** All validations failing, workflows broken, PRs unprocessable

**Steps:**

1. **Immediate (< 5 min):**
   ```bash
   # Disable all workflows
   gh workflow disable repoos-continuous-monitoring.yml
   gh workflow disable repoos-auto-batch.yml

   # Create incident
   gh issue create --title "🚨 RepoOS System Failure" --label "incident,P0"
   ```

2. **Assessment (< 15 min):**
   - Run diagnostics: `node scripts/validate-repoos.mjs`
   - Check GitHub status: https://www.githubstatus.com/
   - Review recent commits for breaking changes

3. **Recovery (< 1 hour):**
   - If code issue: revert to last known good commit
   - If infrastructure: wait for GitHub recovery
   - If configuration: restore from backup

4. **Verification (< 30 min):**
   - Run validation checks
   - Process test PR through system
   - Re-enable workflows when stable

### Emergency: Data Corruption

**Symptoms:** Analysis reports show impossible values, PRs miscategorized

**Steps:**

1. **Stop processing**
   ```bash
   gh workflow disable repoos-auto-batch.yml
   ```

2. **Backup current state**
   ```bash
   cp -r artifacts artifacts.backup.$(date +%Y%m%d_%H%M%S)
   ```

3. **Regenerate data**
   ```bash
   rm artifacts/repoos-*.json
   node /tmp/repoos-analysis.mjs
   ```

4. **Verify integrity**
   ```bash
   node scripts/validate-repoos.mjs
   ```

5. **Resume if healthy**
   ```bash
   gh workflow enable repoos-auto-batch.yml
   ```

## Escalation

### Level 1: Operator (You)
- Handle routine operations
- Execute runbook procedures
- Resolve common issues

### Level 2: RepoOS Engineers
**Contact:** @repoos-team
**When:** Runbook procedures don't resolve issue within SLA

### Level 3: Platform Team
**Contact:** @platform-oncall
**When:** Infrastructure or GitHub API issues

### Level 4: Leadership
**Contact:** @engineering-leads
**When:** Business-impacting outage > 4 hours

## FAQ

**Q: Can I manually trigger batching?**
A: Yes, run: `gh workflow run repoos-auto-batch.yml --field dry_run=false`

**Q: How do I exclude a PR from batching?**
A: Add label `do-not-merge` or `work-in-progress` to the PR

**Q: Can I change monitoring frequency?**
A: Yes, edit `.github/workflows/repoos-continuous-monitoring.yml` cron schedules

**Q: What if I accidentally disable a workflow?**
A: Re-enable: `gh workflow enable <workflow-name>.yml`

**Q: How do I test changes without affecting production?**
A: Use `DRY_RUN=true` environment variable for all scripts

## Additional Resources

- [Deployment Report](./REPOOS_DEPLOYMENT_REPORT.md)
- [SOTA Features Documentation](./scripts/orchestrator/RESURRECTION_SYSTEM_SOTA.md)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- RepoOS Team Slack: #repoos-oncall

---

**Emergency Hotline:** Create P0 issue with @repoos-team mention
**Documentation:** This runbook is the source of truth
**Updates:** Submit PRs to improve this runbook based on incidents
