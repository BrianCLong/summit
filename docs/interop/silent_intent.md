# Silent Intent Interoperability

Summit supports the SilentIntent v0 specification for micro-movement based interactions.

## Integration
Implement the `InputProvider` interface and route `IntentFrame` objects via the `IntentRouter`.

## Guidelines
- Follow the `specs/silent_intent/v0/schema.json`.
- Ensure no raw biometric data is leaked in the `meta` field.
