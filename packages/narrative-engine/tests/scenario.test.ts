import { SimulationEngine } from '../src/core/SimulationEngine.js';
import type { SimConfig } from '../src/core/types.js';

describe('Crisis scenario simulation', () => {
  it('stabilizes after cascading support', () => {
    const config: SimConfig = {
      initialTimestamp: 0,
      actors: [
        { id: 'mayor', name: 'Mayor Vega', mood: 3, resilience: 0.2, influence: 3 },
        { id: 'chief', name: 'Chief Orion', mood: 2, resilience: 0.25, influence: 2 },
        { id: 'liaison', name: 'Liaison Lark', mood: 4, resilience: 0.3, influence: 1.5 },
      ],
      relationships: [
        { sourceId: 'mayor', targetId: 'chief', type: 'ally', intensity: 0.85, trust: 0.7 },
        { sourceId: 'chief', targetId: 'liaison', type: 'ally', intensity: 0.8, trust: 0.6 },
        { sourceId: 'liaison', targetId: 'mayor', type: 'family', intensity: 0.9, trust: 0.9 },
      ],
    };

    const engine = new SimulationEngine();
    engine.initialize(config);

    engine.injectEvent({
      id: 'citywide-crisis',
      type: 'crisis',
      actorId: 'mayor',
      intensity: 3,
      timestamp: 0,
    });

    engine.step();
    engine.step();

    const state = engine.getState();
    const mayorMood = state.ensureActor('mayor').getMood();
    const chiefMood = state.ensureActor('chief').getMood();
    const liaisonMood = state.ensureActor('liaison').getMood();

    expect(state.events.length).toBeGreaterThanOrEqual(1);
    expect(mayorMood).toBeLessThan(0);
    expect(chiefMood).toBeLessThan(2);
    expect(liaisonMood).toBeGreaterThan(0);

    const logs = state.toJSON().logs;
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((entry) => entry.includes('influenced'))).toBe(true);
  });
});
