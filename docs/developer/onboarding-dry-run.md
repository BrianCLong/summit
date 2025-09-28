# Onboarding Dry Run & Timer Metrics

**Date:** 2025-03-11  
**Facilitator:** Developer Productivity Guild  
**Participant:** New hire (alias "Skywalker")

| Stage                          | Start | End   | Duration | Notes                                                           |
| ------------------------------ | ----- | ----- | -------- | --------------------------------------------------------------- |
| Clone repository & trust hooks | 09:00 | 09:12 | 12m      | Ran `direnv allow`, verified `.lefthook-signature` matches.     |
| `make dev` bootstrap           | 09:12 | 09:38 | 26m      | Dependencies installed, compose stood up with hot reload.       |
| Smoke suite run (`make smoke`) | 09:38 | 09:39 | 1m       | All 8 checks green (UI, API, worker, OPA, OTEL, Jaeger, mocks). |
| First PR authored              | 09:39 | 12:30 | 2h51m    | Included docs update + lint fix, CI green.                      |

**Time-to-first-commit:** 3h 30m (within <4h SLO).  
**Smoke flake rate:** 0/5 retries (0%).

### Evidence Attachments

- Parity check output (`node scripts/devkit/check-parity.js`) archived in `/reports/devkit-parity-20250311.log`.
- Grafana dashboard screenshot (local dev kit observability tile) – attach to weekly status doc.
- Pre-push hook signature hash: `$(cat .lefthook-signature | cut -d' ' -f1)`.

### Follow-ups

- Schedule nightly `scripts/devkit/nightly-parity-check.sh` in CI to guard against compose drift.
- Track onboarding timer metrics in the Product Ops dashboard (SLO alert at 3.5h).
- Collect feedback on mock service coverage for additional scenarios.
