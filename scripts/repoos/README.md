# RepoOS Scripts

Operational scripts for the RepoOS Evolution Intelligence System.

## Overview

This directory contains scripts for monitoring, managing, and operating the autonomous repository evolution system.

## Scripts

### Monitoring

#### `daily-health-check.mjs`
Automated daily system health monitoring.

**Purpose:** Collect metrics, detect issues, generate reports
**Frequency:** Daily (via cron)
**Output:** `.repoos/reports/daily-health-<date>.json`

**Usage:**
```bash
# Manual run
node daily-health-check.mjs

# With alerts
node daily-health-check.mjs --alert

# Custom output directory
node daily-health-check.mjs --output-dir /path/to/reports
```

**Metrics Collected:**
- System health score (0-100%)
- Average entropy and velocity
- Stale lock count
- Patch window statistics
- Issues and recommendations

**Alert Thresholds:**
- **Critical:** Health <70%, Entropy velocity >0.01/s, Stale locks >5
- **Warning:** Health <85%, Entropy velocity >0.005/s, Stale locks >2

#### `monitor-classification-accuracy.mjs`
PR classification prediction accuracy tracker.

**Purpose:** Compare predictions vs actual outcomes, identify retraining needs
**Frequency:** Weekly (via cron)
**Output:** `.repoos/reports/classification-accuracy.json`

**Usage:**
```bash
# Analyze last 30 days
node monitor-classification-accuracy.mjs analyze 30

# View latest report
node monitor-classification-accuracy.mjs report
```

**Metrics Tracked:**
- Merge success prediction accuracy
- Risk level calibration
- Lane assignment correctness
- Concern classification precision

**Retraining Triggers:**
- Overall accuracy <70%
- Any metric <50%

### Enforcement

#### `check-frontier-sovereignty.mjs`
CI enforcement of frontier sovereignty rule.

**Purpose:** Prevent direct modification of frontier-owned domains
**Frequency:** Every PR (via GitHub Actions)
**Exit Code:** 0 = pass, 1 = violation detected

**Usage:**
```bash
# Check current PR
node check-frontier-sovereignty.mjs check

# Generate example config
node check-frontier-sovereignty.mjs generate-config
```

**Configuration:** `.repoos/frontier-ownership.yml`

**Violations:**
- Direct commits to frontier-owned files while frontier is active
- Bypassing patch submission system

### Setup

#### `setup-monitoring-cron.sh`
One-time setup for automated monitoring.

**Purpose:** Install cron jobs for health checks and accuracy analysis
**Frequency:** Once (during deployment)

**Usage:**
```bash
chmod +x setup-monitoring-cron.sh
./setup-monitoring-cron.sh
```

**Installs:**
- Daily health check at 00:00 UTC
- Weekly accuracy analysis at 01:00 UTC Sunday

**Logs:**
- `logs/repoos-health.log`
- `logs/repoos-accuracy.log`

## Cron Schedule

After running `setup-monitoring-cron.sh`, the following jobs are active:

```cron
# repoos-daily-health-check: Daily system health monitoring
0 0 * * * cd /path/to/summit && node scripts/repoos/daily-health-check.mjs --alert

# repoos-classification-accuracy: Weekly accuracy analysis
0 1 * * 0 cd /path/to/summit && node scripts/repoos/monitor-classification-accuracy.mjs analyze 7
```

## Reports

### Daily Health Reports

**Location:** `.repoos/reports/daily-health-<YYYY-MM-DD>.json`
**Format:**
```json
{
  "timestamp": "2026-03-08T00:00:00.000Z",
  "date": "2026-03-08",
  "systemHealth": {
    "score": 92,
    "status": "healthy",
    "factors": []
  },
  "entropy": {
    "average": 0.324,
    "velocity": {
      "current": 0.000142,
      "assessment": { "severity": "stable" }
    }
  },
  "locks": {
    "total": 3,
    "stale": 0
  },
  "issues": [],
  "recommendations": []
}
```

### Classification Accuracy Reports

**Location:** `.repoos/reports/classification-accuracy.json`
**Format:**
```json
{
  "timestamp": "2026-03-08T01:00:00.000Z",
  "totalPRs": 45,
  "accuracy": {
    "mergeSuccess": { "percentage": "87.2", "correct": 38, "total": 44 },
    "riskLevel": { "percentage": "78.5", "correct": 33, "total": 42 },
    "laneAssignment": { "percentage": "65.0", "correct": 26, "total": 40 },
    "concernClassification": { "percentage": "82.1", "correct": 32, "total": 39 }
  },
  "overallAccuracy": "78.2",
  "recommendations": [
    {
      "priority": "medium",
      "area": "lane-routing",
      "suggestion": "Lane assignment could be improved"
    }
  ]
}
```

