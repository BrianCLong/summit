# On-Device Privacy SDK (ODPS)

The ODPS mobile SDKs provide Android and iOS applications with a consistent, policy-driven telemetry pipeline that keeps sensitive data on the device. They implement:

- **Field minimization** through declarative policy packs that whitelist telemetry fields and mark sensitive attributes.
- **Local consent gates** that prevent telemetry flow until the user opts in.
- **Optional local differential privacy (DP)** for `count` and `sum` metrics, with Laplace noise calibrated per-metric.
- **Offline batching and fail-closed networking** that queue telemetry until the device is online and policies are satisfied.
- **Cryptographically auditable verification** artefacts that prove which fields left the device across sessions.

## Modules

- [`android/`](android): Kotlin implementation targeting Android/Jetpack projects.
- [`ios/`](ios): Swift Package that can be embedded in Xcode projects or SwiftPM builds.

Each module contains API docs in source and unit tests that simulate seeded PII, consent gating, local-DP metrics, and verifier reconciliation.

## Usage Highlights

1. Define a `PolicyPack` enumerating allowed fields and metric privacy budgets.
2. Configure a `TelemetryPipeline` with your consent manager, network provider, and uploader implementation.
3. Track events; the pipeline enforces policies, applies DP noise when configured, queues offline, and emits verifier attestations for auditing.

See the platform-specific README sections inside each module for integration steps and Gradle/SwiftPM commands.
