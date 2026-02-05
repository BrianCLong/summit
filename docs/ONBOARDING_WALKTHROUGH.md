# Onboarding Walkthrough (Recording + Script)

**Recording:** https://storage.summit.internal/onboarding-walkthrough.mp4  
**Length:** 12 minutes. Captures the first-time setup, golden-path smoke, and AI/Kafka profile enablement.

## Agenda
1. Environment validation (`./scripts/validate-env.sh`) and port checks
2. `npm run quickstart -- --ai --kafka` with live narration of what each phase does
3. Smoke test + health probes (`make smoke`, `curl :4000/health/detailed`)
4. UI tour of the seeded **Quickstart Investigation** and Copilot goal run
5. Closing checklist: branch naming, PR labels, and CI gates to watch

## Key Links
- Day-one guide: [docs/ONBOARDING.md](./ONBOARDING.md)
- CI golden-path reference: [RUNBOOKS/CI.md](runbooks/CI.md)
- Troubleshooting tree: [RUNBOOK.md](../RUNBOOK.md#troubleshooting)

## How to Update the Recording
- Record new walkthroughs after major releases (v2.0.0, MVP-3, GA).
- Upload to the internal storage bucket under `onboarding-walkthrough.mp4` and refresh the link above.
- Summarize changes in this file (agenda and expected duration) so new hires know what to expect.
