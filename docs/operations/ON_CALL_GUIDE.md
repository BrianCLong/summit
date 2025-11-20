# On-Call Engineer Guide

## Welcome to On-Call!

This guide provides everything you need to know about being on-call for the IntelGraph platform. Being on-call is an important responsibility that helps ensure our service meets our 99.9% uptime SLO.

## On-Call Overview

### Rotation Schedule
- **Primary On-Call**: Weekly rotation, Monday 9 AM to Monday 9 AM
- **Secondary On-Call**: Bi-weekly rotation, escalation backup
- **Schedule**: View in PagerDuty or Opsgenie

### Response Time SLAs
- **P0 (Critical)**: Acknowledge within 2 minutes, respond immediately
- **P1 (High)**: Acknowledge within 5 minutes, respond immediately
- **P2 (Medium)**: Acknowledge within 15 minutes, respond within 1 hour
- **P3 (Low)**: Next business day

### Compensation
- On-call stipend: $X per week
- Incident response: Additional compensation per incident
- Time off: Comp time for major incidents outside business hours

## Before Your Shift

### Setup Checklist (Do This Before Your First Shift)

#### 1. Install Required Tools
```bash
# Install PagerDuty mobile app
# iOS: https://apps.apple.com/app/pagerduty/id594039512
# Android: https://play.google.com/store/apps/details?id=com.pagerduty.android

# Install kubectl
brew install kubectl  # macOS
# or: https://kubernetes.io/docs/tasks/tools/

# Install AWS CLI
brew install awscli  # macOS
aws configure

# Install database clients
brew install postgresql  # psql
brew install redis  # redis-cli
# Neo4j: Install cypher-shell

# Install Helm
brew install helm

# Test VPN connection
# Follow VPN setup guide
```

#### 2. Verify Access
```bash
# Test Kubernetes access
kubectl get pods -n intelgraph

# Test database access (read-only)
psql -h postgres.intelgraph.com -U readonly -d intelgraph -c "SELECT 1;"

# Test AWS access
aws sts get-caller-identity

# Test GitHub access
git ls-remote git@github.com:intelgraph/platform.git
```

#### 3. Configure Monitoring Access
- [ ] Grafana: https://grafana.intelgraph.com (use SSO)
- [ ] DataDog: https://app.datadoghq.com (use SSO)
- [ ] PagerDuty: https://intelgraph.pagerduty.com
- [ ] Opsgenie: https://intelgraph.app.opsgenie.com
- [ ] Status Page: https://manage.statuspage.io/intelgraph

#### 4. Familiarize Yourself with Runbooks
- [Service Degradation](../runbooks/service-degradation.md)
- [Database Failure Recovery](../runbooks/database-failure-recovery.md)
- [API Rate Limit Exceeded](../runbooks/api-rate-limit-exceeded.md)
- [Security Incident Response](../runbooks/security-incident-response.md)
- [Incident Response Procedures](INCIDENT_RESPONSE.md)

#### 5. Test Alert Reception
- Send yourself a test page
- Verify phone notification works
- Verify SMS works
- Verify push notification works
- Test acknowledgment workflow

#### 6. Set Up Your Environment
```bash
# Create shortcut commands
cat >> ~/.zshrc << 'EOF'
# IntelGraph shortcuts
alias k='kubectl'
alias kp='kubectl get pods -n intelgraph'
alias kl='kubectl logs -n intelgraph'
alias grafana='open https://grafana.intelgraph.com'
alias datadog='open https://app.datadoghq.com/apm'
EOF

source ~/.zshrc
```

### Handoff Checklist (Do This Every Shift Start)

#### Pre-Shift Meeting (15 minutes before shift)
Meet with outgoing on-call engineer:

- [ ] Review any ongoing incidents
- [ ] Review recent changes/deployments
- [ ] Check open alerts and known issues
- [ ] Review any planned maintenance
- [ ] Discuss any customer escalations
- [ ] Review recent post-mortems
- [ ] Ask questions about anything unclear

#### Review Current State
```bash
# Check for active alerts
open https://grafana.intelgraph.com/alerting/list

# Check service health
curl -s https://api.intelgraph.com/health/detailed | jq

# Check recent deployments
helm history intelgraph -n intelgraph

# Check monitoring dashboards
open https://grafana.intelgraph.com/d/production-health

# Check PagerDuty for open incidents
open https://intelgraph.pagerduty.com/incidents
```

#### Document Handoff
Post in #on-call channel:
```
🔄 On-Call Handoff

Taking over from: @previous-oncall
Shift: Monday 9 AM - Monday 9 AM

Current Status:
- ✅ No active incidents
- ⚠️ Known issues: [list any]
- 📋 Upcoming: [planned maintenance, etc.]
- 📊 Recent changes: [deployments in last 24h]

Ready to respond! 📱
```

## During Your Shift

### Daily Responsibilities

