# Sprint 20 Test Plan

## PSI Session
- Verify sessions emit unique nonces and expire after TTL.
- Ensure no raw join outputs are returned.

## DP Joins
- Validate k>=25 enforcement and clipping.
- Track epsilon/delta spend via accountant.

## Kafka Adapter
- Simulate backpressure and per-tenant topic quotas.

## Model Registry
- Confirm promotion and rollback require signed artifacts.
