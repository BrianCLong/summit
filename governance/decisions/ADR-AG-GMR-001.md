---
id: ADR-AG-GMR-001
title: Add GMR guardrail metrics and gate scaffolding
status: accepted
date: 2026-02-01
author: antigravity
---

## Context

CDC→Graph pipelines require deterministic guardrails to detect silent breakages without inspecting payloads. A single ratio, GMR, provides a stable drift signal when measured per window and tenant.

## Decision

Introduce GMR guardrail scaffolding: metrics tables and views, gate query and gate runner, eval harness, and ops/security documentation.

## Rationale

The change improves GA readiness with deterministic evidence artifacts and a low-cost gate that detects ingestion and materialization drift early.

## Tradeoffs

| Dimension | Impact | Explanation                                       |
| --------- | ------ | ------------------------------------------------- |
| Cost      | =      | Aggregates only; no heavy joins or payload scans. |
| Risk      | Low    | Deterministic counters and explicit gate reasons. |
| Velocity  | -      | New gate adds a controlled preflight step.        |

## Confidence Score: 0.84

**Basis:**

- Deterministic metrics and evidence patterns align with GA guardrails.
- Low operational complexity and clear rollback path.

## Rollback Plan

**Trigger:** Sustained false-positive rate above 5% per day after baseline warmup.
**Steps:**

1. Disable gate execution in CI and preflight workflows.
2. Retain metrics collection and re-tune thresholds.

## Compliance

- [x] Policy Check Passed
- [x] Evidence Generated
- [x] Tradeoff Ledger Updated (if applicable)
