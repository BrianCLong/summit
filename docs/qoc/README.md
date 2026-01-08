# Quarterly Optimization Cycle (QOC)

This directory contains the artifacts for the Quarterly Optimization Cycle (QOC), the repeatable sprint that drives perpetual, measurable improvement of the system.

## The Process

The QOC is a fixed-format, 90-day sprint designed to deliver net-positive improvements with zero regression risk. It ensures the system continuously evolves in a disciplined and safe manner, focusing on optimization rather than architectural change.

The process is structured into four weeks of focused work, followed by a period of observation:

1.  **Week 1: Signal Intake & Hypothesis:** Analyze key metrics (cost, latency, reliability) and form 1-3 concrete, surgical improvement hypotheses.
2.  **Weeks 2-3: Bounded Execution:** Implement the changes. Every change must be accompanied by a rollback plan, a guardrail, and a verification delta.
3.  **Week 4: Validation & Lock-In:** Prove the improvement exists, verify no regressions were introduced, and lock the gains in with mechanisms like budgets, alerts, or CI gates.

## Using the Templates

This directory provides two templates to standardize the QOC process:

- **[`QOC_HYPOTHESES.md.template`](./QOC_HYPOTHESES.md.template):** At the beginning of each quarter, create a copy of this file named `QOC_<YYYY_QN>_HYPOTHESES.md` (e.g., `QOC_2025_Q4_HYPOTHESES.md`). Use it to document the signals and define the hypotheses for the cycle.

- **[`QOC_RESULTS.md.template`](./QOC_RESULTS.md.template):** At the end of each quarter, create a copy of this file named `QOC_<YYYY_QN>_RESULTS.md`. Use it to document the final outcomes, report on the required metrics, and attest that all exit criteria have been met.

The goal is to create a durable, auditable record of every optimization cycle, ensuring that each quarter makes the system measurably better.
