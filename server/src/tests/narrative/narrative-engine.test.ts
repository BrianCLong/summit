import { NarrativeSimulationEngine } from '../../narrative/engine.js';
import type {
  SimulationConfig,
  NarrativeEvent,
  LLMClient,
  LLMNarrativeRequest,
} from '../../narrative/types.js';

class TestLLMClient implements LLMClient {
  constructor(private readonly shouldFail = false) {}

  async generateNarrative(request: LLMNarrativeRequest): Promise<string> {
    if (this.shouldFail) {
      throw new Error('LLM offline');
    }
    return `LLM summary for tick ${request.state.tick}`;
  }
}

const baseEntities = [
  {
    id: 'actor_a',
    name: 'Mayor coalition',
    type: 'actor' as const,
    alignment: 'ally' as const,
    influence: 0.6,
    sentiment: 0.2,
    volatility: 0.3,
    resilience: 0.6,
    themes: { stability: 0.8, influence: 0.4 },
    relationships: [{ targetId: 'group_citizens', strength: 0.7 }],
  },
  {
    id: 'group_citizens',
    name: 'Civic forum',
    type: 'group' as const,
    alignment: 'neutral' as const,
    influence: 0.5,
    sentiment: -0.1,
    volatility: 0.4,
    resilience: 0.5,
    themes: { stability: 0.6, influence: 0.5 },
    relationships: [],
  },
];

const createConfig = (
  overrides?: Partial<SimulationConfig>,
): SimulationConfig => ({
  id: `sim-${Math.random().toString(36).slice(2, 8)}`,
  name: 'Test simulation',
  themes: ['stability', 'influence'],
  tickIntervalMinutes: 60,
  initialEntities: baseEntities.map((entity) => ({ ...entity })),
  initialParameters: [{ name: 'public_trust', value: 0.4 }],
  ...overrides,
});

describe('NarrativeSimulationEngine', () => {
  it('applies queued events and updates entity sentiment and arcs', async () => {
    const engine = new NarrativeSimulationEngine(
      createConfig({ id: 'sim-events' }),
    );
    const initialState = engine.getState();
    const actorBaseline = initialState.entities['actor_a'].sentiment;
    const groupBaseline = initialState.entities['group_citizens'].sentiment;

    const event: NarrativeEvent = {
      id: 'event-1',
      type: 'social',
      actorId: 'actor_a',
      targetIds: ['group_citizens'],
      theme: 'stability',
      intensity: 1,
      sentimentShift: 0.25,
      influenceShift: 0.1,
      description: 'Town hall produces strong public response',
      scheduledTick: 1,
    };

    engine.queueEvent(event);
    const stateAfterTick = await engine.tick();

    expect(stateAfterTick.tick).toBe(1);
    expect(stateAfterTick.entities['actor_a'].sentiment).toBeGreaterThan(
      actorBaseline,
    );
    expect(stateAfterTick.entities['group_citizens'].sentiment).toBeGreaterThan(
      groupBaseline,
    );
    expect(
      stateAfterTick.arcs.find((arc) => arc.theme === 'stability')?.momentum,
    ).toBeGreaterThan(0);
  });

  it('adjusts time-variant parameters when events include interventions', async () => {
    const engine = new NarrativeSimulationEngine(
      createConfig({ id: 'sim-parameters' }),
    );
    engine.queueEvent({
      id: 'event-2',
      type: 'information',
      theme: 'influence',
      intensity: 1,
      sentimentShift: 0.1,
      influenceShift: 0.05,
      description: 'Verified fact-check distributed',
      parameterAdjustments: [{ name: 'public_trust', delta: 0.2 }],
      scheduledTick: 1,
    });

    const stateAfterTick = await engine.tick();
    expect(stateAfterTick.parameters['public_trust'].value).toBeGreaterThan(
      0.4,
    );
    expect(
      stateAfterTick.parameters['public_trust'].history.length,
    ).toBeGreaterThan(1);
  });

  it('supports LLM-driven narratives with automatic fallback', async () => {
    const llmEngine = new NarrativeSimulationEngine(
      createConfig({
        id: 'sim-llm',
        generatorMode: 'llm',
        llmClient: new TestLLMClient(),
      }),
    );

    await llmEngine.tick();
    const llmState = llmEngine.getState();
    expect(llmState.narrative.mode).toBe('llm');
    expect(llmState.narrative.summary).toContain('LLM summary');

    const fallbackEngine = new NarrativeSimulationEngine(
      createConfig({
        id: 'sim-llm-fallback',
        generatorMode: 'llm',
        llmClient: new TestLLMClient(true),
      }),
    );

    await fallbackEngine.tick();
    const fallbackState = fallbackEngine.getState();
    expect(fallbackState.narrative.mode).toBe('llm');
    expect(fallbackState.narrative.summary).toContain('fallback');
  });
});
