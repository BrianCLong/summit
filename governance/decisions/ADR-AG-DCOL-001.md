---
id: ADR-AG-DCOL-001
title: Data Collection Resilience Policy Pack and Metrics Gate
status: accepted
date: 2026-02-24
author: antigravity
---

## Context

Collection pipelines face concurrent risk from API contract breakage, archive access restrictions, and escalating scrape-policy/legal pressure. Existing governance controls lacked a unified stop-the-line policy set and deterministic KPI views for these failure classes.

## Decision

Introduce a data-collection resilience bundle that includes:

1. OPA policy rules for deprecated endpoint denial, crawl legal/robots gating, evidence field minima, and provider concentration warnings.
2. Antigravity runtime policy for deny/alert decisions aligned to threshold config.
3. SQL facts/views for API drift, archive completeness, policy-blocked crawls, and contested-provider share.
4. A governed runbook with trigger thresholds, mitigation flow, rollback gates, and evidence requirements.

## Rationale

The selected approach creates one enforceable policy path and one deterministic measurement path for the same risk surface. This minimizes ambiguity during incidents and gives release gates explicit metrics for decision-making.

## Tradeoffs

| Dimension | Impact | Explanation |
| --------- | ------ | ----------- |
| Cost | + | Additional storage and dashboard compute for new facts/views. |
| Risk | Low | Explicit deny rules reduce legal and contract drift exposure. |
| Velocity | - | New policy gates can block non-compliant jobs until exceptions are approved. |

## Confidence Score: 0.89

**Basis:**

- Rules target known break modes and require minimal interpretation.
- Artifacts align with existing governance and metrics conventions.

## Rollback Plan

**Trigger:** False-positive block rate exceeds 5% for 24h, or ingestion latency rises above agreed SLO due to new gates.
**Steps:**

1. Disable `collection_resilience` policy package in policy evaluation path.
2. Revert SQL view usage in dashboards to previous metrics set.
3. Retain event logging and runbook evidence for postmortem tuning.

## Compliance

- [x] Policy Check Passed
- [x] Evidence Generated
- [x] Tradeoff Ledger Updated (if applicable)
