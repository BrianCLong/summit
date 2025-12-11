import { NarrativeSimulationStudio, SimulationEngine } from '../src/index.js';
import type { SimConfig } from '../src/core/types.js';

const config: SimConfig = {
  initialTimestamp: 0,
  actors: [
    { id: 'mayor', name: 'Mayor Reed', mood: 2, resilience: 0.2, influence: 2 },
    { id: 'chief', name: 'Chief Silva', mood: 1, resilience: 0.35, influence: 1.5 },
  ],
};

describe('NarrativeSimulationStudio', () => {
  it('models influence campaigns with counter-narratives and operation scoring', () => {
    const engine = new SimulationEngine();
    engine.initialize(config);

    const studio = new NarrativeSimulationStudio(engine);
    studio.configureCampaigns([
      {
        id: 'campaign-alpha',
        sponsor: 'Frontier Group',
        objective: 'Shift public sentiment on water policy',
        narratives: ['river-restoration-is-a-failure'],
        channels: ['social', 'radio'],
        targetAudiences: ['civic-leaders', 'youth'],
        intensity: 0.8,
      },
    ]);

    studio.configureCounterNarratives([
      {
        id: 'cn-alpha',
        campaignId: 'campaign-alpha',
        approach: 'prebunk',
        confidence: 0.6,
        channelAlignment: 0.8,
        protectiveMeasures: ['evidence-pack', 'trusted-voices'],
      },
    ]);

    studio.configureInformationOperations([
      {
        id: 'op-alpha',
        campaignId: 'campaign-alpha',
        tactic: 'bot-swarm',
        amplification: 0.6,
        deception: 0.5,
        reach: 0.4,
      },
    ]);

    const tick = studio.modelInfluenceTick(['mayor', 'chief'], 5);

    const influenceEvents = tick.generatedEvents.filter(
      (event) => event.type === 'influence-campaign',
    );
    expect(influenceEvents).toHaveLength(2);

    const counterEvents = tick.generatedEvents.filter(
      (event) => event.type === 'counter-narrative',
    );
    expect(counterEvents).toHaveLength(2);

    const coverage = tick.counterNarrativeCoverage['campaign-alpha'];
    expect(coverage).toBeCloseTo(0.38, 2);

    const mayorInfluence = influenceEvents.find((event) => event.actorId === 'mayor');
    expect(mayorInfluence?.intensity).toBeCloseTo(0.47, 2);

    const opEffectiveness = tick.operationEffectiveness['op-alpha'];
    expect(opEffectiveness).toBeGreaterThan(0.25);
    expect(opEffectiveness).toBeLessThan(0.4);

    expect(tick.notes[0]).toContain('campaign-alpha');
  });
});