#### Morning Check (9 AM)
```bash
# 1. Check overnight alerts
# Review in PagerDuty or Slack #monitoring

# 2. Check monitoring dashboards
open https://grafana.intelgraph.com/d/production-health
open https://app.datadoghq.com/apm

# 3. Review metrics
# - Error rate: Should be <1%
# - P95 latency: Should be <500ms
# - Active users: Compare to yesterday
# - Database connections: Should be <80%
# - Disk space: Should be >30%

# 4. Check for warnings
kubectl get events -n intelgraph --field-selector type=Warning

# 5. Review recent deployments
helm history intelgraph -n intelgraph | head -5
```

#### Mid-Day Check (2 PM)
```bash
# Quick health check
curl -s https://api.intelgraph.com/health/detailed | jq '.status'

# Check alert status
# Brief review of Grafana alerts page
```

#### Evening Check (6 PM)
```bash
# Review day's activity
# Check for any warnings or degradations
# Note anything to mention in tomorrow's handoff
```

### When You Get Paged

#### Step 1: Acknowledge (Within 2 minutes for P0/P1)
```bash
# Acknowledge in PagerDuty
# - Via mobile app: Tap notification → Acknowledge
# - Via web: Click "Acknowledge"
# - Via phone: Press 4

# Post in Slack #incident-response
"Acknowledged [Alert Name] - investigating"
```

#### Step 2: Assess (Within 5 minutes)
```bash
# Open monitoring dashboards
open https://grafana.intelgraph.com/d/production-health
open https://app.datadoghq.com/apm

# Check the specific alert
# What's failing? How many users affected?

# Review recent changes
git log --oneline -10
helm history intelgraph -n intelgraph
kubectl get events -n intelgraph --sort-by='.lastTimestamp'

# Classify severity
# P0: Complete outage
# P1: Major degradation (>50% users or critical feature)
# P2: Partial degradation (<50% users)
# P3: Minor issue
```

#### Step 3: Create Incident (For P0/P1)
```bash
# In Slack #incident-response
/incident create P0 "Brief description"

# This creates #incident-YYYY-MM-DD-name

# Assign roles:
# - Incident Commander: You (on-call)
# - Tech Lead: You or SME
# - Comms: Product Manager (for customer impact)
# - Scribe: Available engineer
```

#### Step 4: Follow Runbook
- Find appropriate runbook for the issue
- Follow steps systematically
- Document what you do
- Update stakeholders regularly

#### Step 5: Resolve & Document
- Verify resolution (metrics normal, alerts cleared)
- Announce resolution
- Update status page
- Document timeline for post-mortem

### Decision Making Guidelines

#### When to Escalate
- Unable to resolve within 15 min (P0) or 30 min (P1)
- Need specialized knowledge (database, networking, etc.)
- Multiple systems affected
- Data loss or security concern
- Need management decision

#### When to Rollback
✅ **Do rollback if:**
- Issue started after recent deployment
- Quick rollback path available
- Low risk of rollback
- User impact is severe

⚠️ **Don't rollback if:**
- Issue is unrelated to deployment
- Rollback would cause data loss
- Database migration can't be reversed
- Rollback path is complex/risky

#### When to Scale
✅ **Scale up if:**
- High CPU/memory usage (>80%)
- Request queue building up
- Slow response times
- Known traffic spike expected

⚠️ **Don't scale if:**
- Root cause is software bug (fix the bug)
- Database is the bottleneck (scale DB instead)
- Would exceed cost budget significantly
- Issue is connection/network-related

#### When to Restart
✅ **Restart if:**
- Memory leak suspected
- Hung processes
- Connection pool exhausted
- Config changes need to apply

⚠️ **Don't restart if:**
- Active incident with unclear cause
- Restart would lose important diagnostic state
- Database has active long-running transactions

### Communication Best Practices

#### Internal Updates (Slack)
```
📊 UPDATE: <Incident Name> [HH:MM]

Status: <Investigating/Identified/Fixing/Monitoring/Resolved>
Impact: <brief description>
Actions: <what we're doing>
ETA: <if known>
Next update: <timestamp>
```

#### Status Page Updates
- P0/P1: Update immediately
- Use customer-friendly language
- Focus on impact, not technical details
- Provide ETAs only when confident
- Update as status changes

#### Customer Communication
- Let Communications Lead handle
- Provide technical summary
- Focus on customer impact
- Be honest about timelines

### Handling Multiple Alerts

#### Priority Order
1. **P0**: Drop everything, focus here
2. **P1**: Handle after P0 resolved or delegate
3. **P2**: Delegate to other engineers
4. **P3**: Create ticket, handle during business hours

#### Getting Help
```
# In #incident-response channel
"Need help with [brief description]. Looking for:
- Database expert for connection pool issue
- Someone to investigate slow Neo4j queries
- Frontend engineer to check client-side errors"
```

### Common Issues and Quick Fixes

#### High Error Rate
```bash
# Check recent deployments
helm history intelgraph -n intelgraph

# View errors
kubectl logs -l app=intelgraph-api -n intelgraph --tail=100 | grep ERROR

# Quick rollback if needed
helm rollback intelgraph -n intelgraph
```

