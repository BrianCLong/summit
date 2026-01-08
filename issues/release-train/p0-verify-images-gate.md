---
title: Add verify-images supply-chain gate to release train promotions
labels: [release-train, P0]
owner: platform-supply-chain
---

## Context

The weekly release template requires a `verify-images` gate before promotion, but there is no release-train-scoped workflow that enforces cosign verification of artifacts prior to prod rollout.

## Acceptance criteria

- Add a release-train workflow (or extend existing promotion jobs) that runs `cosign verify` against all images promoted in W51, blocking if signatures or attestations are missing.
- Surface verification results in the GitHub Actions summary and append the digest + verification log to `ops/release/release-report.md` for traceability.
- Require the gate to pass (status check) before the release-train checklist can be closed.
- Document rerun instructions and failure-handling steps in the release-train tracker.
