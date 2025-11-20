/**
 * Narrative Simulation Engine Test Template
 *
 * This template demonstrates best practices for testing the narrative simulation
 * engine in the Summit/IntelGraph platform.
 *
 * Key Patterns:
 * - Simulation state management
 * - Actor behavior testing
 * - Event processing and propagation
 * - Relationship dynamics
 * - Scenario execution
 * - Deterministic simulation testing
 *
 * Usage:
 * 1. Copy this template for testing narrative simulation components
 * 2. Replace placeholder names as needed
 * 3. Adjust test scenarios based on your simulation rules
 * 4. Add domain-specific test cases
 */

import { SimulationEngine } from '../src/core/SimulationEngine';
import { NarrativeState } from '../src/core/NarrativeState';
import { EventProcessor } from '../src/core/EventProcessor';
import type {
  SimConfig,
  Actor,
  Relationship,
  SimulationEvent,
  EventType,
} from '../src/core/types';

describe('SimulationEngine', () => {
  let engine: SimulationEngine;
  let baseConfig: SimConfig;

  beforeEach(() => {
    // Setup base configuration for tests
    baseConfig = {
      initialTimestamp: 0,
      actors: [
        {
          id: 'mayor',
          name: 'Mayor Reed',
          mood: 2,
          resilience: 0.2,
          influence: 2,
          traits: ['diplomatic', 'cautious'],
        },
        {
          id: 'chief',
          name: 'Chief Silva',
          mood: 1,
          resilience: 0.3,
          influence: 2,
          traits: ['authoritative', 'decisive'],
        },
        {
          id: 'activist',
          name: 'Jane Activist',
          mood: -1,
          resilience: 0.5,
          influence: 1,
          traits: ['passionate', 'persistent'],
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
        {
          sourceId: 'mayor',
          targetId: 'activist',
          type: 'adversary',
          intensity: 0.6,
          trust: 0.2,
        },
      ],
    };

    engine = new SimulationEngine();
  });

  afterEach(() => {
    engine.reset();
  });

  // ===========================================
  // INITIALIZATION TESTS
  // ===========================================

  describe('initialization', () => {
    it('should initialize with actors and timestamp', () => {
      // Act
      engine.initialize(baseConfig);
      const state = engine.getState();

      // Assert
      expect(state.timestamp).toBe(0);
      expect(state.actors.size).toBe(3);
      expect(state.ensureActor('mayor').getMood()).toBeCloseTo(2);
      expect(state.ensureActor('chief').getMood()).toBeCloseTo(1);
      expect(state.ensureActor('activist').getMood()).toBeCloseTo(-1);
    });

    it('should initialize relationships correctly', () => {
      // Act
      engine.initialize(baseConfig);
      const state = engine.getState();

      // Assert
      const mayorRelationships = state.getRelationships('mayor');
      expect(mayorRelationships).toHaveLength(2);

      const allyRelationship = mayorRelationships.find(
        (r) => r.targetId === 'chief',
      );
      expect(allyRelationship).toBeDefined();
      expect(allyRelationship?.type).toBe('ally');
      expect(allyRelationship?.intensity).toBe(0.8);
      expect(allyRelationship?.trust).toBe(0.7);
    });

    it('should validate actor configuration', () => {
      // Arrange
      const invalidConfig = {
        ...baseConfig,
        actors: [
          {
            id: 'invalid',
            name: 'Invalid Actor',
            mood: 100, // Out of range
            resilience: 0.5,
            influence: 1,
          },
        ],
      };

      // Act & Assert
      expect(() => engine.initialize(invalidConfig)).toThrow(
        'Actor mood must be between -10 and 10',
      );
    });

    it('should validate relationship references', () => {
      // Arrange
      const invalidConfig = {
        ...baseConfig,
        relationships: [
          {
            sourceId: 'mayor',
            targetId: 'nonexistent', // Invalid actor reference
            type: 'ally',
            intensity: 0.5,
            trust: 0.5,
          },
        ],
      };

      // Act & Assert
      expect(() => engine.initialize(invalidConfig)).toThrow(
        'Relationship references non-existent actor',
      );
    });
  });

  // ===========================================
  // EVENT PROCESSING TESTS
  // ===========================================

  describe('event processing', () => {
    beforeEach(() => {
      engine.initialize(baseConfig);
    });

    it('should process queued events on step', () => {
      // Arrange
      const event: SimulationEvent = {
        id: 'event-1',
        type: 'crisis',
        actorId: 'mayor',
        intensity: 1.5,
        timestamp: 0,
        description: 'Major policy failure',
      };

      engine.injectEvent(event);

      // Act
      engine.step();

      // Assert
      const state = engine.getState();
      const mayorMood = state.ensureActor('mayor').getMood();

      // Crisis should decrease mood
      expect(mayorMood).toBeLessThan(2);
      expect(state.events).toHaveLength(1);
      expect(state.events[0].id).toBe('event-1');
    });

    it('should apply resilience to mood changes', () => {
      // Arrange
      const mayorEvent: SimulationEvent = {
        id: 'event-mayor',
        type: 'crisis',
        actorId: 'mayor',
        intensity: 2,
        timestamp: 0,
      };

      const activistEvent: SimulationEvent = {
        id: 'event-activist',
        type: 'crisis',
        actorId: 'activist',
        intensity: 2,
        timestamp: 0,
      };

      // Mayor has resilience 0.2, activist has 0.5
      const initialMayorMood = baseConfig.actors[0].mood;
      const initialActivistMood = baseConfig.actors[2].mood;

      // Act
      engine.injectEvent(mayorEvent);
      engine.step();
      const mayorMoodChange = Math.abs(
        engine.getState().ensureActor('mayor').getMood() - initialMayorMood,
      );

      engine.reset();
      engine.initialize(baseConfig);
      engine.injectEvent(activistEvent);
      engine.step();
      const activistMoodChange = Math.abs(
        engine.getState().ensureActor('activist').getMood() -
          initialActivistMood,
      );

      // Assert
      // Lower resilience = larger mood change
      expect(mayorMoodChange).toBeGreaterThan(activistMoodChange);
    });

    it('should process multiple events in order', () => {
      // Arrange
      const events: SimulationEvent[] = [
        {
          id: 'event-1',
          type: 'crisis',
          actorId: 'mayor',
          intensity: 1,
          timestamp: 0,
        },
        {
          id: 'event-2',
          type: 'success',
          actorId: 'mayor',
          intensity: 1.5,
          timestamp: 0,
        },
        {
          id: 'event-3',
          type: 'neutral',
          actorId: 'chief',
          intensity: 0.5,
          timestamp: 0,
        },
      ];

      events.forEach((e) => engine.injectEvent(e));

      // Act
      engine.step();

      // Assert
      const state = engine.getState();
      expect(state.events).toHaveLength(3);
      expect(state.events.map((e) => e.id)).toEqual([
        'event-1',
        'event-2',
        'event-3',
      ]);
    });

    it('should handle different event types correctly', () => {
      // Arrange
      const testCases: Array<{
        type: EventType;
        expectedMoodDirection: 'increase' | 'decrease' | 'neutral';
      }> = [
        { type: 'crisis', expectedMoodDirection: 'decrease' },
        { type: 'success', expectedMoodDirection: 'increase' },
        { type: 'scandal', expectedMoodDirection: 'decrease' },
        { type: 'victory', expectedMoodDirection: 'increase' },
        { type: 'neutral', expectedMoodDirection: 'neutral' },
      ];

      testCases.forEach(({ type, expectedMoodDirection }) => {
        // Arrange
        engine.reset();
        engine.initialize(baseConfig);
        const initialMood = baseConfig.actors[0].mood;

        const event: SimulationEvent = {
          id: `event-${type}`,
          type,
          actorId: 'mayor',
          intensity: 1,
          timestamp: 0,
        };

        // Act
        engine.injectEvent(event);
        engine.step();
        const finalMood = engine.getState().ensureActor('mayor').getMood();

        // Assert
        if (expectedMoodDirection === 'increase') {
          expect(finalMood).toBeGreaterThan(initialMood);
        } else if (expectedMoodDirection === 'decrease') {
          expect(finalMood).toBeLessThan(initialMood);
        } else {
          expect(Math.abs(finalMood - initialMood)).toBeLessThan(0.1);
        }
      });
    });
  });

  // ===========================================
  // INFLUENCE PROPAGATION TESTS
  // ===========================================

  describe('influence propagation', () => {
    beforeEach(() => {
      engine.initialize(baseConfig);
    });

    it('should propagate influence to related actors', () => {
      // Arrange
      const event: SimulationEvent = {
        id: 'event-mayor-crisis',
        type: 'crisis',
        actorId: 'mayor',
        intensity: 3,
        timestamp: 0,
      };

      const initialChiefMood = baseConfig.actors[1].mood;

      // Act
      engine.injectEvent(event);
      engine.step();

      // Assert
      const state = engine.getState();
      const chiefMood = state.ensureActor('chief').getMood();

      // Chief is an ally, so should be affected by mayor's crisis
      expect(chiefMood).toBeLessThan(initialChiefMood);
    });

    it('should scale influence by relationship intensity', () => {
      // Arrange
      // Create two allies with different relationship intensities
      const config: SimConfig = {
        initialTimestamp: 0,
        actors: [
          { id: 'source', name: 'Source', mood: 0, resilience: 0.5, influence: 2 },
          {
            id: 'close-ally',
            name: 'Close Ally',
            mood: 0,
            resilience: 0.5,
            influence: 1,
          },
          {
            id: 'distant-ally',
            name: 'Distant Ally',
            mood: 0,
            resilience: 0.5,
            influence: 1,
          },
        ],
        relationships: [
          {
            sourceId: 'source',
            targetId: 'close-ally',
            type: 'ally',
            intensity: 0.9, // Strong relationship
            trust: 0.8,
          },
          {
            sourceId: 'source',
            targetId: 'distant-ally',
            type: 'ally',
            intensity: 0.3, // Weak relationship
            trust: 0.4,
          },
        ],
      };

      engine.reset();
      engine.initialize(config);

      const event: SimulationEvent = {
        id: 'event-1',
        type: 'crisis',
        actorId: 'source',
        intensity: 5,
        timestamp: 0,
      };

      // Act
      engine.injectEvent(event);
      engine.step();

      // Assert
      const state = engine.getState();
      const closeAllyMoodChange = Math.abs(
        state.ensureActor('close-ally').getMood(),
      );
      const distantAllyMoodChange = Math.abs(
        state.ensureActor('distant-ally').getMood(),
      );

      // Close ally should be more affected
      expect(closeAllyMoodChange).toBeGreaterThan(distantAllyMoodChange);
    });

    it('should handle adversarial relationships inversely', () => {
      // Arrange
      const event: SimulationEvent = {
        id: 'event-mayor-success',
        type: 'success',
        actorId: 'mayor',
        intensity: 3,
        timestamp: 0,
      };

      const initialActivistMood = baseConfig.actors[2].mood;

      // Act
      engine.injectEvent(event);
      engine.step();

      // Assert
      const state = engine.getState();
      const activistMood = state.ensureActor('activist').getMood();

      // Activist is an adversary, so mayor's success should worsen activist's mood
      expect(activistMood).toBeLessThan(initialActivistMood);
    });

    it('should respect actor influence levels', () => {
      // Arrange
      // Create actors with different influence levels
      const config: SimConfig = {
        initialTimestamp: 0,
        actors: [
          {
            id: 'high-influence',
            name: 'High Influence',
            mood: 0,
            resilience: 0.5,
            influence: 5, // High influence
          },
          {
            id: 'low-influence',
            name: 'Low Influence',
            mood: 0,
            resilience: 0.5,
            influence: 1, // Low influence
          },
          { id: 'target', name: 'Target', mood: 0, resilience: 0.5, influence: 1 },
        ],
        relationships: [
          {
            sourceId: 'high-influence',
            targetId: 'target',
            type: 'ally',
            intensity: 0.5,
            trust: 0.5,
          },
          {
            sourceId: 'low-influence',
            targetId: 'target',
            type: 'ally',
            intensity: 0.5,
            trust: 0.5,
          },
        ],
      };

      engine.reset();
      engine.initialize(config);

      // Act
      const highInfluenceEvent: SimulationEvent = {
        id: 'event-high',
        type: 'crisis',
        actorId: 'high-influence',
        intensity: 2,
        timestamp: 0,
      };

      engine.injectEvent(highInfluenceEvent);
      engine.step();
      const targetMoodAfterHigh = engine.getState().ensureActor('target').getMood();

      engine.reset();
      engine.initialize(config);

      const lowInfluenceEvent: SimulationEvent = {
        id: 'event-low',
        type: 'crisis',
        actorId: 'low-influence',
        intensity: 2,
        timestamp: 0,
      };

      engine.injectEvent(lowInfluenceEvent);
      engine.step();
      const targetMoodAfterLow = engine.getState().ensureActor('target').getMood();

      // Assert
      // High influence actor should have more impact
      expect(Math.abs(targetMoodAfterHigh)).toBeGreaterThan(
        Math.abs(targetMoodAfterLow),
      );
    });
  });

  // ===========================================
  // RELATIONSHIP DYNAMICS TESTS
  // ===========================================

  describe('relationship dynamics', () => {
    beforeEach(() => {
      engine.initialize(baseConfig);
    });

    it('should update trust based on actor behavior', () => {
      // Arrange
      const initialTrust = baseConfig.relationships[0].trust;

      // Mayor (ally) has a success
      const event: SimulationEvent = {
        id: 'event-success',
        type: 'success',
        actorId: 'mayor',
        intensity: 2,
        timestamp: 0,
      };

      // Act
      engine.injectEvent(event);
      engine.step();

      // Assert
      const state = engine.getState();
      const relationship = state
        .getRelationships('mayor')
        .find((r) => r.targetId === 'chief');

      // Success should increase trust between allies
      expect(relationship?.trust).toBeGreaterThanOrEqual(initialTrust);
    });

    it('should degrade relationships during prolonged conflict', () => {
      // Arrange
      const conflictEvents: SimulationEvent[] = Array.from(
        { length: 10 },
        (_, i) => ({
          id: `conflict-${i}`,
          type: 'crisis' as EventType,
          actorId: i % 2 === 0 ? 'mayor' : 'activist',
          intensity: 1,
          timestamp: i,
        }),
      );

      const initialIntensity = baseConfig.relationships[1].intensity; // mayor-activist

      // Act
      conflictEvents.forEach((event) => {
        engine.injectEvent(event);
        engine.step();
      });

      // Assert
      const state = engine.getState();
      const relationship = state
        .getRelationships('mayor')
        .find((r) => r.targetId === 'activist');

      // Prolonged conflict should intensify adversarial relationship
      expect(relationship?.intensity).toBeGreaterThanOrEqual(initialIntensity);
    });

    it('should allow relationship type changes based on interactions', () => {
      // Arrange
      const positiveInteractions: SimulationEvent[] = Array.from(
        { length: 20 },
        (_, i) => ({
          id: `positive-${i}`,
          type: 'cooperation' as EventType,
          actorId: i % 2 === 0 ? 'mayor' : 'activist',
          targetId: i % 2 === 0 ? 'activist' : 'mayor',
          intensity: 1,
          timestamp: i,
        }),
      );

      // Act
      positiveInteractions.forEach((event) => {
        engine.injectEvent(event);
        engine.step();
      });

      // Assert
      const state = engine.getState();
      const relationship = state
        .getRelationships('mayor')
        .find((r) => r.targetId === 'activist');

      // Sufficient positive interactions should change adversary to neutral or ally
      expect(['neutral', 'ally']).toContain(relationship?.type);
    });
  });

  // ===========================================
  // SCENARIO EXECUTION TESTS
  // ===========================================

  describe('scenario execution', () => {
    it('should execute complete scenario', () => {
      // Arrange
      engine.initialize(baseConfig);

      const scenario: SimulationEvent[] = [
        {
          id: 'initial-crisis',
          type: 'crisis',
          actorId: 'mayor',
          intensity: 3,
          timestamp: 0,
          description: 'Budget scandal breaks',
        },
        {
          id: 'response',
          type: 'neutral',
          actorId: 'chief',
          intensity: 1,
          timestamp: 1,
          description: 'Chief remains neutral',
        },
        {
          id: 'activist-response',
          type: 'protest',
          actorId: 'activist',
          intensity: 2,
          timestamp: 2,
          description: 'Activists organize protest',
        },
        {
          id: 'mayor-recovery',
          type: 'success',
          actorId: 'mayor',
          intensity: 2,
          timestamp: 3,
          description: 'Mayor addresses concerns',
        },
      ];

      // Act
      scenario.forEach((event) => {
        engine.injectEvent(event);
        engine.step();
      });

      // Assert
      const state = engine.getState();
      expect(state.timestamp).toBe(4);
      expect(state.events).toHaveLength(4);

      // Verify final state makes sense
      const mayorFinalMood = state.ensureActor('mayor').getMood();
      const activistFinalMood = state.ensureActor('activist').getMood();

      // Mayor should have recovered somewhat
      expect(mayorFinalMood).toBeGreaterThan(-5);

      // Activist should still be negative toward mayor
      expect(activistFinalMood).toBeLessThan(0);
    });

    it('should maintain deterministic results', () => {
      // Arrange
      const events: SimulationEvent[] = [
        { id: 'e1', type: 'crisis', actorId: 'mayor', intensity: 2, timestamp: 0 },
        {
          id: 'e2',
          type: 'success',
          actorId: 'chief',
          intensity: 1,
          timestamp: 1,
        },
      ];

      // Act - Run simulation twice
      engine.initialize(baseConfig);
      events.forEach((e) => engine.injectEvent(e));
      events.forEach(() => engine.step());
      const state1 = engine.getState();
      const mayorMood1 = state1.ensureActor('mayor').getMood();

      engine.reset();
      engine.initialize(baseConfig);
      events.forEach((e) => engine.injectEvent(e));
      events.forEach(() => engine.step());
      const state2 = engine.getState();
      const mayorMood2 = state2.ensureActor('mayor').getMood();

      // Assert - Should get identical results
      expect(mayorMood1).toBeCloseTo(mayorMood2, 10);
    });

    it('should support scenario branching', () => {
      // Arrange
      engine.initialize(baseConfig);

      const baseEvent: SimulationEvent = {
        id: 'base',
        type: 'crisis',
        actorId: 'mayor',
        intensity: 2,
        timestamp: 0,
      };

      engine.injectEvent(baseEvent);
      engine.step();

      // Save state for branching
      const checkpointState = engine.getState().clone();

      // Branch 1: Mayor responds positively
      const branch1Event: SimulationEvent = {
        id: 'branch1',
        type: 'success',
        actorId: 'mayor',
        intensity: 3,
        timestamp: 1,
      };
      engine.injectEvent(branch1Event);
      engine.step();
      const branch1Result = engine.getState().ensureActor('mayor').getMood();

      // Branch 2: Mayor responds poorly
      engine.reset();
      engine.initialize(baseConfig);
      engine.injectEvent(baseEvent);
      engine.step();

      const branch2Event: SimulationEvent = {
        id: 'branch2',
        type: 'scandal',
        actorId: 'mayor',
        intensity: 3,
        timestamp: 1,
      };
      engine.injectEvent(branch2Event);
      engine.step();
      const branch2Result = engine.getState().ensureActor('mayor').getMood();

      // Assert - Different branches should yield different outcomes
      expect(branch1Result).toBeGreaterThan(branch2Result);
    });
  });

  // ===========================================
  // STATE MANAGEMENT TESTS
  // ===========================================

  describe('state management', () => {
    it('should reset simulation state', () => {
      // Arrange
      engine.initialize(baseConfig);
      engine.injectEvent({
        id: 'event-1',
        type: 'crisis',
        actorId: 'mayor',
        intensity: 2,
        timestamp: 0,
      });
      engine.step();

      // Act
      engine.reset();

      // Assert
      const state = engine.getState();
      expect(state.timestamp).toBe(0);
      expect(state.actors.size).toBe(0);
      expect(state.events).toHaveLength(0);
    });

    it('should export and import state', () => {
      // Arrange
      engine.initialize(baseConfig);
      engine.injectEvent({
        id: 'event-1',
        type: 'success',
        actorId: 'mayor',
        intensity: 1,
        timestamp: 0,
      });
      engine.step();

      // Act
      const exportedState = engine.exportState();
      engine.reset();
      engine.importState(exportedState);

      // Assert
      const state = engine.getState();
      expect(state.timestamp).toBe(1);
      expect(state.events).toHaveLength(1);
      expect(state.actors.size).toBe(3);
    });

    it('should validate imported state', () => {
      // Arrange
      const invalidState = {
        timestamp: -1, // Invalid timestamp
        actors: new Map(),
        events: [],
      };

      // Act & Assert
      expect(() => engine.importState(invalidState as any)).toThrow(
        'Invalid state: timestamp cannot be negative',
      );
    });
  });

  // ===========================================
  // PERFORMANCE TESTS
  // ===========================================

  describe('performance', () => {
    it('should handle large number of actors efficiently', () => {
      // Arrange
      const largeConfig: SimConfig = {
        initialTimestamp: 0,
        actors: Array.from({ length: 1000 }, (_, i) => ({
          id: `actor-${i}`,
          name: `Actor ${i}`,
          mood: Math.random() * 4 - 2,
          resilience: Math.random(),
          influence: Math.floor(Math.random() * 5) + 1,
        })),
        relationships: [],
      };

      // Act
      const start = Date.now();
      engine.initialize(largeConfig);
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(1000); // Should initialize 1000 actors in < 1s
      expect(engine.getState().actors.size).toBe(1000);
    });

    it('should process events efficiently', () => {
      // Arrange
      engine.initialize(baseConfig);

      const events: SimulationEvent[] = Array.from({ length: 100 }, (_, i) => ({
        id: `event-${i}`,
        type: (i % 2 === 0 ? 'crisis' : 'success') as EventType,
        actorId: baseConfig.actors[i % 3].id,
        intensity: Math.random() * 3,
        timestamp: i,
      }));

      // Act
      const start = Date.now();
      events.forEach((event) => {
        engine.injectEvent(event);
        engine.step();
      });
      const duration = Date.now() - start;

      // Assert
      expect(duration).toBeLessThan(500); // Should process 100 events in < 500ms
      expect(engine.getState().timestamp).toBe(100);
    });
  });
});
