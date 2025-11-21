# @summit/rarl SDK

TypeScript SDK for interacting with the Risk-Adaptive Rate Limiter (RARL) sidecar.

## Installation

```bash
npm install @summit/rarl
```

## Usage

```ts
import { RarlClient } from '@summit/rarl';

const client = new RarlClient({ baseUrl: 'http://localhost:8080' });

const decision = await client.requestDecision({
  tenantId: 'tenant-a',
  toolId: 'embedding-api',
  units: 5,
  anomalyScore: 0.1,
  policyTier: 'gold',
  geo: 'us'
});

console.log(decision.allowed, decision.remaining);

const signedSnapshot = await client.getSnapshot('tenant-a');
const verified = RarlClient.verifySnapshot('super-secret-key', signedSnapshot);
console.log('snapshot verified?', verified);
```

When running outside of environments that provide a global `fetch`, pass a `fetchImpl` to the
constructor.
