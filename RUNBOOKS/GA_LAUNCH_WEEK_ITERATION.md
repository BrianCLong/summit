# Summit GA Launch-Week Iteration Loop

This runbook defines the rapid feedback-to-fix cycle for the first week of GA.

## 🔄 The 4-Hour "Fast Path" Loop

In GA launch week, the goal is to resolve P0/P1 issues within a 4-hour window from detection to PR.

| Stage | Duration | Action | Responsibilty |
|-------|----------|--------|---------------|
| **Ingestion** | Continuous | Aggregate signals via `scripts/ga-feedback-aggregator.mjs`. | SRE/Ops |
| **Triage** | 15-30m | Label issues `ga-launch-blocker` and assign owner. | Release Captain |
| **Fix** | 2-3h | Minimal, targeted hotfix with regression test. | Domain Engineer |
| **Verify** | 30-45m | `scripts/validate-summit-deploy.mjs` + evidence check. | QA/Security |
| **Ship** | Immediate | Promote via RC merge queue. | Release Captain |

---

## 🚦 Issue Prioritization (GA Specific)

| Priority | Criteria | Launch Action |
|----------|----------|---------------|
| **P0 - Blocker** | Service outage, data loss, security breach. | Stop all other work; immediate fix. |
| **P1 - Critical** | Major feature broken, compliance impact. | Resolve within 4 hours. |
| **P2 - High** | Feature degraded, workaround exists. | Resolve within 24 hours (next daily release). |
| **P3 - Medium** | UX friction, documentation typos. | Batch for next minor release. |

---

## 🛠️ Hotfix Workflow (GA-Hardened)

1. **Branching**: `hotfix/ga-v4-vNNN` from `main`.
2. **Mandatory Evidence**:
   - `test:unit` pass
   - `test:integration` for fixed path
   - `scripts/validate-summit-deploy.mjs` (Dry Run)
3. **Approval**: 1 technical + 1 compliance/security review required for P0/P1.
4. **Merge**: Only via the RC Merge Queue to prevent regression.

---

## 📊 Feedback Signal Thresholds

| Signal | Threshold | Action |
|--------|-----------|--------|
| **Launch Health Score** | < 70 | Immediate P1 triage session. |
| **AI Rejection Rate** | > 10% (1h window) | Activate `hallucination-mitigation` profile. |
| **P0 Issues** | > 0 | Declare incident; notify stakeholders. |

### 🛡️ Rapid Mitigation
In case of critical regressions, use the emergency controls to apply pre-defined mitigation profiles:
```bash
node scripts/ga-emergency-controls.mjs apply [profile-name]
```
Available profiles: `hallucination-mitigation`, `load-shedding`, `safety-first`.

---

## 📞 Communication Cadence

- **War Room (Zoom/Slack)**: Active 24/7 for first 48 hours.
- **Operator Stand-up**: T+1h, T+12h, and Daily @ 09:00 UTC.
- **Executive Summary**: Sent Daily @ 18:00 UTC (Dashboard link + Fix summary).

---

*Verified for Summit GA Release 2026-03-09*
