# Device Trust Posture Engine (DTPE)

A dual Go/Node scaffold for posture attestation that ingests WebAuthn signals, User-Agent hints, and local device checks to produce privacy-preserving Access Plane claims.

## Components
- **Go microservice** (`go/`): stateless HTTP API for evaluate/simulate flows with offline allowances and non-invasive collection defaults.
- **Node simulator** (`node/`): lightweight policy simulation helper for UI/Playwright scenarios.
- **UI reference** (`ui/index.html`): jQuery-based posture status panel with secure-context and clipboard guards, plus remediation tips.
- **Fixtures & tests**: OS/browser fixtures and Playwright script to cover non-compliant → remediate → pass journeys.

## API (Go)
- `POST /evaluate`: `{ policy, signal }` → risk score, claims, policy verdict (permit, step-up-required, session-downgraded, deny, offline-permit).
- `POST /simulate`: `{ policy, fixtures[] }` → batch evaluation for policy simulator dashboards.
- Privacy filter drops invasive identifiers and keeps only allowed local checks.

## Running locally
```bash
cd platform/device-trust/go
GOPROXY=off GONOSUMDB=* go test ./...

# start server
DEVICE_TRUST_ADDR=":8088" go run ./cmd/device-trust
```

Node policy simulator tests:
```bash
cd platform/device-trust/node
node --test test/policySimulator.test.js
```

## Privacy & collection guardrails
- Local checks are whitelisted (disk encryption, screen lock, supported OS version).
- Device identifiers are stripped; only hashed, derived device claims are returned.
- Offline mode allows access without collecting fresh device metadata.

## Playwright flow
`tests/playwright/device-trust.spec.ts` drives a non-compliant posture through remediation to a passing state and asserts policy outcomes using fixtures.
