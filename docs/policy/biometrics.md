# Biometric Policy

Summit enforces a strict deny-by-default policy for biometric inference classes.

## Allowed Classes
- `command_decode`: Mapping micro-signals to discrete commands (e.g., "play", "stop").

## Denied Classes (Default)
- `identity_inference`
- `emotion_inference`
- `physiology_inference`

## Governance
All biometric data handling must pass through the `BiometricGate` and comply with the `biometric_policy.yaml`.
