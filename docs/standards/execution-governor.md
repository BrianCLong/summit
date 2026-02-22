# Execution Governor Standards

## Overview

This document defines the **Execution Governor**, a repo-enforced set of controls designed to prevent critical failure modes:
1.  **Overbuilding** (shipping 7 products at once).
2.  **No-revenue loops** (endless demos, no pilots).
3.  **Unbounded tech debt** (rewrites before revenue).
4.  **Compliance surprise** (last-minute blockers).

## Core Policies

### 1. Single Product Mode
*   **Policy**: Only one product is active at a time for engineering buildout.
*   **Enforcement**: CI fails if PRs touch files outside the active product's allowed paths.
*   **Override**: Requires an `.exec-override` file with a valid reason and expiry date.
*   **Current Active Product**: `FactFlow` (Weeks 1-4).
*   **Frozen**: `FactGov`, `FactLaw`, `FactMarkets`, `FactAPI`, `FactCert`, `FactDatasets`.

### 2. Forcing Function Calendar
| Week | Milestone | Target |
| :--- | :--- | :--- |
| Week 1 | Infrastructure | Single Product Mode active, Governor live. |
| Week 2 | Sales | 2 LOIs Signed. |
| Week 3 | Revenue | First $1,500 collected. |
| Week 4 | Product | MVP shipped to first pilot customer. |
| Week 8 | Pivot/Kill | 5 Paying Customers or Pivot. |

### 3. Kill-Switch Decision Tree
*   **Month 1**: < 2 LOIs -> **Yellow Flag** (Crisis Mode).
*   **Month 3**: < $5k MRR -> **Red Flag** (Pivot required).
*   **Month 6**: < $20k MRR -> **Kill** product line.
*   **Month 9**: < $50k MRR -> **Kill** business unit.
*   **Month 12**: < $83k MRR ($1M ARR run rate) -> **Shutdown**.

### 4. Delegation Tripwires
*   **Hiring**: If > 50% of time on coding after Month 3, hire first engineer.
*   **Sales**: If < 5 meetings/week, hire contractor SDR.

## Minimal Winning Slice (MWS)

**Definition**: Ship a **repo-enforced execution governor** that forces **Single Product Mode**, produces a **weekly scorecard**, and triggers **kill-switch checkpoints**—so the company can’t drift into the 5 failure modes without alarms.

### Acceptance Tests
1.  A config file selects the active product: `FACT_ACTIVE_PRODUCT=factflow|factgov`.
2.  CI (or a local `make check`) fails if a PR changes code under non-active product directories (unless an override label/file exists).
3.  A script generates deterministic `artifacts/execution/scorecard.json` from repo + a stub input file (no timestamps).
4.  A kill-switch script evaluates thresholds and emits `artifacts/execution/checkpoint.json` deterministically.
5.  PR template exists and is referenced by docs; review checklist includes “scope guardrail” and “customer impact.”

### Artifacts
*   `artifacts/execution/scorecard.json`
*   `artifacts/execution/checkpoint.json`
*   `scripts/monitoring/execution-governor-drift.report.json`

## Interop & Standards

*   **Imports**: Git metadata, local JSON/CSV for sales/hiring data.
*   **Exports**: Deterministic scorecards and checkpoint reports.
*   **Non-goals**: No direct CRM integration (Week 1). No real billing integration (Week 1).

## Threat-Informed Requirements

| Abuse / failure | Mitigation | Gate | Test |
| :--- | :--- | :--- | :--- |
| Bypassing product focus | "Single Product Mode" path guard | `make check` / CI step | fixture PR touching frozen dirs fails |
| Gaming metrics | scorecard inputs versioned + signed-off in PR | review checklist | snapshot tests on scorecard output |
| Leaking sensitive sales data | scorecard stores only counts + IDs (no emails) | redaction lint | test: no `@` in artifacts |
| Drift of thresholds | thresholds live in config with hash tracked | drift detector | drift report changes when thresholds change |

## Performance & Cost Budgets

*   **Scorecard generation**: < 2s locally.
*   **Artifact size**: < 200KB.
*   **External API calls**: None required for Week 1.

## Convergence & Integration Protocol

1.  **PR1**: Docs (this file).
2.  **PR2**: Single Product Mode Guardrail.
3.  **PR3**: Weekly Scorecard Generator.
4.  **PR4**: Kill-switch Evaluator.
5.  **PR5**: Tech Debt Guardrails.
*   **Conflict Resolution**: "Governor wins" - if a feature PR conflicts with the governor, the governor policy takes precedence.
