---
title: Capture canary plan for risky changes in release train 2025-W51
labels: [release-train, P1]
owner: sre
---

## Context

Exit criteria call for a documented canary and rollback plan for risky changes. No W51-specific canary plan or rollback thresholds are documented in the tracker.

## Acceptance criteria

- Identify risky PRs/changes scheduled for W51 and label them with `needs-canary-plan`.
- Publish a W51 canary/rollback plan covering scope, blast-radius limits, metrics to watch (p95 latency, error rate), and abort thresholds.
- Link the plan from the release-train tracker and ensure on-call engineers acknowledge the steps.
- Add a short post-canary validation checklist to be executed before scaling beyond prod10.
