import {
  AnalyticsConnector,
  AttributionResult,
  ConversionEvent,
  FederatedAttributionEngine,
} from '../src/services/attribution/FederatedAttributionEngine';

describe('FederatedAttributionEngine', () => {
  const baseTime = Date.now();
  const userId = 'user-123';
  const domain = 'app.example.com';

  const buildEngine = () =>
    new FederatedAttributionEngine({
      lookbackWindowDays: 60,
      retentionWindowDays: 120,
      consentRefreshDays: 30,
      minCohortPopulation: 2,
      differentialPrivacyEpsilon: 0.8,
      realTimeWindowMinutes: 60,
      random: () => 0.5,
    });

  const grantConsent = (engine: FederatedAttributionEngine) => {
    engine.recordConsent({
      userId,
      domain,
      consentTypes: ['analytics', 'cross_domain'],
      granted: true,
      timestamp: baseTime - 1000,
    });
  };

  const touchpoints = [
    {
      eventId: 'evt-1',
      userId,
      timestamp: baseTime - 72 * 60 * 60 * 1000,
      domain,
      channel: 'paid_search' as const,
      campaign: 'Q1-Launch',
    },
    {
      eventId: 'evt-2',
      userId,
      timestamp: baseTime - 36 * 60 * 60 * 1000,
      domain,
      channel: 'email' as const,
      campaign: 'Re-engagement',
    },
    {
      eventId: 'evt-3',
      userId,
      timestamp: baseTime - 12 * 60 * 60 * 1000,
      domain,
      channel: 'social' as const,
      campaign: 'Reminder',
    },
  ];

  const conversion: ConversionEvent = {
    eventId: 'evt-conv',
    conversionId: 'order-456',
    userId,
    timestamp: baseTime,
    domain,
    channel: 'direct',
    goalType: 'purchase',
    value: 1200,
  };

  class StubConnector implements AnalyticsConnector {
    public payloads: AttributionResult[] = [];

    constructor(
      public readonly id: string,
      public readonly name: string,
    ) {}

    async sendAttribution(payload: {
      connectorId: string;
      result: AttributionResult;
    }): Promise<void> {
      this.payloads.push(payload.result);
    }
  }

  it('enforces consent before recording events', () => {
    const engine = buildEngine();
    const recorded = engine.recordEvent(touchpoints[0]);
    expect(recorded).toBe(false);
    expect(engine.getJourney(userId)).toHaveLength(0);

    grantConsent(engine);
    const nowRecorded = engine.recordEvent(touchpoints[0]);
    expect(nowRecorded).toBe(true);
    expect(engine.getJourney(userId)).toHaveLength(1);
  });

  it('computes multi-touch attribution models', () => {
    const engine = buildEngine();
    grantConsent(engine);
    touchpoints.forEach((tp) => engine.recordEvent(tp));

    engine.recordConversion(conversion);

    const firstTouch = engine.computeAttribution(conversion, 'first_touch');
    expect(firstTouch?.contributions).toHaveLength(3);
    expect(
      firstTouch?.contributions.find((c) => c.event.eventId === 'evt-1')
        ?.weight,
    ).toBe(1);
    expect(
      firstTouch?.contributions.find((c) => c.event.eventId === 'evt-2')
        ?.weight,
    ).toBe(0);

    const linear = engine.computeAttribution(conversion, 'linear');
    expect(linear?.contributions.every((c) => c.weight === 1 / 3)).toBe(true);

    const decay = engine.computeAttribution(conversion, 'time_decay', {
      halfLifeHours: 24,
    });
    const weights = decay?.contributions.map((c) => c.weight ?? 0) ?? [];
    const total = weights.reduce((acc, value) => acc + value, 0);
    expect(total).toBeCloseTo(1, 5);
    expect(weights[weights.length - 1]).toBeGreaterThan(weights[0]);
  });

  it('provides conversion path analysis without including the conversion touchpoint', () => {
    const engine = buildEngine();
    grantConsent(engine);
    touchpoints.forEach((tp) => engine.recordEvent(tp));
    engine.recordConversion(conversion);

    const summary = engine.analyzeConversionPath(userId, conversion);
    expect(summary).not.toBeNull();
    expect(summary?.touches).toBe(3);
    expect(summary?.channels).toEqual(['paid_search', 'email', 'social']);
    expect(summary?.conversionChannel).toBe('direct');
    expect(summary?.lastTouchChannel).toBe('social');
  });

  it('generates privacy-safe cohort metrics', () => {
    const engine = buildEngine();
    grantConsent(engine);
    touchpoints.forEach((tp) => engine.recordEvent(tp));
    engine.recordConversion(conversion);

    const secondConversion: ConversionEvent = {
      ...conversion,
      conversionId: 'order-789',
      eventId: 'evt-conv-2',
      timestamp: baseTime + 1000,
      value: 900,
    };

    engine.recordConversion(secondConversion);

    const cohort = engine.generateCohortMetrics({
      cohortId: 'high-value',
      channels: ['paid_search'],
      minValue: 500,
    });

    expect(cohort).not.toBeNull();
    expect(cohort?.population).toBe(2);
    expect(cohort?.totalValue).toBeCloseTo(2100, 5);
    expect(cohort?.noiseApplied).toBe(0);
  });

  it('dispatches real-time attribution results to registered connectors', async () => {
    const engine = buildEngine();
    grantConsent(engine);
    touchpoints.forEach((tp) => engine.recordEvent(tp));

    const connector = new StubConnector('ga', 'Google Analytics');
    engine.registerConnector(connector);

    const result = await engine.processRealTimeAttribution(
      conversion,
      'u_shaped',
    );
    expect(result).not.toBeNull();
    expect(connector.payloads).toHaveLength(1);
    expect(connector.payloads[0].model).toBe('u_shaped');

    const scores = engine.getRealTimeScores(userId);
    expect(scores).toHaveLength(1);
    expect(scores[0].conversionId).toBe(conversion.conversionId);
  });
});
