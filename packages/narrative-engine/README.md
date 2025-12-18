# Narrative Simulation Engine

The narrative simulation engine provides a lightweight runtime for orchestrating
events, actors, and relationships in story-driven crisis simulations. It exposes
a programmatic API along with Express routes for real-time control.

## Installation

```bash
npm install
```

The package is part of the Summit monorepo and is available after running the
root workspace install.

## Usage

```ts
import express from 'express';
import { createNarrativeRouter } from './src/api/routes';
import {
  SimulationEngine,
  type SimConfig,
  type Event,
} from './src/core/SimulationEngine';

const config: SimConfig = {
  initialTimestamp: 0,
  actors: [
    { id: 'mayor', name: 'Mayor Reed', mood: 2, resilience: 0.3 },
    { id: 'chief', name: 'Chief Silva', mood: 1, resilience: 0.5 },
  ],
  relationships: [
    { sourceId: 'mayor', targetId: 'chief', type: 'ally', intensity: 0.8 },
  ],
};

const engine = new SimulationEngine();
engine.initialize(config);

const app = express();
app.use(express.json());
app.use(createNarrativeRouter(engine));

app.listen(3000, () => console.log('Narrative engine ready'));
```

### Injecting Events

```ts
const event: Event = {
  id: 'ev-1',
  type: 'crisis',
  actorId: 'mayor',
  intensity: 2,
  timestamp: 1,
};

engine.injectEvent(event);
engine.step();

console.log(engine.getState().toJSON());
```

## Testing

Run the repository tests to execute the unit, integration, and scenario suites
for the engine:

```bash
npm test -- --runTestsByPath packages/narrative-engine/tests/SimulationEngine.test.ts
```

## API Endpoints

The Express router registers the following endpoints:

- `POST /api/narrative/init` – initialize the simulation
- `POST /api/narrative/step` – advance the simulation clock
- `POST /api/narrative/inject-event` – inject an external event
- `GET /api/narrative/state` – retrieve the full narrative state snapshot

Each endpoint returns structured JSON to support orchestration dashboards.

## Narrative Simulation Studio

The `NarrativeSimulationStudio` orchestrates influence campaigns, counter-narrative
responses, and information operation effectiveness models on top of the core
engine. It turns higher-level plans into queued events while surfacing
mitigation and effectiveness scores that can be visualized in dashboards.

```ts
import { NarrativeSimulationStudio, SimulationEngine } from './src/index.js';

const engine = new SimulationEngine();
engine.initialize(config);

const studio = new NarrativeSimulationStudio(engine);
studio.configureCampaigns([
  {
    id: 'campaign-alpha',
    sponsor: 'Frontier Group',
    objective: 'Shift public sentiment on water policy',
    narratives: ['river-restoration-is-a-failure'],
    channels: ['social', 'radio'],
    targetAudiences: ['civic-leaders', 'youth'],
    intensity: 0.8,
  },
]);
studio.configureCounterNarratives([
  {
    id: 'cn-alpha',
    campaignId: 'campaign-alpha',
    approach: 'prebunk',
    confidence: 0.6,
    channelAlignment: 0.8,
  },
]);
studio.configureInformationOperations([
  {
    id: 'io-alpha',
    campaignId: 'campaign-alpha',
    tactic: 'bot-swarm',
    amplification: 0.7,
    deception: 0.5,
    reach: 0.6,
  },
]);

const tick = studio.modelInfluenceTick(['mayor', 'chief']);
console.log(tick.operationEffectiveness['io-alpha']);
```
