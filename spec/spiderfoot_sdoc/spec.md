# SDOC Spec Overview

Defines the SpiderFoot wedge for Selective-Disclosure OSINT Capsules.

## Goals

- Run OSINT modules under selection/disclosure constraints.
- Enforce sensitivity budgets and retention controls.
- Emit selective-disclosure capsules with ledger and replay tokens.

## Inputs

- Scan request with targets and purpose.
- Module registry with policy/legal constraints.

## Outputs

- Selective-disclosure scan results with aggregation/redaction.
- Capsule ledger with commitments and compliance rationales.
- Replay tokens referencing module versions and time windows.
