# Query-Shape Policy (QSDR)

## Policy Components

- Allowed query patterns (passive only).
- Rate limits per module and per target.
- Prohibited endpoint classes and active probes.

## Enforcement

1. Validate module execution tokens against policy rules.
2. Monitor emitted queries and compare to allowed shapes.
3. Emit violation event upon mismatch.
4. Trigger kill-switch workflow.
