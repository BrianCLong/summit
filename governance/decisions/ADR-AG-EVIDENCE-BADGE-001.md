---
id: ADR-AG-EVIDENCE-BADGE-001
title: Evidence Badge supply-chain workflow + public payload policy
status: accepted
date: 2026-02-06
author: antigravity
---

## Context

Summit requires reviewer-visible, policy-gated evidence that SBOM attestations are signed and verified for each commit. The Evidence Badge UX must expose a deterministic, public-safe payload without leaking sensitive details.

## Decision

Implement Evidence Badge v1 with:

- Deterministic `badge.json` schema and emitter
- Supply-chain summary schema and packager
- OIDC SBOM attestation + cosign verification workflow
- Public evidence redaction policy gate
- Update-in-place PR comment with evidence badge link

## Rationale

This change provides evidence-first review UX while maintaining governance constraints (determinism, redaction policy, and attestation verification). It increases auditability without exposing private data.

## Tradeoffs

| Dimension | Impact         | Explanation |
| --------- | -------------- | ----------- |
| Cost      | +              | Additional CI steps and artifact storage |
| Risk      | Low            | Public payloads are redaction-gated |
| Velocity  | -              | Adds supply-chain checks to CI |

## Confidence Score: 0.82

**Basis:**

- Existing SBOM and cosign tooling patterns in the repo
- Deterministic payload and policy gate coverage

## Rollback Plan

**Trigger:** sustained CI failure rate >10% or redaction false positives >5%
**Steps:**

1. Disable supplychain workflow and PR comment job.
2. Revert badge schema + evidence packer commits.
3. Remove public evidence publish output from Pages.

## Compliance

- [x] Policy Check Passed
- [x] Evidence Generated
- [x] Tradeoff Ledger Updated (if applicable)
