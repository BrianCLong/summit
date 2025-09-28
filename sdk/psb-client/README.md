# @summit/psb-client

TypeScript SDK for interacting with the Partner Sampling Broker (PSB). It wraps the broker's HTTP endpoints and exposes helpers for replaying samples and verifying certificates client-side.

## Installation

```sh
npm install @summit/psb-client
```

## Usage

```ts
import { PSBClient, Dataset } from '@summit/psb-client';

const client = new PSBClient('http://localhost:8080');
const response = await client.sample({
  partnerId: 'partner-a',
  seed: '2025-Q1',
  strata: [
    {
      name: 'us-analytics',
      target: 2,
      geo: ['US'],
      consentTags: ['analytics'],
    },
  ],
});

const dataset: Dataset = await fetch('http://localhost:8080/dataset.json').then(
  (res) => res.json(),
);
const verification = client.verifyOffline(response.certificate, dataset);
console.log(verification.valid); // true when the certificate matches the samples
```

The SDK supports dependency injection of `fetch` for custom runtimes and includes a deterministic verifier mirroring the Go reference implementation. Offline verification relies on Node's `crypto` module for Ed25519 checks.
