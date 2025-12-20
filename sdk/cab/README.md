
# CAB TypeScript SDK

Lightweight TypeScript helper for interacting with the Contextual Access Broker (CAB) decision engine.

## Usage

```ts
import { CABClient } from '@summit/cab-sdk';

const client = new CABClient({ baseUrl: 'http://localhost:8085' });
const decision = await client.evaluate({
  action: 'workspace:update',
  subject: { role: 'admin' },
  resource: { classification: 'internal' },
  signals: {
    geo: 'US',
    devicePosture: 'trusted',
    anomalyScore: 0.18,
  },
});

if (decision.decision === 'step-up') {
  const completed = await client.completeStepUp(
    {
      action: 'workspace:update',
      subject: { role: 'admin' },
      resource: { classification: 'internal' },
      signals: {
        geo: 'US',
        devicePosture: 'trusted',
        anomalyScore: 0.51,
      },
    },
    {
      totp: { code: '654321' },
      'hardware-key': { assertion: 'cab-hardware-assertion' },
    }
  );
  console.log(completed.decision);
}
```

The client also exposes helpers for working with saved simulator scenarios.
```ts
const scenario = await client.saveScenario('baseline admin', request);
const replay = await client.replayScenario(scenario.id);
console.log(replay.match); // true when the decision matches the saved outcome
```
