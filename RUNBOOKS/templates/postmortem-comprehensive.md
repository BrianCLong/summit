# Incident Postmortem Template

**Use this template for all SEV1 and SEV2 incidents. Publish within 72 hours of resolution.**

---

## Incident Summary

**Incident ID**: INC-YYYYMMDD-###
**Incident Title**: [Brief descriptive title]
**Severity**: [SEV1 / SEV2]
**Date**: YYYY-MM-DD
**Author(s)**: @username, @username
**Reviewers**: @username (IC), @username (SRE Lead), @username (Eng Manager)
**Status**: [Draft / Under Review / Published]

---

## Executive Summary

_Write this last. 2-3 paragraphs for leadership summarizing what happened, impact, root cause, and key action items._

**What Happened**:
[1-2 sentences: what broke and when]

**Impact**:
- Duration: X hours Y minutes
- Users affected: [Number or percentage]
- Revenue impact: $[amount] (estimated)
- SLO violation: [Yes/No, % of error budget consumed]

**Root Cause**:
[1-2 sentences: what caused it]

**Resolution**:
[1-2 sentences: how it was fixed]

**Key Lessons**:
1. [Most important lesson]
2. [Second most important lesson]
3. [Third most important lesson]

---

## Impact Assessment

### Quantitative Impact

| Metric | Before Incident | During Incident | After Resolution |
|--------|----------------|-----------------|------------------|
| Request Rate | ___ req/s | ___ req/s | ___ req/s |
| Latency (p95) | ___ ms | ___ ms | ___ ms |
| Error Rate | __% | __% | __% |
| Availability | 99.__% | 9_.__ % | 99.__% |

**Time to Detect (TTD)**: [X minutes from first failure to alert]
**Time to Recover (TTR)**: [Y minutes from alert to resolution]
**Total Downtime**: [Z minutes of complete unavailability]

### User Impact

**Users Affected**: [Total number or percentage]
- **Complete outage**: [Number] users
- **Degraded experience**: [Number] users
- **No impact**: [Number] users

**Features Affected**:
- [ ] Investigation creation
- [ ] Entity management
- [ ] Relationship graph
- [ ] Copilot queries
- [ ] Search
- [ ] Authentication
- [ ] Other: __________

**Customer Reports**:
- Support tickets: [Number]
- In-app feedback: [Number]
- Social media mentions: [Number]

### Business Impact

**Revenue Impact**:
- Direct revenue loss: $[amount]
- Estimated opportunity cost: $[amount]
- Total estimated impact: $[amount]

**Contractual/SLA Impact**:
- SLA violations: [Number of customers]
- Credits due: $[amount]
- SLO error budget consumed: [__%]

**Reputation Impact**:
- Press coverage: [Yes/No]
- Social media sentiment: [Positive/Negative/Neutral]
- NPS impact: [Change in score, if measurable]

---

## Timeline

_All times in UTC. Focus on what happened, not who did it (blameless)._

### Detection Phase

| Time | Event | Evidence |
|------|-------|----------|
| HH:MM | First user affected | [Log/metric showing first failure] |
| HH:MM | Alert fired | [Alert name and condition] |
| HH:MM | On-call acknowledged | PagerDuty notification |
| HH:MM | Incident declared | Slack #incident-channel |

**Time to Detect (TTD)**: [X minutes]

### Investigation Phase

