# SpiderFoot — Query-Safe Distributed Recon (QSDR)

QSDR executes distributed OSINT safely using canary targets and query-shape checks to detect
unsafe or abusive recon behavior.

## Objectives

- Detect disallowed recon behavior via canary targets and query-shape policies.
- Automatically halt modules and emit auditable kill records.
- Provide selective-disclosure recon results under policy control.

## Architecture

1. **Recon Scheduler:** Allocates modules across workers.
2. **Policy Filter:** Selects allowed modules and query shapes.
3. **Canary Generator:** Injects decoy targets with instrumentation.
4. **Monitor & Kill Switch:** Detects violations and halts execution.
5. **Audit Ledger:** Stores kill records with evidence.

## Workflow

1. Receive recon request with targets.
2. Select modules based on policy constraints.
3. Generate canary targets and execute recon.
4. Monitor queries and detect violations.
5. Halt module, emit kill audit record, return partial results.

## Data Model

- **CanaryTarget:** `canary_id`, `type`, `trigger_conditions`.
- **QueryShapePolicy:** `policy_id`, `allowed_patterns`, `rate_limits`.
- **KillAuditRecord:** Commitment to evidence and policy decision.

## Policy-as-Code Hooks

- Canary generation and query-shape enforcement defined in policy rules.
- Kill-switch requires policy reference and compliance log.

## Safeguards

- Per-target privacy budgets.
- Quarantine modules pending human review.
