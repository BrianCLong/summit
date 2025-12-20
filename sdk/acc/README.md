# ACC TypeScript SDK

The ACC SDK provides a lightweight client for the Adaptive Consistency Controller sidecar.
It supports per-request consistency planning, replica metric updates, and explain-trace helpers.

## Installation

```bash
pnpm add @summit/acc-sdk
```

## Usage

```ts
import { ACCClient, withPolicyTags } from '@summit/acc-sdk';

const client = new ACCClient({ baseUrl: 'http://localhost:8088' });

const plan = await client.plan({
  id: 'session-read',
  operation: 'read',
  session: 'sess-1',
  dataClass: 'behavioral',
  purpose: 'personalization',
  jurisdiction: 'us'
});

console.log(plan.mode, plan.route.quorum);
console.log(client.formatExplain(plan));
```

## Testing

```bash
cd sdk/acc
npm install
npm test
```

Vitest includes mocks that assert deterministic policy mapping and error propagation.
