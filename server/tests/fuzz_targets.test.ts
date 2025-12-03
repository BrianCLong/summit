
import fc from 'fast-check';
import { NarrativeSimulationEngine } from '../src/narrative/engine';
import { nl2cypher } from '../src/nl2cypher/index';
import { dedupeAlerts } from '../src/rules/engine.js';
import { SimulationConfig, NarrativeEvent } from '../src/narrative/types';

// Determine number of runs based on environment
const isCI = process.env.CI === 'true';
const numRuns = isCI ? 50 : 1000;
const fcOptions = { numRuns };

// Mocks for NarrativeSimulationEngine dependencies
const mockConfig: SimulationConfig = {
  id: 'sim-1',
  name: 'Test Sim',
  tickIntervalMinutes: 15,
  themes: ['tension', 'cooperation'],
  initialEntities: [],
  initialParameters: [],
  generatorMode: 'rule-based',
  metadata: {}
};

describe('Fuzz Targets', () => {

  describe('NarrativeSimulationEngine Properties', () => {
    test('State consistency: tick should behave monotonically and bound values', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // steps
          fc.array(fc.record({
             id: fc.uuid(),
             name: fc.string(),
             type: fc.constant('agent'),
             sentiment: fc.float({ min: -1, max: 1, noNaN: true }),
             influence: fc.float({ min: 0, max: 1.5, noNaN: true }),
             resilience: fc.float({ min: 0, max: 1, noNaN: true }),
             volatility: fc.float({ min: 0, max: 1, noNaN: true }),
             themes: fc.constant({}),
             relationships: fc.constant([]),
             metadata: fc.constant({})
          }), { minLength: 1, maxLength: 5 }), // initial entities
          async (steps, entities) => {
            const config = { ...mockConfig, initialEntities: entities };
            const engine = new NarrativeSimulationEngine(config as any);

            const initialState = engine.getState();
            const initialTick = initialState.tick;
            const initialTimestamp = initialState.timestamp.getTime();

            const finalState = await engine.tick(steps);

            expect(finalState.tick).toBe(initialTick + steps);
            expect(finalState.timestamp.getTime()).toBeGreaterThan(initialTimestamp);

            // Invariants
            Object.values(finalState.entities).forEach(entity => {
              expect(entity.sentiment).toBeGreaterThanOrEqual(-1);
              expect(entity.sentiment).toBeLessThanOrEqual(1);
              expect(entity.influence).toBeGreaterThanOrEqual(0);
              expect(entity.influence).toBeLessThanOrEqual(1.5);
              expect(entity.pressure).toBeGreaterThanOrEqual(0);
              expect(entity.pressure).toBeLessThanOrEqual(1);
              // History limit
              expect(entity.history.length).toBeLessThanOrEqual(64);
            });
          }
        ), fcOptions
      );
    });

    test('No crash on random event injection (with valid and invalid actors)', async () => {
         await fc.assert(
            fc.asyncProperty(
                fc.array(fc.record({
                   id: fc.uuid(),
                   name: fc.string(),
                   type: fc.constant('agent'),
                   sentiment: fc.float({ min: -1, max: 1, noNaN: true }),
                   influence: fc.float({ min: 0, max: 1.5, noNaN: true }),
                   resilience: fc.float({ min: 0, max: 1, noNaN: true }),
                   volatility: fc.float({ min: 0, max: 1, noNaN: true }),
                   themes: fc.constant({}),
                   relationships: fc.constant([]),
                   metadata: fc.constant({})
                }), { minLength: 1, maxLength: 5 }),
                fc.record({
                    useValidActor: fc.boolean(),
                    description: fc.string(),
                    intensity: fc.float({min: 0, max: 1, noNaN: true}),
                    sentimentShift: fc.float({min: -1, max: 1, noNaN: true})
                }),
                async (entities, eventData) => {
                     const config = { ...mockConfig, initialEntities: entities };
                     const engine = new NarrativeSimulationEngine(config as any);

                     // Pick a valid actor ID if requested and possible, otherwise use random UUID
                     let actorId: string;
                     if (eventData.useValidActor && entities.length > 0) {
                         actorId = entities[0].id;
                     } else {
                         actorId = 'random-uuid-that-does-not-exist';
                     }

                     // Just checking it doesn't throw
                     engine.injectActorAction(actorId, eventData.description, {
                         intensity: eventData.intensity,
                         sentimentShift: eventData.sentimentShift
                     });
                     await engine.tick(1);

                     // If we reach here, we didn't crash
                     expect(true).toBe(true);
                }
            ), fcOptions
         )
    });
  });

  describe('nl2cypher Properties', () => {
    test('Should not throw unexpected errors on random strings', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          try {
            const result = nl2cypher(input);
            // If it succeeds, structure should be valid
            expect(result).toHaveProperty('cypher');
            expect(result).toHaveProperty('estimatedCost');
            expect(result.estimatedCost).toBeGreaterThan(0);
          } catch (e: any) {
            // If it fails, it should be "Unsupported query"
            expect(e.message).toBe('Unsupported query');
          }
        }), fcOptions
      );
    });

    test('Valid count queries should always parse', () => {
        fc.assert(
            fc.property(
                fc.string({minLength: 1, maxLength: 20}).filter(s => /^\w+$/.test(s)), // label
                fc.string({minLength: 1, maxLength: 20}).filter(s => /^\w+$/.test(s)), // prop
                fc.string({minLength: 1, maxLength: 20}).filter(s => /^\w+$/.test(s)), // value
                (label, prop, value) => {
                    const query = `count ${label} where ${prop} is ${value}`;
                    const result = nl2cypher(query);
                    expect(result.ast.type).toBe('count');
                    expect(result.ast.label).toBe(label);
                    expect(result.ast.filter).toEqual({ property: prop, value: value });
                }
            ), fcOptions
        )
    });
  });

  describe('dedupeAlerts Properties', () => {
    test('Idempotency: deduping twice should yield same result', () => {
      fc.assert(
        fc.property(
           fc.array(fc.record({
               ruleId: fc.string(),
               entityId: fc.string(),
               createdAt: fc.date({min: new Date('2020-01-01'), max: new Date('2030-01-01')})
           })),
           fc.record({
               ruleId: fc.string(),
               entityId: fc.string(),
               createdAt: fc.date({min: new Date('2020-01-01'), max: new Date('2030-01-01')})
           }),
           fc.integer({min: 0, max: 1000000}), // windowMs
           (alerts, newAlert, windowMs) => {
               // First dedupe
               const result1 = dedupeAlerts(alerts, newAlert, windowMs);

               // If we try to add newAlert again to result1, it should definitely be deduped if it was added,
               // or still same if it wasn't.

               // Let's test that the output size is bounded
               expect(result1.length).toBeGreaterThanOrEqual(alerts.length);
               expect(result1.length).toBeLessThanOrEqual(alerts.length + 1);

               // If we run it again with the same inputs, it should be identical (pure function check)
               const result2 = dedupeAlerts(alerts, newAlert, windowMs);
               expect(result2).toEqual(result1);
           }
        ), fcOptions
      );
    });

    test('Should not add duplicate if within window', () => {
         fc.assert(
             fc.property(
                 fc.string(), // ruleId
                 fc.string(), // entityId
                 fc.date({min: new Date('2020-01-01'), max: new Date('2030-01-01')}), // baseTime
                 fc.integer({min: 0, max: 1000}), // time diff inside window
                 fc.integer({min: 2000, max: 5000}), // window
                 (ruleId, entityId, baseTime, diff, windowMs) => {
                     const alert1 = { ruleId, entityId, createdAt: baseTime };
                     const alert2 = { ruleId, entityId, createdAt: new Date(baseTime.getTime() + diff) };

                     // alert1 is already in the list
                     const alerts = [alert1];

                     // Attempt to add alert2
                     const result = dedupeAlerts(alerts, alert2, windowMs);

                     // Should not have added alert2
                     expect(result).toEqual(alerts);
                 }
             ), fcOptions
         )
    });
  });
});