| Time | Event | Evidence |
|------|-------|----------|
| HH:MM | Investigation started | Logs reviewed, metrics checked |
| HH:MM | Hypothesis 1 | [What we thought was wrong] |
| HH:MM | Hypothesis 1 ruled out | [Why it wasn't that] |
| HH:MM | Hypothesis 2 | [Second theory] |
| HH:MM | Root cause identified | [What actually broke] |

**Time to Understand (TTU)**: [Y minutes]

### Mitigation Phase

| Time | Event | Evidence |
|------|-------|----------|
| HH:MM | Mitigation started | [Command/action taken] |
| HH:MM | Partial restoration | [Metric showing improvement] |
| HH:MM | Full restoration | [Metrics back to normal] |
| HH:MM | Monitoring period begins | [Declared stable] |
| HH:MM | Incident resolved | [Final verification complete] |

**Time to Mitigate (TTM)**: [Z minutes]
**Time to Recover (TTR)**: [Total minutes from alert to resolution]

---

## Root Cause Analysis

### The Five Whys

1. **Why did the incident occur?**
   - [Answer 1]

2. **Why did [Answer 1] happen?**
   - [Answer 2]

3. **Why did [Answer 2] happen?**
   - [Answer 3]

4. **Why did [Answer 3] happen?**
   - [Answer 4]

5. **Why did [Answer 4] happen?**
   - [Root cause]

### Technical Root Cause

**Primary Cause**:
[Detailed technical explanation of what broke]

**Contributing Factors**:
1. [Factor 1 that made it worse or more likely]
2. [Factor 2]
3. [Factor 3]

**Trigger Event**:
[What specific event triggered the failure?]

### Why It Wasn't Caught Earlier

**Testing Gaps**:
- [What tests were missing?]
- [Why didn't CI/CD catch it?]

**Monitoring Gaps**:
- [What metrics/alerts were missing?]
- [Why didn't we detect it sooner?]

**Process Gaps**:
- [What process could have prevented this?]
- [What review was skipped?]

---

## Resolution

### What Worked

**Mitigation Actions** (in order):
1. [Action 1 with timestamp and outcome]
2. [Action 2 with timestamp and outcome]
3. [Action 3 with timestamp and outcome]

**Why It Worked**:
[Explanation of why these actions resolved the issue]

**Verification**:
- [How we verified service was restored]
- [What metrics we checked]
- [What tests we ran]

### What Didn't Work

**Failed Attempts**:
1. [Action that didn't help and why]
2. [Another failed attempt]

**Lessons from Failures**:
[What we learned from these failed attempts]

---

## What Went Well

_Blameless: focus on processes and systems, not individuals_

1. **Detection**: [How quickly we detected it, what worked]
2. **Response**: [How the team responded, communication, coordination]
3. **Tools**: [What tools/runbooks/automation helped]
4. **Communication**: [How we kept stakeholders informed]
5. **Collaboration**: [How teams worked together]

---

## What Went Poorly

_Opportunities for improvement_

1. **Gaps in Detection**: [What we missed, why TTD was high]
2. **Gaps in Response**: [What slowed us down]
3. **Gaps in Tools/Automation**: [What manual steps were required]
4. **Gaps in Communication**: [Where communication broke down]
5. **Gaps in Documentation**: [What runbooks/docs were missing/outdated]

---

## Action Items

### Immediate (Complete within 24 hours)

| Action | Owner | Deadline | Tracking Issue |
|--------|-------|----------|----------------|
| [Action 1] | @owner | YYYY-MM-DD | [JIRA-###] |
| [Action 2] | @owner | YYYY-MM-DD | [JIRA-###] |
| [Action 3] | @owner | YYYY-MM-DD | [JIRA-###] |

### Short-term (Complete within 1 week)

| Action | Owner | Deadline | Tracking Issue |
|--------|-------|----------|----------------|
| [Action 4] | @owner | YYYY-MM-DD | [JIRA-###] |
| [Action 5] | @owner | YYYY-MM-DD | [JIRA-###] |
| [Action 6] | @owner | YYYY-MM-DD | [JIRA-###] |

### Long-term (Complete within 1 month)

| Action | Owner | Deadline | Tracking Issue |
|--------|-------|----------|----------------|
| [Action 7] | @owner | YYYY-MM-DD | [JIRA-###] |
| [Action 8] | @owner | YYYY-MM-DD | [JIRA-###] |
| [Action 9] | @owner | YYYY-MM-DD | [JIRA-###] |

**Action Item Categories**:
- 🔍 Monitoring/Alerting improvements
- 🧪 Testing improvements
- 📚 Documentation/Runbook updates
- 🤖 Automation opportunities
- 🏗️ Architecture/Design changes
- 📋 Process improvements

---

## Lessons Learned

### Technical Lessons

1. **[Lesson 1]**: [Detailed explanation]
   - **Why it matters**: [Impact]
   - **What we'll do differently**: [Action]

2. **[Lesson 2]**: [Detailed explanation]
   - **Why it matters**: [Impact]
   - **What we'll do differently**: [Action]

3. **[Lesson 3]**: [Detailed explanation]
   - **Why it matters**: [Impact]
   - **What we'll do differently**: [Action]

### Process Lessons

1. **[Lesson 1]**: [What we learned about our processes]
2. **[Lesson 2]**: [Another process insight]

### Organizational Lessons

1. **[Lesson 1]**: [What we learned about communication, coordination, etc.]
2. **[Lesson 2]**: [Another organizational insight]

---

## Supporting Information

### Related Incidents

- **Similar incident**: [INC-YYYYMMDD-###] - [Brief description]
- **Related incident**: [INC-YYYYMMDD-###] - [Brief description]

**Pattern Analysis**:
[Is this part of a recurring pattern? What's the trend?]

### Reference Materials

- **Incident ticket**: [Link]
- **Slack channel**: #incident-YYYYMMDD-brief
- **Grafana dashboard**: [Link to dashboard showing incident]
- **Jaeger traces**: [Links to relevant traces]
- **Logs**: [Links to log queries]
- **Code changes**: [Git commit/PR that caused or fixed the issue]
- **Runbook used**: [Link to runbook]

### Metrics & Graphs

**Attach screenshots or links to**:
- Latency graph showing spike and recovery
- Error rate graph
- Traffic/request rate
- Resource utilization (CPU, memory)
- Database performance metrics

---

## Preventive Measures

### Architecture Changes

[What architectural changes would prevent this?]

**Example**:
- Add circuit breakers to prevent cascading failures
- Implement read replicas to distribute load
- Add caching layer to reduce database pressure

### Code Changes

[What code changes would prevent this?]

**Example**:
- Add input validation for user data
- Implement retry logic with exponential backoff
- Add graceful degradation for non-critical features

### Operational Changes

[What operational changes would prevent this?]

**Example**:
- Require load testing before production deploys
- Add pre-deployment smoke tests
- Implement canary deployments with automatic rollback

### Monitoring Changes

[What monitoring would detect this sooner?]

**Example**:
- Add alert for [specific metric]
- Create synthetic monitor for golden path
- Implement SLO-based alerting with error budgets

---

## Appendices

### Appendix A: Detailed Logs

```
[Relevant log excerpts showing the failure]
```

### Appendix B: Configuration Changes

```diff
[Diff of configuration changes if relevant]
```

### Appendix C: Metrics Queries

```promql
# Query 1: Error rate during incident
(sum(rate(graphql_requests_total{status="error"}[5m])) / sum(rate(graphql_requests_total[5m]))) * 100

# Query 2: Latency spike
histogram_quantile(0.95, sum(rate(graphql_query_duration_ms_bucket[5m])) by (le))
```

### Appendix D: Customer Communication

[Copies of status page updates, customer emails sent]

---

## Sign-off

**Postmortem Author(s)**: @username, @username
**Incident Commander**: @username (approved on YYYY-MM-DD)
**Technical Reviewer**: @username (approved on YYYY-MM-DD)
**SRE Lead**: @username (approved on YYYY-MM-DD)
**Engineering Manager**: @username (approved on YYYY-MM-DD)

**Status**: [Draft → Under Review → Published]
**Published Date**: YYYY-MM-DD
**Location**: [Link to where this is stored]

---

**Last Updated**: YYYY-MM-DD by @username

---

## Follow-up

**6-week review**: [Date]
- Verify all action items completed
- Assess effectiveness of preventive measures
- Update incident response procedures if needed
