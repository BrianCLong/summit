# Scope Token Service

## Responsibilities

- Issue scope tokens for regulated workflows.
- Validate tokens prior to export or egress.

## Inputs

- Tenant, purpose, classification, TTL
- Policy bundle version

## Outputs

- Scope token ID and expiry
- Audit log entry

## Policy References

- `policy/opa/contracting_compliance.rego`
