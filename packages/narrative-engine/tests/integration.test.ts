import express from 'express';
import type { AddressInfo } from 'net';
import { createNarrativeRouter } from '../src/api/routes.js';
import { SimulationEngine } from '../src/core/SimulationEngine.js';

const config = {
  initialTimestamp: 0,
  actors: [
    { id: 'planner', name: 'Planner Poe', mood: 4, resilience: 0.4, influence: 1.5 },
    { id: 'respond', name: 'Responder Rae', mood: 2, resilience: 0.3, influence: 1.2 },
  ],
  relationships: [
    { sourceId: 'planner', targetId: 'respond', type: 'ally', intensity: 0.7 },
  ],
};

const crisisEvent = {
  id: 'api-crisis',
  type: 'crisis',
  actorId: 'planner',
  intensity: 1.2,
  timestamp: 1,
};

describe('Narrative API integration', () => {
  it('initializes, steps, and injects events via API', async () => {
    const engine = new SimulationEngine();
    const app = express();
    app.use(express.json());
    app.use(createNarrativeRouter(engine));

    const server = await new Promise<import('http').Server>((resolve) => {
      const listener = app.listen(0, () => resolve(listener));
    });

    const { port } = server.address() as AddressInfo;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
      const initResponse = await fetch(`${baseUrl}/api/narrative/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      expect(initResponse.status).toBe(200);

      const injectResponse = await fetch(`${baseUrl}/api/narrative/inject-event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(crisisEvent),
      });
      expect(injectResponse.status).toBe(202);

      const stepResponse = await fetch(`${baseUrl}/api/narrative/step`, { method: 'POST' });
      expect(stepResponse.status).toBe(200);

      const stateResponse = await fetch(`${baseUrl}/api/narrative/state`);
      expect(stateResponse.status).toBe(200);
      const payload = (await stateResponse.json()) as {
        timestamp: number;
        events: unknown[];
        actors: Array<{ id: string; mood: number }>;
      };
      expect(payload.timestamp).toBe(1);
      expect(payload.events).toHaveLength(1);
      const planner = payload.actors.find((actor) => actor.id === 'planner');
      expect(planner?.mood).toBeLessThan(4);
    } finally {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  });
});
