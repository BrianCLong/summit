# Sandbox Execution (PQLA)

## Sandbox Controls

- Maximum execution time and memory limits.
- Restricted filesystem and network access.
- Attested runtime measurements.

## Execution Report

- `execution_id` and `request_id`.
- Resource usage (CPU, memory, wall time).
- Attestation statement for runtime integrity.

## Failure Handling

- Timeout or resource exhaustion yields policy-compliant error response.
- Execution failures are logged with compliance decision records.
