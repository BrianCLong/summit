# Month-1 Operating Cadence

This document defines the operating rhythm for the first month of steady-state operations (Post-GA). The goal is to establish a habit of **weekly verification** without introducing heavy bureaucratic process.

## Weekly Rhythm

| Day | Event | Owner | Input | Output |
| :--- | :--- | :--- | :--- | :--- |
| **Mon 09:00 UTC** | Evidence Collection | Ops Lead | `WEEKLY_EVIDENCE_RUNBOOK.md` | `ops-evidence_*.tar.gz`, Updated `EVIDENCE_INDEX.json` |
| **Mon 10:00 UTC** | Trust Metric Snapshot | Jules (Auto) | `scripts/ops/generate-trust-snapshot.sh` | `trust-snapshot-YYYY-WW.json` |
| **Tue 14:00 UTC** | Triage & Review | Eng Lead | Metric Snapshot, Sentry, GitHub Issues | Updated `WEEKLY_TRUST_REPORT.md` |
| **Fri 12:00 UTC** | Governance Check | Security Lead | `scripts/check-governance.cjs` | Pass/Fail in CI |

## Roles & Responsibilities

*   **Ops Lead**: Responsible for the "Monday Morning" evidence train. Ensures artifacts are generated and indexed.
*   **Eng Lead**: Reviews the metrics. Decides if we are "Green" (Shipping) or "Red" (Stopping).
*   **Security Lead**: Owns the governance scripts and `AGENTS.md` integrity.

## Stop Conditions (Escalation Triggers)

The weekly cadence escalates to **Daily Standup** mode if any of the following occur:

1.  **Trust Metrics Red**: Any P0 metric (Security or Data Loss risk) fails.
2.  **Evidence Gap**: Missing evidence for > 1 week.
3.  **CI Collapse**: `main` branch broken for > 24 hours.

## Transition to Month-2

Transition: Review cadence at end of Month-1. Success criteria for bi-weekly move: metrics stable > 3 weeks.
