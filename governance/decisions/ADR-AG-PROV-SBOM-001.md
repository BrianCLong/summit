---
id: ADR-AG-PROV-SBOM-001
title: PR-visible SBOM + evidence workflow for provenance staging
status: accepted
date: 2026-02-08
author: antigravity
---

## Context

Summit needs PR-visible provenance and SBOM artifacts without violating GitHub OIDC trust limits for
untrusted fork PRs. The system must remain fail-closed for missing SBOM output while keeping the
provenance status explicit when signing is intentionally constrained.

## Decision

Add a `provenance-sbom` workflow that generates SPDX SBOMs, writes deterministic evidence JSON
(badge/report/metrics/index/stamp), and posts a single PR comment when allowed. The provenance
status remains `blocked` in PR1 until trusted signing is added in PR2.

## Rationale

This enables evidence-first PR UX immediately, preserves the trust model by avoiding OIDC use in
fork PRs, and provides a deterministic artifact bundle for future badge publishing and admission
policy enforcement.

## Tradeoffs

| Dimension | Impact         | Explanation |
| --------- | -------------- | ----------- |
| Cost      | =              | Minimal CI runtime increase for SBOM generation. |
| Risk      | Low            | No privileged tokens in untrusted PRs; fail-closed SBOM gate. |
| Velocity  | +              | PR evidence surfaces without waiting on signing enablement. |

## Confidence Score: 0.63

**Basis:**

- Existing repo patterns for evidence bundles and CI gating.
- Clear separation of trusted vs. untrusted OIDC usage.

## Rollback Plan

**Trigger:** SBOM workflow instability or incorrect PR status surfacing.
**Steps:**

1. Disable `.github/workflows/provenance-sbom.yml`.
2. Revert evidence scripts and documentation updates.

## Compliance

- [x] Policy Check Passed
- [x] Evidence Generated
- [ ] Tradeoff Ledger Updated (if applicable)
