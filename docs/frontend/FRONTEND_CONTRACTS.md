# Frontend User Journey Contracts

This document explains the executable frontend contracts that protect Summit’s
most important user journeys. These tests are designed to prevent regressions in
behavior, claims, data semantics, and safety guarantees before they reach users.

## What is a Frontend Contract?

A frontend contract is an executable guarantee that:

- A user journey is reachable.
- The UI presents accurate claims and data context (units, provenance, time
  windows).
- Failures are explicit and honest.
- Observational-only constraints are clearly visible.

Contracts are **non-negotiable invariants**, not exploratory tests.

## Protected Journeys

See **[Golden Path Inventory](./GOLDEN_PATH_INVENTORY.md)** for the full list,
including tier classification and rationales.

## Where the Contracts Live

- Playwright specs: `e2e/tests/frontend-contracts.spec.ts`
- Supporting UI semantics:
  - `apps/web/src/pages/dashboards/CommandCenterDashboard.tsx`
  - `apps/web/src/pages/dashboards/AdvancedDashboardPage.tsx`
  - `apps/web/src/features/internal-command/state.ts`

## How to Run

```bash
pnpm exec playwright test e2e/tests/frontend-contracts.spec.ts
```

> Tip: When running locally against a dev stack, ensure the frontend is available
> at `http://localhost:3000` and Playwright can reach it.

## How to Interpret Failures

- **Tier 0 failures**: Release-blocking. Fix immediately before merging.
- **Tier 1 failures**: Strong signals. Investigate and resolve quickly.
- **Tier 2 failures**: Informational. Track and address when feasible.

Failure messages are written to explain **which truth was violated** (e.g.,
missing provenance labels, absent safety notices, or silent backend failures).

## Maintainer Response Guide

When a contract fails:

1. Identify the violated truth in the failure message.
2. Confirm whether the UI still communicates the required claims, data semantics,
   and safety guarantees.
3. Restore the invariant (add labels, correct messaging, or fix UI state).
4. Re-run the contract suite to verify stability.

If a journey can no longer be tested end-to-end, document the gap and add
compensating controls before removing any contract.