#### Slow Response Times
```bash
# Check database
psql -h postgres -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query
  FROM pg_stat_activity
  WHERE state = 'active' AND now() - query_start > interval '5 seconds';
"

# Check Redis
redis-cli --latency-history

# Scale if needed
kubectl scale deployment intelgraph-api -n intelgraph --replicas=10
```

#### Database Connections Exhausted
```bash
# Kill idle connections
psql -h postgres -d intelgraph -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle' AND state_change < NOW() - INTERVAL '10 minutes';
"

# Restart API pods to clear connection leaks
kubectl rollout restart deployment intelgraph-api -n intelgraph
```

#### Disk Space Critical
```bash
# Check disk usage
kubectl exec -it statefulset/postgres-0 -n intelgraph -- df -h

# Clean up old logs
kubectl exec -it statefulset/postgres-0 -n intelgraph -- \
  find /var/log -name "*.log" -mtime +7 -delete

# Clean up old backups
kubectl exec -it statefulset/postgres-0 -n intelgraph -- \
  find /backups -name "*.dump" -mtime +30 -delete
```

## After Your Shift

### Handoff Checklist

#### Prepare Handoff Summary
```
# Document in #on-call channel

🔄 On-Call Handoff Summary
Week: [dates]
Outgoing: @your-name
Incoming: @next-oncall

📊 Shift Summary:
- Incidents: [count] ([list P0/P1 incidents])
- Alerts: [count total alerts]
- Actions taken: [major changes/fixes]

⚠️ Current Status:
- Active incidents: [list any ongoing]
- Known issues: [list any]
- Recent changes: [deployments]
- Watch items: [anything to monitor]

📋 Upcoming:
- Planned maintenance: [list any]
- Expected changes: [deployments, etc.]

📚 Notes:
- [Any important context for next on-call]

Passing on-call to @next-oncall 🎯
```

#### Handoff Meeting (15 minutes)
- Walk through shift summary
- Explain any ongoing issues
- Answer questions
- Provide context on recent incidents
- Share lessons learned

#### Update Documentation
- [ ] Update runbooks if you found gaps
- [ ] File tickets for improvements
- [ ] Document any workarounds discovered
- [ ] Share learnings in #engineering

### Post-Incident Actions
- [ ] Schedule post-mortem (within 24-48h)
- [ ] Document timeline
- [ ] Create follow-up tickets
- [ ] Update runbooks
- [ ] Share learnings with team

## Tips for Success

### Stay Prepared
- Keep laptop charged and nearby
- Have stable internet connection
- Test VPN connection before traveling
- Keep phone volume up at night
- Have backup communication method

### Stay Calm
- Deep breath - you've got this!
- Use runbooks - don't improvise
- Ask for help when needed
- It's okay to escalate
- Focus on impact mitigation first

### Stay Informed
- Read incident post-mortems
- Review updated runbooks
- Understand recent architecture changes
- Know which services are critical
- Understand customer use cases

### Stay Healthy
- Get enough sleep
- Take breaks during quiet periods
- Hand off gracefully if sick
- Don't neglect regular work completely
- Ask for help if overwhelmed

## Resources

### Essential Links
- **Monitoring**: https://grafana.intelgraph.com
- **APM**: https://app.datadoghq.com/apm
- **PagerDuty**: https://intelgraph.pagerduty.com
- **Status Page**: https://status.intelgraph.com
- **Runbooks**: `/docs/runbooks/`
- **Incident Response**: `INCIDENT_RESPONSE.md`

### Key Commands
```bash
# Health check
curl https://api.intelgraph.com/health/detailed | jq

# View logs
kubectl logs -l app=intelgraph-api -n intelgraph --tail=100

# Check pods
kubectl get pods -n intelgraph

# Rollback
helm rollback intelgraph -n intelgraph

# Scale
kubectl scale deployment intelgraph-api -n intelgraph --replicas=10

# Restart
kubectl rollout restart deployment intelgraph-api -n intelgraph

# Database check
psql -h postgres -d intelgraph -c "SELECT 1;"
```

### Support Contacts
- **Primary On-Call**: Check PagerDuty
- **Secondary On-Call**: Check PagerDuty
- **Engineering Manager**: [contact]
- **VP Engineering**: [contact]
- **24/7 Eng Slack**: #incident-response

### Common Mistakes to Avoid
- ❌ Not acknowledging alerts quickly
- ❌ Making changes without documenting
- ❌ Skipping the runbook
- ❌ Not asking for help when stuck
- ❌ Forgetting to update status page
- ❌ Not creating incident channel for P0/P1
- ❌ Making multiple changes at once
- ❌ Not verifying resolution before closing

### Remember
- **You're not alone**: Team is here to help
- **Use runbooks**: They're there for a reason
- **Ask questions**: Better to ask than guess
- **Document everything**: Future you will thank you
- **Stay calm**: Panic doesn't help
- **Learn**: Every incident is a learning opportunity

---

**Questions?** Ask in #on-call or #incident-response channels.

**Feedback?** Help improve this guide - submit PRs or suggestions!

**Thank you for being on-call!** Your dedication keeps IntelGraph running 24/7. 🚀
