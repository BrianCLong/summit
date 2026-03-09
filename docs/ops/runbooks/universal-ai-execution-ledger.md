# Runbooks: Ledger

## Append Failures
If ledger writes fail due to disk I/O, workflows fail gracefully if `SUMMIT_LEDGER_V1` is critical, or swallow depending on mode. Currently swallowing.

## Replay Drift
If replay drifts, ensure `DETERMINISTIC_TIME` is set and all external calls are mocked.

## Policy Flood
If seeing unexpected `policy.denied` events, check OPA hooks and RBAC.
