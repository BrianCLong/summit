# License Metering (SATT)

## Metering Dimensions

- Execution counts per tenant.
- Runtime seconds per template.
- Output bytes per execution.

## Enforcement

1. Check remaining license budget before execution.
2. Decrement counters atomically during execution.
3. Reject execution when budget exhausted.
4. Emit receipt and compliance log for each execution.

## Recovery

- License replenishment requires policy approval.
- Metering anomalies trigger governance review.
