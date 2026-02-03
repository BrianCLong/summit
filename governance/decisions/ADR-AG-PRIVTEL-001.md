---
id: ADR-AG-PRIVTEL-001
title: Telemetry privacy gate scaffold and deny-by-default allowlist
status: accepted
date: 2026-01-29
author: antigravity
---

## Context

Telemetry event envelopes require explicit classification to prevent silent
PII leakage and to align Summit terminology with deterministic pseudonymization
rather than anonymization.

## Decision

Introduce a deny-by-default telemetry allowlist and CI gate that verifies every
schema field is annotated and restricted PII fields cannot be emitted without
transforms. Record evidence artifacts for the scaffold.

## Rationale

This provides immediate enforcement of policy intent while keeping the surface
area limited to the event envelope until downstream field schemas are wired.

## Tradeoffs

| Dimension | Impact | Explanation                                        |
| --------- | ------ | -------------------------------------------------- |
| Cost      | =      | No new dependencies.                               |
| Risk      | Low    | Scope limited to schema validation.                |
| Velocity  | +      | Future telemetry work has clear policy guardrails. |

## Confidence Score: 0.68

**Basis:**

- Event schema exists and can be linted without runtime dependencies.
- Allowlist provides deterministic mapping of envelope fields.

## Rollback Plan

**Trigger:** telemetry privacy gate blocks an urgent release without a policy fix.
**Steps:**

1. Revert this ADR and the allowlist gate commit.
2. Restore previous CI configuration and re-run verification.

## Compliance

- [x] Policy Check Passed
- [x] Evidence Generated
- [ ] Tradeoff Ledger Updated (if applicable)
