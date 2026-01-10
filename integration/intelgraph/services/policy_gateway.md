# Policy Gateway Service

## Responsibilities

- Evaluate policy-as-code bundles for export, assessment, and incident workflows.
- Record policy decision logs for audit.

## Inputs

- `action`
- `scope_token`
- `egress` budgets
- `attestation` and `sbom` status

## Outputs

- `allow` boolean
- `deny` reasons
- Decision log entry ID

## Policy References

- `policy/opa/contracting_compliance.rego`
