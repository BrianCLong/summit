import { NarrativeState } from '../src/core/NarrativeState.js';
import { Actor } from '../src/entities/Actor.js';
describe('NarrativeState', () => {
    it('stores actors and events and produces snapshots', () => {
        const state = new NarrativeState(5);
        const actor = new Actor({ id: 'a1', name: 'Analyst Ava', mood: 1 });
        state.addActor(actor);
        state.recordEvent({
            id: 'e1',
            type: 'briefing',
            actorId: 'a1',
            intensity: 1,
            timestamp: 5,
        });
        state.log('briefing delivered');
        const snapshot = state.toJSON();
        expect(snapshot.timestamp).toBe(5);
        expect(snapshot.actors[0].name).toBe('Analyst Ava');
        expect(snapshot.events).toHaveLength(1);
        expect(snapshot.logs).toContain('briefing delivered');
    });
    it('registers reciprocal relationships', () => {
        const state = new NarrativeState();
        const a = new Actor({ id: 'alpha', name: 'Alpha' });
        const b = new Actor({ id: 'bravo', name: 'Bravo' });
        state.addActor(a);
        state.addActor(b);
        state.registerRelationship({
            sourceId: 'alpha',
            targetId: 'bravo',
            type: 'ally',
            intensity: 0.9,
        });
        expect(a.getRelationship('bravo')).toBeDefined();
        expect(b.getRelationship('alpha')).toBeDefined();
    });
});
