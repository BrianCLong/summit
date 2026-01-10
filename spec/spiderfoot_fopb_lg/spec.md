# Federated OSINT with Privacy Budgets + Legal/ToS Gates (FOPB-LG)

**Objective:** Safe-by-default OSINT scanning with passive-first execution, legal/ToS gating,
privacy budgets, and auditable scan capsules.

## Scope

- Passive-first scans with gated active modules.
- Policy-checked module selection by jurisdiction and terms-of-service.
- Privacy budget enforcement for lookups and retention.

## Architecture (logical)

```mermaid
flowchart LR
  Request[Scan Request] --> Gate[Legal/ToS Gate]
  Gate --> Registry[Module Registry]
  Registry --> Budget[Privacy Budget Manager]
  Budget --> Execute[Module Executor]
  Execute --> Capsule[Scan Capsule]
  Capsule --> Graph[Graph Materializer]
```

## Core Flow

1. Receive scan request with targets and purpose.
2. Validate authorization token for active scans.
3. Select modules based on legal/ToS constraints and policy decisions.
4. Enforce privacy budget and rate limits.
5. Execute modules to obtain results.
6. Emit scan ledger and capsule with determinism token.

## Inputs

- Target identifiers + scan purpose.
- Module registry metadata.
- Policy decision tokens and budget contracts.

## Outputs

- Scan capsule with ledger, commitments, witness chain.
- Graph materialization with provenance annotations.

## Policy & Compliance

- Jurisdiction rules encoded as policy-as-code.
- Export constraints enforced per module.
- Retention limits enforced with automatic deletion.
