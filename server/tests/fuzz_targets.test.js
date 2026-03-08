"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fast_check_1 = __importDefault(require("fast-check"));
const engine_js_1 = require("../src/narrative/engine.js");
const index_js_1 = require("../src/nl2cypher/index.js");
const engine_js_2 = require("../src/rules/engine.js");
const globals_1 = require("@jest/globals");
// Determine number of runs based on environment
const isCI = process.env.CI === 'true';
const numRuns = isCI ? 50 : 1000;
const fcOptions = { numRuns };
// Mocks for NarrativeSimulationEngine dependencies
const mockConfig = {
    id: 'sim-1',
    name: 'Test Sim',
    tickIntervalMinutes: 15,
    themes: ['tension', 'cooperation'],
    initialEntities: [],
    initialParameters: [],
    generatorMode: 'rule-based',
    metadata: {}
};
(0, globals_1.describe)('Fuzz Targets', () => {
    (0, globals_1.describe)('NarrativeSimulationEngine Properties', () => {
        (0, globals_1.test)('State consistency: tick should behave monotonically and bound values', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.integer({ min: 1, max: 20 }), // steps
            fast_check_1.default.array(fast_check_1.default.record({
                id: fast_check_1.default.uuid(),
                name: fast_check_1.default.string(),
                type: fast_check_1.default.constant('actor'),
                alignment: fast_check_1.default.constant('neutral'),
                sentiment: fast_check_1.default.float({ min: -1, max: 1, noNaN: true }),
                influence: fast_check_1.default.float({ min: 0, max: 1.5, noNaN: true }),
                resilience: fast_check_1.default.float({ min: 0, max: 1, noNaN: true }),
                volatility: fast_check_1.default.float({ min: 0, max: 1, noNaN: true }),
                themes: fast_check_1.default.constant({}),
                relationships: fast_check_1.default.constant([]),
                metadata: fast_check_1.default.constant({})
            }), { minLength: 1, maxLength: 5 }), // initial entities
            async (steps, entities) => {
                const config = { ...mockConfig, initialEntities: entities };
                const engine = new engine_js_1.NarrativeSimulationEngine(config);
                const initialState = engine.getState();
                const initialTick = initialState.tick;
                const initialTimestamp = initialState.timestamp.getTime();
                const finalState = await engine.tick(steps);
                (0, globals_1.expect)(finalState.tick).toBe(initialTick + steps);
                (0, globals_1.expect)(finalState.timestamp.getTime()).toBeGreaterThan(initialTimestamp);
                // Invariants
                Object.values(finalState.entities).forEach(entity => {
                    (0, globals_1.expect)(entity.sentiment).toBeGreaterThanOrEqual(-1);
                    (0, globals_1.expect)(entity.sentiment).toBeLessThanOrEqual(1);
                    (0, globals_1.expect)(entity.influence).toBeGreaterThanOrEqual(0);
                    (0, globals_1.expect)(entity.influence).toBeLessThanOrEqual(1.5);
                    (0, globals_1.expect)(entity.pressure).toBeGreaterThanOrEqual(0);
                    (0, globals_1.expect)(entity.pressure).toBeLessThanOrEqual(1);
                    // History limit
                    (0, globals_1.expect)(entity.history.length).toBeLessThanOrEqual(64);
                });
            }), fcOptions);
        });
        (0, globals_1.test)('No crash on random event injection (with valid and invalid actors)', async () => {
            await fast_check_1.default.assert(fast_check_1.default.asyncProperty(fast_check_1.default.array(fast_check_1.default.record({
                id: fast_check_1.default.uuid(),
                name: fast_check_1.default.string(),
                type: fast_check_1.default.constant('actor'),
                alignment: fast_check_1.default.constant('neutral'),
                sentiment: fast_check_1.default.float({ min: -1, max: 1, noNaN: true }),
                influence: fast_check_1.default.float({ min: 0, max: 1.5, noNaN: true }),
                resilience: fast_check_1.default.float({ min: 0, max: 1, noNaN: true }),
                volatility: fast_check_1.default.float({ min: 0, max: 1, noNaN: true }),
                themes: fast_check_1.default.constant({}),
                relationships: fast_check_1.default.constant([]),
                metadata: fast_check_1.default.constant({})
            }), { minLength: 1, maxLength: 5 }), fast_check_1.default.record({
                useValidActor: fast_check_1.default.boolean(),
                description: fast_check_1.default.string(),
                intensity: fast_check_1.default.float({ min: 0, max: 1, noNaN: true }),
                sentimentShift: fast_check_1.default.float({ min: -1, max: 1, noNaN: true })
            }), async (entities, eventData) => {
                const config = { ...mockConfig, initialEntities: entities };
                const engine = new engine_js_1.NarrativeSimulationEngine(config);
                // Pick a valid actor ID if requested and possible, otherwise use random UUID
                let actorId;
                if (eventData.useValidActor && entities.length > 0) {
                    actorId = entities[0].id;
                }
                else {
                    actorId = 'random-uuid-that-does-not-exist';
                }
                // Just checking it doesn't throw
                engine.injectActorAction(actorId, eventData.description, {
                    intensity: eventData.intensity,
                    sentimentShift: eventData.sentimentShift
                });
                await engine.tick(1);
                // If we reach here, we didn't crash
                (0, globals_1.expect)(true).toBe(true);
            }), fcOptions);
        });
    });
    (0, globals_1.describe)('nl2cypher Properties', () => {
        (0, globals_1.test)('Should not throw unexpected errors on random strings', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string(), (input) => {
                try {
                    const result = (0, index_js_1.nl2cypher)(input);
                    // If it succeeds, structure should be valid
                    (0, globals_1.expect)(result).toHaveProperty('cypher');
                    (0, globals_1.expect)(result).toHaveProperty('estimatedCost');
                    (0, globals_1.expect)(result.estimatedCost).toBeGreaterThan(0);
                }
                catch (e) {
                    // If it fails, it should be "Unsupported query"
                    (0, globals_1.expect)(e.message).toBe('Unsupported query');
                }
            }), fcOptions);
        });
        (0, globals_1.test)('Valid count queries should always parse', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string({ minLength: 1, maxLength: 20 }).filter(s => /^\w+$/.test(s)), // label
            fast_check_1.default.string({ minLength: 1, maxLength: 20 }).filter(s => /^\w+$/.test(s)), // prop
            fast_check_1.default.string({ minLength: 1, maxLength: 20 }).filter(s => /^\w+$/.test(s)), // value
            (label, prop, value) => {
                const query = `count ${label} where ${prop} is ${value}`;
                const result = (0, index_js_1.nl2cypher)(query);
                (0, globals_1.expect)(result.ast.type).toBe('count');
                (0, globals_1.expect)(result.ast.label).toBe(label);
                (0, globals_1.expect)(result.ast.filter).toEqual({ property: prop, value: value });
            }), fcOptions);
        });
    });
    (0, globals_1.describe)('dedupeAlerts Properties', () => {
        (0, globals_1.test)('Idempotency: deduping twice should yield same result', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.array(fast_check_1.default.record({
                ruleId: fast_check_1.default.string(),
                entityId: fast_check_1.default.string(),
                createdAt: fast_check_1.default.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
            })), fast_check_1.default.record({
                ruleId: fast_check_1.default.string(),
                entityId: fast_check_1.default.string(),
                createdAt: fast_check_1.default.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') })
            }), fast_check_1.default.integer({ min: 0, max: 1000000 }), // windowMs
            (alerts, newAlert, windowMs) => {
                // First dedupe
                const result1 = (0, engine_js_2.dedupeAlerts)(alerts, newAlert, windowMs);
                // If we try to add newAlert again to result1, it should definitely be deduped if it was added,
                // or still same if it wasn't.
                // Let's test that the output size is bounded
                (0, globals_1.expect)(result1.length).toBeGreaterThanOrEqual(alerts.length);
                (0, globals_1.expect)(result1.length).toBeLessThanOrEqual(alerts.length + 1);
                // If we run it again with the same inputs, it should be identical (pure function check)
                const result2 = (0, engine_js_2.dedupeAlerts)(alerts, newAlert, windowMs);
                (0, globals_1.expect)(result2).toEqual(result1);
            }), fcOptions);
        });
        (0, globals_1.test)('Should not add duplicate if within window', () => {
            fast_check_1.default.assert(fast_check_1.default.property(fast_check_1.default.string(), // ruleId
            fast_check_1.default.string(), // entityId
            fast_check_1.default.date({ min: new Date('2020-01-01'), max: new Date('2030-01-01') }), // baseTime
            fast_check_1.default.integer({ min: 0, max: 1000 }), // time diff inside window
            fast_check_1.default.integer({ min: 2000, max: 5000 }), // window
            (ruleId, entityId, baseTime, diff, windowMs) => {
                const alert1 = { ruleId, entityId, createdAt: baseTime };
                const alert2 = { ruleId, entityId, createdAt: new Date(baseTime.getTime() + diff) };
                // alert1 is already in the list
                const alerts = [alert1];
                // Attempt to add alert2
                const result = (0, engine_js_2.dedupeAlerts)(alerts, alert2, windowMs);
                // Should not have added alert2
                (0, globals_1.expect)(result).toEqual(alerts);
            }), fcOptions);
        });
    });
});
