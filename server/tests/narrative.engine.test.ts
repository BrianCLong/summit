import { describe, it, expect, beforeEach } from '@jest/globals';
import { NarrativeSimulationEngine } from '../src/narrative/engine';
import { PredictivePsyOpsLayer } from '../src/narrative/psyops-layer';
import type {
  NarrativeEvent,
  SimulationConfig,
  SimulationEntity,
} from '../src/narrative/types';

describe('NarrativeSimulationEngine', () => {
  let config: SimulationConfig;
  let engine: NarrativeSimulationEngine;

  const mockEntity: SimulationEntity = {
    id: 'agent-1',
    name: 'Agent One',
    type: 'actor',
    alignment: 'neutral',
    influence: 0.5,
    sentiment: 0.0,
    volatility: 0.2,
    resilience: 0.5,
    themes: { stability: 0.5 },
    relationships: [{ targetId: 'agent-2', strength: 0.8 }],
  };

  const mockEntity2: SimulationEntity = {
    id: 'agent-2',
    name: 'Agent Two',
    type: 'actor',
    alignment: 'neutral',
    influence: 0.5,
    sentiment: 0.0,
    volatility: 0.2,
    resilience: 0.5,
    themes: { stability: 0.5 },
    relationships: [{ targetId: 'agent-1', strength: 0.8 }],
  };

  beforeEach(() => {
    config = {
      id: 'sim-1',
      name: 'Test Sim',
      themes: ['stability'],
      tickIntervalMinutes: 60,
      initialEntities: [mockEntity, mockEntity2],
    };
    engine = new NarrativeSimulationEngine(config);
  });

  it('applies injected events on tick', async () => {
    engine.injectActorAction('agent-1', 'Signal Boost', {
      intensity: 1.0,
      sentimentShift: 0.6,
    });

    await engine.tick(1);

    const state = engine.getState();
    const agent1 = state.entities['agent-1'];
    expect(agent1.lastUpdatedTick).toBe(1);
    expect(agent1.sentiment).toBeGreaterThan(0);
    expect(state.recentEvents.length).toBeGreaterThan(0);
  });

  it('propagates events to related entities on subsequent ticks', async () => {
    engine.injectActorAction('agent-1', 'Viral Message', {
      intensity: 1.0,
      sentimentShift: 0.5,
    });

    await engine.tick(1);
    await engine.tick(1);

    const state = engine.getState();
    const agent2 = state.entities['agent-2'];
    expect(agent2.lastUpdatedTick).toBeGreaterThan(0);
    expect(agent2.sentiment).not.toBe(0);
  });

  it('applies parameter adjustments from queued events', async () => {
    const event: NarrativeEvent = {
      id: 'evt-1',
      type: 'system',
      theme: 'stability',
      intensity: 0.4,
      description: 'Parameter update',
      parameterAdjustments: [{ name: 'stress', delta: 0.5 }],
    };
    engine.queueEvent(event);

    await engine.tick(1);

    const state = engine.getState();
    expect(state.parameters.stress).toBeDefined();
    expect(state.parameters.stress.value).toBeGreaterThan(0.4);
  });

  it('generates forecasts when entities meet radicalization thresholds', async () => {
    const layer = new PredictivePsyOpsLayer(engine);
    engine.injectActorAction('agent-1', 'Radicalization Event', {
      intensity: 1.0,
      sentimentShift: 1.0,
    });
    await engine.tick(1);
    engine.injectActorAction('agent-1', 'Radicalization Event', {
      intensity: 1.0,
      sentimentShift: 1.0,
    });
    await engine.tick(1);

    const forecasts = layer.generateForecast();
    expect(forecasts.length).toBeGreaterThan(0);
    expect(forecasts[0].scenarioId).toContain('radicalization');
  });
});
