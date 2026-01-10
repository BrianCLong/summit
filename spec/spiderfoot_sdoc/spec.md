# SDOC Spec Overview

Defines the SpiderFoot wedge for Selective-Disclosure OSINT Capsules.

## Goals

- Execute OSINT modules under policy and sensitivity constraints.
- Produce selective-disclosure capsules with minimal necessary outputs.
- Maintain audit-ready capsule ledgers and witness chains.

## Inputs

- Scan request with targets and purpose.
- Module registry with policy constraints.
- Sensitivity budgets and retention requirements.

## Outputs

- Selective-disclosure scan results with aggregation/redaction.
- Capsule ledger with commitments to results.
- Replay token binding to module versions and time window.

## Processing Stages

1. **Select** modules based on policy constraints.
2. **Enforce** sensitivity budgets and rate limits.
3. **Execute** modules and collect raw results.
4. **Redact/Aggregate** into selective-disclosure outputs.
5. **Package** capsule with ledger and replay token.
