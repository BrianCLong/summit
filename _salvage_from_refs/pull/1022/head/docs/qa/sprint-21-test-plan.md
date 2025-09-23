# Sprint 21 Test Plan

## Attestation Paths
- Submit SGX, TDX and SEV-SNP reports.
- Reject stale timestamps and disallowed measurements.

## Entitlement Gates
- Issue license token and verify scope and epsilon cap.
- Deny execution when license expired or epsilon exceeded.

## Streaming DP Behavior
- Enforce k≥25 per micro-batch.
- Clamp values and add noise scaled by epsilon.
- Track epsilon spend per stream key with cooldown.
