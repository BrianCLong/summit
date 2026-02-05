---
id: ADR-AG-FSRESEARCHER-001
title: FS-Researcher MWS Workspace + KB-Only Reporting
author: codex
status: accepted
date: 2026-02-09
---

## Context

Need a deterministic, file-system based research workflow with citations, security gates, and evidence
artifacts to align with Summit governance and evaluation requirements.

## Decision

Add an FS-Researcher MWS module that builds a workspace, archives sources, generates a KB with
Evidence IDs, and produces a KB-only report with deterministic artifacts and validation gates.

## Rationale

This aligns with governance mandates for evidence-first outputs, deterministic artifacts, and
prompt-injection/PII safeguards while keeping feature flags default OFF.

## Tradeoffs

| Dimension | Impact | Explanation |
| --- | --- | --- |
| Cost | = | Offline fixtures only; no runtime browsing. |
| Risk | Low | Feature-flagged and validated with deterministic tests. |
| Velocity | + | Provides reusable pipeline scaffolding for later expansion. |

## Confidence Score: 0.72

**Basis:**

- Scoped to new module with explicit gates and tests.
- Deterministic artifacts with validator coverage.

## Rollback Plan

**Trigger:** Validation errors or security gate regressions detected in CI.
**Steps:**

1. Disable `FS_RESEARCHER_ENABLED` flag and remove CLI entry.
2. Revert module and docs, remove artifacts/tests.

## Compliance

- [x] Policy Check Passed
- [x] Evidence Generated
- [ ] Tradeoff Ledger Updated (if applicable)
