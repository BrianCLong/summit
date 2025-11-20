---
id: [unique-id]
title: "Runbook: [Scenario Name]"
sidebar_label: [Short Label]
description: [One-sentence description of the operational scenario]
tags: [runbook, operations, tag3]
---

# Runbook: [Scenario Name]

> **Purpose**: [Single sentence describing what operational scenario this runbook addresses]
>
> **Owner**: [Team/Individual] | **Last Reviewed**: YYYY-MM-DD

## Quick Reference

| Attribute | Value |
|-----------|-------|
| **Severity** | [Critical/High/Medium/Low] |
| **Response Time** | [SLA target] |
| **On-Call Contact** | [Contact method] |
| **Escalation Path** | [Team/Person → Team/Person] |
| **Related Runbooks** | [Link to related runbooks] |

## When to Use This Runbook

This runbook applies when:
- [ ] Condition 1 is observed
- [ ] Condition 2 is triggered
- [ ] Alert [X] fires

**Not applicable for**: Scenarios this runbook doesn't cover

## Symptoms

Users or monitoring may report:

- 🔴 **Critical Symptom**: Description
  - Where it appears
  - Example error message/metric

- 🟡 **Warning Sign**: Description
  - Where it appears
  - Example error message/metric

## Pre-Flight Checklist

Before taking action, verify:

- [ ] You have [required access/permissions]
- [ ] You've notified [stakeholders]
- [ ] You've checked [monitoring dashboard]
- [ ] You've verified [current status]

## Diagnosis

### Step 1: Initial Assessment

Check these indicators first:

```bash
# Check system status
command to check status
```

**Interpretation**:
- If X, then problem is [diagnosis]
- If Y, then problem is [diagnosis]
- If Z, then escalate to [team]

### Step 2: Detailed Investigation

```bash
# Gather detailed logs
command to get logs
```

Look for:
- Pattern 1: Indicates [issue]
- Pattern 2: Indicates [issue]

### Step 3: Root Cause Identification

Common root causes:

| Cause | Indicators | Verification |
|-------|-----------|--------------|
| Cause 1 | What to look for | How to confirm |
| Cause 2 | What to look for | How to confirm |

## Resolution

### Solution 1: [Primary Resolution]

**Applies when**: Condition description

**Risk Level**: [Low/Medium/High]

**Estimated Time**: X minutes

**Steps**:

1. **Action 1**
   ```bash
   command with explanation
   ```
   Expected outcome: ...

2. **Action 2**
   ```bash
   command with explanation
   ```
   Expected outcome: ...

3. **Verification**
   ```bash
   verification command
   ```
   ✅ Success: Expected result
   ❌ Failure: Go to [Solution 2](#solution-2)

### Solution 2: [Alternative Resolution]

**Applies when**: Condition description or Solution 1 fails

**Risk Level**: [Low/Medium/High]

**Steps**:

1. ...

### Solution 3: [Last Resort]

**⚠️ Warning**: This solution has [consequences/risks]

**Requires approval from**: [Role/Team]

**Steps**:

1. ...

## Rollback Procedure

If resolution causes issues:

```bash
# Rollback commands
step 1
step 2
step 3
```

## Post-Resolution Verification

After implementing the solution:

- [ ] Verify [metric/service] has recovered
- [ ] Check [dependent services] are functioning
- [ ] Monitor [dashboard] for X minutes
- [ ] Confirm no [side effects]

### Health Check Commands

```bash
# System health verification
health-check-command
```

Expected healthy output:
```
✓ Service A: Running
✓ Service B: Running
✓ All checks passed
```

## Communication

### Initial Incident Report

**Template**:
```
Subject: [SEV-X] [Brief Description]

Status: Investigating
Impact: [Affected services/users]
Started: [Timestamp]
ETA: [Expected resolution time]
Updates: [Where to find updates]
```

### Resolution Update

**Template**:
```
Subject: [RESOLVED] [Brief Description]

Status: Resolved
Root Cause: [Summary]
Resolution: [What was done]
Resolved: [Timestamp]
Post-Incident Review: [Link/Date]
```

## Prevention

To prevent future occurrences:

### Immediate Actions
- [ ] Action 1
- [ ] Action 2

### Long-term Improvements
- [ ] Improvement 1 (JIRA-XXX)
- [ ] Improvement 2 (JIRA-XXX)

### Monitoring Enhancements
- [ ] Add alert for [condition]
- [ ] Create dashboard for [metrics]

## Escalation Criteria

Escalate to [next level] if:
- Resolution time exceeds [X] minutes
- [Metric] does not recover
- Multiple systems affected
- [Critical business impact]

### Escalation Contacts

1. **Primary**: [Name/Role] - [Contact method]
2. **Secondary**: [Name/Role] - [Contact method]
3. **Management**: [Name/Role] - [Contact method]

## Related Documentation

- [Architecture Diagram](./link)
- [Service Documentation](./link)
- [Monitoring Dashboard](https://dashboard.link)
- [Related Runbook: [X]](./link)

## Appendix

### Useful Commands Reference

```bash
# Command category 1
command1
command2

# Command category 2
command3
command4
```

### Logs Locations

- **Application Logs**: `/path/to/logs`
- **System Logs**: `/path/to/system/logs`
- **Database Logs**: `/path/to/db/logs`

### Configuration Files

- **Main Config**: `/path/to/config`
- **Environment**: `/path/to/env`

---

## Runbook Maintenance

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | [Name] | Initial version |

**Next Review Date**: YYYY-MM-DD

**Feedback**: Report issues or improvements to [team/channel]
