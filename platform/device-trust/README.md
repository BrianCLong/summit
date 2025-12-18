# Device Trust Posture Engine (DTPE)

The Device Trust Posture Engine provides a privacy-preserving attestation plane that ingests WebAuthn-derived signals, User-Agent Client Hints, and local device checks to generate access-plane claims and risk scores. It includes a Go attestor microservice, a Node.js policy service, UI affordances for posture status and remediation, and fixtures plus Playwright coverage.

## Capabilities
- **Signals**: WebAuthn attestation flags, UA hints, local posture checks, and transport context (secure-context verification).
- **Risk & Claims**: Deterministic scoring with block/step-up/downgrade policies producing access-plane claims without invasive collection.
- **Privacy**: Ephemeral session cache keyed by hashed device identifiers; no raw biometrics or hardware serials persisted.
- **Offline-readiness**: Local cache of last-known-good posture for fully client progressive web apps (FC-PWA) to continue enforcement offline.
- **Testing**: OS/browser fixtures and Playwright flow from non-compliant ➜ remediation ➜ pass.

## Layout
- `go/` — Go attestor service exposing `/attest`, `/claims`, and `/policies` endpoints with risk scoring.
- `node/` — Node.js policy and cache service layering session downgrade logic and offline fallback.
- `fixtures/` — Posture fixtures per OS/browser used by Playwright and simulators.
- `tests/` — Playwright scenario exercising remediation path.
- `tools/` — Policy simulator CLI with non-invasive defaults.
- `../../ui/device-trust.html` — Inline jQuery UI surface for posture state + remediation guidance.

## Quickstart
1. **Go service**
   ```bash
   cd platform/device-trust/go
   go run ./cmd/dtpe
   ```
   - POST `http://localhost:8088/attest` with `{ "deviceId": "abc", "webauthn": {"userVerified": true}, "ua": {"platform": "Windows"}, "local": {"firewallEnabled": true} }`.

2. **Node policy service**
   ```bash
   cd platform/device-trust/node
   npm install
   npm start
   ```
   - Retrieves decisions from the Go attestor and emits claims for the access plane.

3. **Policy simulator**
   ```bash
   node platform/device-trust/tools/policy-simulator.js fixtures/posture-fixtures.json
   ```

## Observability & Compliance
- Structured JSON logs with decision rationale and data-minimization flags.
- Metrics hooks (stubbed) for posture outcomes and policy actions.
- Explicit guardrails to avoid invasive collection; only boolean and coarse-grained signals are processed.

## Future-ready Enhancements
- Add hardware-bound keys for attestation freshness.
- Plug into privacy budgets for configurable signal retention.
- Extend offline evaluator with signed cached decisions.
