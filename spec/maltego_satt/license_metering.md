# License Metering

## Policies

- Budgets per tenant covering executions, runtime duration, and output bytes.
- Rate limits per source with concurrency caps.
- Rejection rules when budget exhausted or attestation invalid.

## Metering Flow

1. Evaluate policy to determine allowed budget for request.
2. Reserve budget units; if insufficient, deny with policy decision ID.
3. Execute transform; measure actual usage.
4. Emit receipt capturing consumption and remaining budget; hash-chain into ledger.

## Caching

- Cache outputs keyed by transform signature; invalidate when measurement hash or policy version changes.
