# Federated Canary Seeder TypeScript Client

The `@summit/fcs-client` package provides a small TypeScript wrapper for the Federated Canary Seeder (FCS) service. It helps plant canaries, run detections, fetch attribution reports, and verify signed provenance offline using the service's published public key.

## Installation

```bash
npm install @summit/fcs-client
```

## Usage

```ts
import { FCSClient } from '@summit/fcs-client';

const client = new FCSClient('http://localhost:8080');

const record = await client.seedCanary({
  scope: 'finance.payables',
  ttlSeconds: 3600,
  payload: { invoice: 'CANARY-001' },
  stores: ['database', 'object'],
});

const report = await client.getAttributionReport();
const publicKey = await client.getPublicKey();

const verified = await client.verifyRecord(record, publicKey);
console.log(`Provenance valid: ${verified}`);
```

## API

- `seedCanary(spec)` – seed a new canary across the configured stores.
- `scanDetections()` – run the detector pipeline and obtain individual detections.
- `getAttributionReport()` – build an attribution report grouped by scope and canary id.
- `getCanary(id)` – retrieve a specific canary record and provenance bundle.
- `getPublicKey()` – retrieve the hex encoded Ed25519 public key for offline verification.
- `verifyProvenance(provenance, publicKeyHex)` – verify a provenance document with a provided public key.
- `verifyRecord(record, publicKeyHex)` – convenience wrapper around `verifyProvenance`.

The client is fetch-compatible and can operate in browsers or Node.js (18+ where `fetch` is available).
