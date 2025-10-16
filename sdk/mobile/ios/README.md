# ODPS iOS SDK

Swift Package that delivers the On-Device Privacy SDK semantics for iOS.

## Highlights

- Declarative policies for field minimisation and local consent gating.
- Optional Laplace DP for `count`/`sum` metrics with deterministic seeding for automated validation.
- Offline batching and fail-closed upload semantics via a pluggable `TelemetryUploader`.
- Transmission verifier that attests to the exact fields leaving the device per session.

## Development

```bash
cd sdk/mobile/ios
swift test
```

Unit tests cover policy enforcement with seeded PII, DP error bounds, and verifier consistency after reconnecting from offline batches.
