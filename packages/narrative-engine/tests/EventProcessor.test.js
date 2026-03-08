"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const EventProcessor_js_1 = require("../src/core/EventProcessor.js");
const NarrativeState_js_1 = require("../src/core/NarrativeState.js");
const Actor_js_1 = require("../src/entities/Actor.js");
const crisisEvent = {
    id: 'crisis-1',
    type: 'crisis',
    actorId: 'leader',
    intensity: 3.8,
    timestamp: 1,
};
describe('EventProcessor', () => {
    it('returns log entry when actor is missing', () => {
        const state = new NarrativeState_js_1.NarrativeState();
        const processor = new EventProcessor_js_1.EventProcessor(state);
        const update = processor.processEvent({
            ...crisisEvent,
            actorId: 'missing',
        });
        expect(update.narrativeLog[0]).toMatch(/missing/);
        expect(update.triggeredEvents).toHaveLength(0);
    });
    it('modifies actor mood and triggers support events', () => {
        const state = new NarrativeState_js_1.NarrativeState();
        const leader = new Actor_js_1.Actor({
            id: 'leader',
            name: 'Leader Lane',
            mood: 3,
            resilience: 0.1,
            influence: 3,
        });
        const deputy = new Actor_js_1.Actor({
            id: 'deputy',
            name: 'Deputy Drew',
            mood: 2,
            resilience: 0.2,
            influence: 2,
        });
        state.addActor(leader);
        state.addActor(deputy);
        state.registerRelationship({
            sourceId: 'leader',
            targetId: 'deputy',
            type: 'ally',
            intensity: 0.9,
            trust: 0.8,
        });
        const processor = new EventProcessor_js_1.EventProcessor(state);
        const update = processor.processEvent(crisisEvent);
        expect(update.actorMood.leader).toBeLessThan(0);
        expect(update.triggeredEvents.some((event) => event.type === 'support')).toBe(true);
        expect(state.ensureActor('deputy').getMood()).not.toBeCloseTo(2);
    });
});
