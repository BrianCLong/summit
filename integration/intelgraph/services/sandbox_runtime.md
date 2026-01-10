# Sandbox Runtime Service

## Responsibilities

- Execute OSINT modules inside policy-enforced sandboxes.
- Monitor network egress and emit receipts.
- Halt execution when policy budgets are exceeded.

## Inputs

- Module identifier, target, sandbox policy.

## Outputs

- Module results, egress receipt, compliance decision.

## Dependencies

- Egress monitor and policy gateway.
