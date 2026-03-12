# Summit GA Launch-Week Triage Policy

This policy defines the response times and prioritization rules for feedback and issues during the GA launch window.

## ⏱️ Response Time SLAs

| Priority | Detection to Triage | Detection to Fix (PR) | Target MTTR |
|----------|---------------------|-----------------------|-------------|
| **P0 - Blocker** | 15 minutes | 4 hours | < 6 hours |
| **P1 - Critical** | 30 minutes | 8 hours | < 12 hours |
| **P2 - High** | 2 hours | 24 hours | < 48 hours |

---

## 🏷️ Automated Labeling

During launch week, issues are automatically labeled by `scripts/ga-issue-prioritizer.mjs`:

- `ga:blocker`: Issues containing "outage", "blocking", "data loss", or "500 error".
- `ga:regression`: Issues containing "regression", "broken since", or "worked before".

---

## 🔄 Escalation Path

1. **Detection**: Aggregator identifies a signal drop.
2. **First Responder**: SRE On-Call labels the issue and notifies the Domain Lead.
3. **Investigation**: Domain Lead initiates the **4-Hour Loop**.
4. **Finality**: Release Captain approves the hotfix.

---
*Verified for Summit GA Release 2026-03-09*
