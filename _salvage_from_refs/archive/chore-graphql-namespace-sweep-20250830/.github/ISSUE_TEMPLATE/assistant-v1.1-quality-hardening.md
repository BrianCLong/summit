---
name: Assistant v1.1 — Quality Hardening
about: Track mutation testing, k6 perf budgets, and flaky test scrub
title: "Assistant v1.1: Quality Hardening"
labels: ["release: v1.1", "theme: quality", "area: ci", "area: testing"]
milestone: "Assistant v1.1"
---

## Scope
- Mutation testing (Stryker) on transports, ABAC, coalescer; k6 perf profiles; flaky test scrub.

## Checklist
- [ ] Stryker config + target suites (transports/ABAC/coalescer)
- [ ] Survivors triage + test improvements
- [ ] k6 perf harness for transports (backoff/retries)
- [ ] Perf budgets enforced in CI; dashboards wired
- [ ] Flaky test scrub (real timers, async utilities)
- [ ] Docs: quality/readme + troubleshooting

## Acceptance
- [ ] Mutation score ≥ 70% (targets); k6 within budgets; no new flakies

