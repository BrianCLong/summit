# 120: Device Trust & Posture Enforcement (DTPE)

Track: Feature Flags
Branch: feat/dtpe
Labels: feature-flag, area:security, area:access, ci:e2e

## Summary
Gate uploads and sessions based on device posture (OS version, disk encryption, browser hardening), enforcing step-up auth or deny decisions under DTPE_ENABLED.

## Deliverables
- Go/Node service at `/platform/device-trust` for posture attestation (WebAuthn signals, User-Agent hints, local checks) and risk scoring → Access Plane (#33) claims.
- UI posture status and remediation guide; jQuery inline checks for secure context and clipboard guards.
- Policies: block lists, step-up requirements, session downgrade; privacy-preserving posture hints; offline mode for FC-PWA (#43).

## Constraints
- No invasive collection; tenant policy controls; enforce privacy-preserving posture hints.
- Feature flag gating via `DTPE_ENABLED`.

## DoD / CI Gates
- Fixture matrix by OS/browser; policy simulator for block/step-up/downgrade outcomes.
- Playwright E2E: non-compliant → remediate → pass.
- Security and telemetry checks ensure no PII collection and correct Access Plane claims.

## Open Questions (Tuning)
- Baseline posture requirements (OS min, disk encryption, browser version)?
- Step-up options (WebAuthn + OTP vs. WebAuthn only)?

## Parallelization Notes
- Access-plane adjunct; adds posture claims; advisory/deny at gateway without shared state coupling.
