# Sprint 22 Test Plan

## Marketplace Policy Tests
- Ensure only template SKUs can be purchased
- Region mismatch or TTL >30 days is denied by policy

## Differential Privacy
- Histogram buckets below kMin suppressed
- Top-k selects only keys above threshold
- Epsilon spend tracked per order

## Transparency
- Issue and revoke events append to Merkle log
- Inclusion proofs validated against Signed Tree Head
