# ODPS Android SDK

A Kotlin/JVM implementation of the On-Device Privacy SDK. The module targets Android apps but is packaged as a plain Kotlin
library so it can be embedded into existing Gradle builds.

## Features

- Declarative `PolicyPack` for field minimisation and per-metric privacy budgets.
- `ConsentManager` gating that drops telemetry until opt-in.
- Laplace-based local DP for count/sum metrics with configurable seeds for repeatable testing.
- Offline batching with fail-closed uploads when the network is unavailable.
- `TransmissionVerifier` that produces auditable reports of transmitted fields.

## Development

```bash
cd sdk/mobile/android
gradle test
```

The tests simulate seeded PII fields, local-DP noise guarantees, and verifier reconciliation across offline/online sessions.
