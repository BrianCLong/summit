import {
  ActorAwarenessOptions,
  ActorAwarenessResult,
  ActorSignal,
  StochasticActorAwareness,
} from '../../src/services/StochasticActorAwareness';
import { MLAnalysisService } from '../../src/services/mlAnalysisService';

class StubAwareness extends StochasticActorAwareness {
  public receivedSignals: ActorSignal[] = [];
  public receivedOptions: ActorAwarenessOptions | undefined;

  constructor(
    private readonly stubResults: ActorAwarenessResult[],
    private readonly stubSummary: string,
  ) {
    super(() => 0.5);
  }

  override runSimulation(
    signals: ActorSignal[],
    options: ActorAwarenessOptions = {},
  ): ActorAwarenessResult[] {
    this.receivedSignals = signals;
    this.receivedOptions = options;
    return this.stubResults;
  }

  override buildSummary(
    _results: ActorAwarenessResult[],
    _limit = 3,
  ): string {
    return this.stubSummary;
  }
}

describe('MLAnalysisService.generateStochasticActorAwareness', () => {
  it('delegates to the stochastic awareness engine and returns a summary', () => {
    const stubResults: ActorAwarenessResult[] = [
      {
        actor: 'APT29',
        probability: 0.7,
        meanScore: 0.6,
        volatility: 0.1,
        baseWeight: 0.55,
        awarenessScore: 0.64,
        confidence: 0.9,
        dominanceCount: 70,
      },
      {
        actor: 'FIN7',
        probability: 0.2,
        meanScore: 0.4,
        volatility: 0.08,
        baseWeight: 0.3,
        awarenessScore: 0.32,
        confidence: 0.7,
        dominanceCount: 20,
      },
    ];
    const stubAwareness = new StubAwareness(stubResults, 'Top actor APT29');
    const service = new MLAnalysisService({ actorAwareness: stubAwareness });
    const signals: ActorSignal[] = [
      { actor: 'APT29', sightings: 12, recencyDays: 2, confidence: 0.95 },
      { actor: 'FIN7', sightings: 4, recencyDays: 7, confidence: 0.7 },
    ];

    const response = service.generateStochasticActorAwareness(signals, {
      sampleCount: 200,
      summaryLimit: 2,
    });

    expect(stubAwareness.receivedSignals).toEqual(signals);
    expect(stubAwareness.receivedOptions).toEqual({
      sampleCount: 200,
      summaryLimit: 2,
    });
    expect(response.actors).toEqual(stubResults);
    expect(response.summary).toBe('Top actor APT29');
    expect(response.sampleCount).toBe(200);
    expect(response.dominantActor).toEqual(stubResults[0]);
  });

  it('returns an empty summary when no signals are supplied', () => {
    const stubAwareness = new StubAwareness([], 'unused');
    const service = new MLAnalysisService({ actorAwareness: stubAwareness });

    const response = service.generateStochasticActorAwareness([]);

    expect(response.actors).toEqual([]);
    expect(response.summary).toBe('No actor signals provided for awareness simulation.');
    expect(response.sampleCount).toBe(0);
    expect(response.dominantActor).toBeNull();
  });
});
