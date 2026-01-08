---
title: Release train 2025-W51 tracker
labels: [release-train, cadence:weekly, hygiene]
owner: release-ops
---

## Exit criteria status

- [ ] Release captain assigned and release calendar updated
- [ ] Canary plan captured on risky changes (`needs-canary-plan` label)
- [ ] Schema changes cleared migration gate (`migration-gate` label)
- [ ] PR policy gates green (Conventional Commit title + linked issue)
- [ ] CODEOWNERS approvals collected for critical paths
- [ ] Release notes drafted and promotion checklist prepared
- [ ] Rollback/SLO thresholds agreed for this train

## Reality checks (2025-W51)

- **Weekly tracker missing upstream:** The automation that opens the weekly issue has no corresponding artifact in-repo, so this tracker establishes the 2025-W51 baseline manually.
- **Promise Tracker health not recorded:** No `.promise-tracker` data or weekly health artifact exists for 2025-W51; report added under `tools/promise-tracker/reports/weekly-health-2025-w51.md` to document the gap and action items.
- **Verify-images gate not wired to the release checklist:** The weekly release template expects an image verification gate, but there is no release-train scoped workflow ensuring cosign verify before promotion.

## Owner → task → link

- Ops Captain → Assign release captain and publish calendar link → [issues/release-train/p0-release-captain-calendar.md](./p0-release-captain-calendar.md)
- Release Eng → Restore Promise Tracker weekly health run and metrics for 2025-W51 → [issues/release-train/p0-promise-tracker-health-2025-w51.md](./p0-promise-tracker-health-2025-w51.md)
- Platform Supply Chain → Add verify-images gate to release train promotions → [issues/release-train/p0-verify-images-gate.md](./p0-verify-images-gate.md)
- SRE → Document canary plan for risky changes in this train → [issues/release-train/p1-canary-plan-w51.md](./p1-canary-plan-w51.md)
- Docs/QA → Finalize release notes + evidence bundle for W51 → [issues/release-train/p1-release-notes-evidence-w51.md](./p1-release-notes-evidence-w51.md)

## Notes

- Keep this tracker updated with PR links and gate evidence as tasks close.
