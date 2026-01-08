# Operational Readiness Index

This document is the single source of truth for Summit platform operational readiness. It provides a centralized, scannable view of the key documents, tools, and reports that govern and verify the health of the repository and its deployable artifacts.

## Core Pillars

1.  **P0/P1 Blockers:** A canonical, evidence-backed list of critical issues that _must_ be resolved before a release can proceed. These are not aspirational; they are hard gates.
    - **Document:** [P0/P1 Blockers](./P0P1_BLOCKERS.md)
    - **Verification:** `pnpm ops:readiness`

2.  **CI Parity:** The contract that ensures what runs locally is what runs in CI. This eliminates "works on my machine" issues.
    - **Runbook:** [CI Parity Runbook](./CI_PARITY_RUNBOOK.md)
    - **Verification:** `pnpm ci:parity`

3.  **Release Gates:** The explicit, mechanically enforced criteria that a change must meet to be promoted to production.
    - **Document:** [Release Gates](../../governance/RELEASE_GATES.md)
    - **Verification:** `pnpm release:preflight`

## How to Verify Readiness

To check the current readiness status of the repository, run the automated check:

```bash
pnpm ops:readiness
```

This script will validate the repository against the defined readiness criteria and produce a report. To generate a persistent Markdown report, run:

```bash
pnpm ops:readiness:report
```
