# Risk & Incident Readiness

## Overview

This document outlines the risk management framework and incident readiness protocols for the Summit platform.

## Risk Envelope

The "Risk Envelope" defines the acceptable boundaries for change during different lifecycle phases.

- **Development:** High velocity, low risk constraints.
- **Stabilization:** Frozen dependencies, cherry-pick only.
- **Freeze:** No changes allowed except critical security hotfixes.

## Incident Readiness

Before any major operation (GA Cut, Migration), the system must be verified for incident readiness:

1.  **On-Call:** Schedules are populated.
2.  **Runbooks:** Key runbooks are verified up-to-date.
3.  **Drills:** Recent DR drill status is passing.

---

## GA Cut Integration

The [GA Cut & Launch Playbook](../../RUNBOOKS/GA_CUT_PLAYBOOK.md) strictly integrates with these protocols. Every GA Cut execution:

1.  **Automated Risk Check:** The `ga-cut` workflow runs `scripts/risk/validate_change_risk.mjs` to ensure the change delta does not exceed the risk budget for the current phase.
2.  **Incident Readiness Gate:** The workflow verifies that no active incidents are in progress and that the incident readiness baseline is met.
3.  **Rollback Path:** A defined rollback path must exist. The automation assumes the standard rollback mechanism (revert + deploy previous) is available.
4.  **Evidence:** The GA Evidence Bundle includes the risk analysis report and incident readiness snapshot.

Failure to pass the Risk Envelope or Incident Readiness checks will **block** the GA Cut at the "Guardrails" stage, preventing the release from proceeding to the "Apply" stage.
