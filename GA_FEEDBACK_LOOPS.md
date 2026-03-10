# Summit GA Feedback Loops

This document provides the high-level map for GA launch-week feedback collection, triage, and rapid iteration.

## 🔗 The Feedback Ecosystem

1. **Service Signals**: Health and performance from [Post-Deploy Validation](scripts/validate-summit-deploy.mjs).
2. **User Signals**: AI insight rejections and UX feedback from [Feedback Dashboard](monitoring/dashboards/user-feedback-dashboard.json).
3. **Operational Signals**: GitHub P0/P1 issues and incident reports.

---

## 🔄 Automated Aggregation

Run the aggregator periodically to monitor launch health:
```bash
node scripts/ga-feedback-aggregator.mjs
```
**Thresholds**: A score below **70** triggers an immediate triage war-room session.

---

## ⚡ Launch-Week Iteration (The 4-Hour Loop)

We adhere to a strict 4-hour cycle for GA launch blockers:
1. **Detect**: `ga-feedback-aggregator.mjs` identifies a signal drop.
2. **Triage**: Label `ga-launch-blocker` and assign priority.
3. **Fix**: Implement minimal, high-leverage hotfix.
4. **Ship**: Deploy through the merge queue after validation.

Detailed process: [GA Launch-Week Iteration Loop](RUNBOOKS/GA_LAUNCH_WEEK_ITERATION.md)

---

## 📈 Dashboard & Reporting

- **User Feedback Dashboard**: [http://localhost:3001/d/user-feedback](http://localhost:3001/d/user-feedback)
- **Production SLO Dashboard**: [http://localhost:3001/d/production-slo](http://localhost:3001/d/production-slo)
- **Daily Executive Summary**: Automated daily at 18:00 UTC summarizing:
  - Total launch blockers resolved.
  - Sentiment trend.
  - Remaining high-risk gaps.

---

## 📞 Escalation & Support

- **Channel**: `#summit-ga-ops` (Priority Slack)
- **Incident Commander**: Release Captain (Rotated daily).
- **On-Call Matrix**: Refer to [RepoOS Operator Runbook](REPOOS_OPERATOR_RUNBOOK.md).

---

*Last Updated: 2026-03-09 for Summit GA Release*