## Alert Integration

To integrate with alerting systems, modify `daily-health-check.mjs` method `sendAlert()`:

**Slack:**
```javascript
async sendAlert(severity, healthReport, issues) {
  await fetch(SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: `RepoOS Alert [${severity}]: System Health ${healthReport.systemHealth.score}%`,
      attachments: issues.map(i => ({ text: i.message }))
    })
  });
}
```

**PagerDuty:**
```javascript
async sendAlert(severity, healthReport, issues) {
  if (severity === 'critical') {
    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token token=${PAGERDUTY_TOKEN}`
      },
      body: JSON.stringify({
        routing_key: PAGERDUTY_ROUTING_KEY,
        event_action: 'trigger',
        payload: {
          summary: `RepoOS Critical: Health ${healthReport.systemHealth.score}%`,
          severity: 'critical',
          source: 'repoos-health-check'
        }
      })
    });
  }
}
```

## Runbook

See [docs/ops/runbooks/repoos-production-monitoring.md](../../docs/ops/runbooks/repoos-production-monitoring.md) for:
- Daily health check procedures
- Weekly monitoring tasks
- Incident response playbooks
- Escalation paths
- Maintenance windows

## Dependencies

### Node.js Modules
- `fs/promises` - File system operations
- `path` - Path manipulation
- `child_process` - Git/gh CLI execution
- `util` - Promisify support
- `yaml` - Configuration parsing

### External Tools
- `gh` CLI (for PR operations, status checks)
- `git` (for repository operations)
- `jq` (for JSON processing in workflows)

### RepoOS Components
- `services/repoos/frontier-entropy.mjs`
- `services/repoos/frontier-lock.mjs`
- `services/repoos/patch-window-manager.mjs`

## Troubleshooting

### Health check fails with "Module not found"
```bash
# Ensure you're in repository root
cd /path/to/summit

# Verify services exist
ls -la services/repoos/
```

### Cron jobs not running
```bash
# Check cron service status
service cron status  # Linux
launchctl list | grep cron  # macOS

# Verify crontab entries
crontab -l | grep repoos

# Check logs for errors
tail -f logs/repoos-health.log
```

### No accuracy data
```bash
# Classification requires PR activity
# Wait 2-4 weeks for sufficient data (minimum 50 PRs)

# Check for classification files
ls -la .repoos/pr-classifications/

# Verify classification workflow runs
gh run list --workflow=pr-classification.yml
```

### Alerts not firing
```bash
# Test alert manually with threshold breach
node daily-health-check.mjs --alert

# Check alert configuration
grep -A 10 "sendAlert" scripts/repoos/daily-health-check.mjs

# Verify webhook/API credentials
echo $SLACK_WEBHOOK_URL
echo $PAGERDUTY_TOKEN
```

## Development

### Adding New Metrics

1. **Update Health Checker:**
   ```javascript
   // In daily-health-check.mjs
   const newMetric = await this.collectNewMetric();
   healthReport.newMetric = newMetric;
   ```

2. **Add Threshold:**
   ```javascript
   this.thresholds = {
     critical: { newMetric: 100 },
     warning: { newMetric: 50 }
   };
   ```

3. **Add Detection:**
   ```javascript
   detectIssues(systemHealth, ...) {
     if (newMetric > threshold) {
       issues.push({ severity: 'warning', ... });
     }
   }
   ```

4. **Update Report Schema:**
   - Add field to JSON report
   - Update documentation
   - Add to summary output

### Testing

```bash
# Run health check in dry-run mode
node daily-health-check.mjs 2>&1 | head -50

# Test accuracy analysis with minimal data
node monitor-classification-accuracy.mjs analyze 1

# Verify sovereignty check
node check-frontier-sovereignty.mjs check
```

## Support

- **Issues:** https://github.com/BrianCLong/summit/issues (label: `repoos`)
- **Runbook:** [docs/ops/runbooks/repoos-production-monitoring.md](../../docs/ops/runbooks/repoos-production-monitoring.md)
- **Slack:** #platform-team

---
**Last Updated:** 2026-03-08
**Maintained By:** Platform Team
