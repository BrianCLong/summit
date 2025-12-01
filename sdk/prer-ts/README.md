# PRER TypeScript SDK

A lightweight wrapper around the PRER service REST API.

```ts
import { PrerClient } from '@summit/prer-sdk';

const client = new PrerClient({
  baseUrl: 'http://localhost:3000',
  defaultActor: 'analyst@company'
});

const experiment = await client.createExperiment({
  name: 'Hero CTA',
  hypothesis: 'New CTA boosts clicks',
  metrics: [
    { name: 'click_through', baselineRate: 0.12, minDetectableEffect: 0.015 }
  ],
  stopRule: { maxDurationDays: 14, maxUnits: 10000 },
  analysisPlan: { method: 'difference-in-proportions', alpha: 0.05, desiredPower: 0.8 }
});

await client.startExperiment(experiment.id);
```
