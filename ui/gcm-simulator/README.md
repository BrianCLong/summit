# GCM Simulator UI

This lightweight simulator helps teams exercise the Governed Chargeback & Metering
(GCM) service without writing client code. It is a static HTML application that
talks directly to the metering API.

## Getting started

1. Run the metering service (see `services/gcm/README.md`).
2. Serve this directory with any static file server, for example:
   ```bash
   cd ui/gcm-simulator
   python -m http.server 4173
   ```
3. Navigate to `http://localhost:4173` and configure the base URL for the GCM
   service (defaults to `http://localhost:8080`).

## Features

- Submit usage reports and view computed charges or guardrail violations.
- Inspect the current signed billing manifest for an account.
- Push provider usage totals to simulate reconciliation.
- Run reconciliation to verify manifests remain within the configured error
  tolerance.

The simulator relies on the TypeScript SDK (`GCMClient`) bundled in `script.js`
and keeps state entirely within the browser session.
