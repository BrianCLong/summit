import { SimulationEngine } from '../src/core/SimulationEngine.js';
const baseConfig = {
    initialTimestamp: 0,
    actors: [
        { id: 'mayor', name: 'Mayor Reed', mood: 2, resilience: 0.2, influence: 2 },
        {
            id: 'chief',
            name: 'Chief Silva',
            mood: 1,
            resilience: 0.3,
            influence: 2,
        },
    ],
    relationships: [
        {
            sourceId: 'mayor',
            targetId: 'chief',
            type: 'ally',
            intensity: 0.8,
            trust: 0.7,
        },
    ],
};
describe('SimulationEngine', () => {
    it('initializes actors and timestamp', () => {
        const engine = new SimulationEngine();
        engine.initialize(baseConfig);
        const state = engine.getState();
        expect(state.timestamp).toBe(0);
        expect(state.actors.size).toBe(2);
        expect(state.ensureActor('mayor').getMood()).toBeCloseTo(2);
    });
    it('processes queued events on step and records them', () => {
        const engine = new SimulationEngine();
        engine.initialize(baseConfig);
        engine.injectEvent({
            id: 'event-1',
            type: 'crisis',
            actorId: 'mayor',
            intensity: 1.5,
            timestamp: 0,
        });
        engine.step();
        const state = engine.getState();
        const mayorMood = state.ensureActor('mayor').getMood();
        expect(mayorMood).toBeLessThan(0);
        expect(state.events).toHaveLength(1);
        expect(state.events[0].id).toBe('event-1');
    });
    it('propagates influence to related actors when mood swings', () => {
        const engine = new SimulationEngine();
        engine.initialize(baseConfig);
        engine.injectEvent({
            id: 'event-2',
            type: 'crisis',
            actorId: 'mayor',
            intensity: 3,
            timestamp: 0,
        });
        engine.step();
        const state = engine.getState();
        const chiefMood = state.ensureActor('chief').getMood();
        expect(chiefMood).toBeLessThan(1);
        expect(state.events.map((event) => event.id)).toContain('event-2');
    });
});
