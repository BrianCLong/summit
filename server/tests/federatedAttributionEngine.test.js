"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const FederatedAttributionEngine_js_1 = require("../src/services/attribution/FederatedAttributionEngine.js");
(0, globals_1.describe)('FederatedAttributionEngine', () => {
    const baseTime = Date.now();
    const userId = 'user-123';
    const domain = 'app.example.com';
    const buildEngine = () => new FederatedAttributionEngine_js_1.FederatedAttributionEngine({
        lookbackWindowDays: 60,
        retentionWindowDays: 120,
        consentRefreshDays: 30,
        minCohortPopulation: 2,
        differentialPrivacyEpsilon: 0.8,
        realTimeWindowMinutes: 60,
        random: () => 0.5,
    });
    const grantConsent = (engine) => {
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
            channel: 'paid_search',
            campaign: 'Q1-Launch',
        },
        {
            eventId: 'evt-2',
            userId,
            timestamp: baseTime - 36 * 60 * 60 * 1000,
            domain,
            channel: 'email',
            campaign: 'Re-engagement',
        },
        {
            eventId: 'evt-3',
            userId,
            timestamp: baseTime - 12 * 60 * 60 * 1000,
            domain,
            channel: 'social',
            campaign: 'Reminder',
        },
    ];
    const conversion = {
        eventId: 'evt-conv',
        conversionId: 'order-456',
        userId,
        timestamp: baseTime,
        domain,
        channel: 'direct',
        goalType: 'purchase',
        value: 1200,
    };
    class StubConnector {
        id;
        name;
        payloads = [];
        constructor(id, name) {
            this.id = id;
            this.name = name;
        }
        async sendAttribution(payload) {
            this.payloads.push(payload.result);
        }
    }
    (0, globals_1.it)('enforces consent before recording events', () => {
        const engine = buildEngine();
        const recorded = engine.recordEvent(touchpoints[0]);
        (0, globals_1.expect)(recorded).toBe(false);
        (0, globals_1.expect)(engine.getJourney(userId)).toHaveLength(0);
        grantConsent(engine);
        const nowRecorded = engine.recordEvent(touchpoints[0]);
        (0, globals_1.expect)(nowRecorded).toBe(true);
        (0, globals_1.expect)(engine.getJourney(userId)).toHaveLength(1);
    });
    (0, globals_1.it)('computes multi-touch attribution models', () => {
        const engine = buildEngine();
        grantConsent(engine);
        touchpoints.forEach((tp) => engine.recordEvent(tp));
        engine.recordConversion(conversion);
        const firstTouch = engine.computeAttribution(conversion, 'first_touch');
        (0, globals_1.expect)(firstTouch?.contributions).toHaveLength(3);
        (0, globals_1.expect)(firstTouch?.contributions.find((c) => c.event.eventId === 'evt-1')
            ?.weight).toBe(1);
        (0, globals_1.expect)(firstTouch?.contributions.find((c) => c.event.eventId === 'evt-2')
            ?.weight).toBe(0);
        const linear = engine.computeAttribution(conversion, 'linear');
        (0, globals_1.expect)(linear?.contributions.every((c) => c.weight === 1 / 3)).toBe(true);
        const decay = engine.computeAttribution(conversion, 'time_decay', {
            halfLifeHours: 24,
        });
        const weights = decay?.contributions.map((c) => c.weight ?? 0) ?? [];
        const total = weights.reduce((acc, value) => acc + value, 0);
        (0, globals_1.expect)(total).toBeCloseTo(1, 5);
        (0, globals_1.expect)(weights[weights.length - 1]).toBeGreaterThan(weights[0]);
    });
    (0, globals_1.it)('provides conversion path analysis without including the conversion touchpoint', () => {
        const engine = buildEngine();
        grantConsent(engine);
        touchpoints.forEach((tp) => engine.recordEvent(tp));
        engine.recordConversion(conversion);
        const summary = engine.analyzeConversionPath(userId, conversion);
        (0, globals_1.expect)(summary).not.toBeNull();
        (0, globals_1.expect)(summary?.touches).toBe(3);
        (0, globals_1.expect)(summary?.channels).toEqual(['paid_search', 'email', 'social']);
        (0, globals_1.expect)(summary?.conversionChannel).toBe('direct');
        (0, globals_1.expect)(summary?.lastTouchChannel).toBe('social');
    });
    (0, globals_1.it)('generates privacy-safe cohort metrics', () => {
        const engine = buildEngine();
        grantConsent(engine);
        touchpoints.forEach((tp) => engine.recordEvent(tp));
        engine.recordConversion(conversion);
        const secondConversion = {
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
        (0, globals_1.expect)(cohort).not.toBeNull();
        (0, globals_1.expect)(cohort?.population).toBe(2);
        (0, globals_1.expect)(cohort?.totalValue).toBeCloseTo(2100, 5);
        (0, globals_1.expect)(cohort?.noiseApplied).toBe(0);
    });
    (0, globals_1.it)('dispatches real-time attribution results to registered connectors', async () => {
        const engine = buildEngine();
        grantConsent(engine);
        touchpoints.forEach((tp) => engine.recordEvent(tp));
        const connector = new StubConnector('ga', 'Google Analytics');
        engine.registerConnector(connector);
        const result = await engine.processRealTimeAttribution(conversion, 'u_shaped');
        (0, globals_1.expect)(result).not.toBeNull();
        (0, globals_1.expect)(connector.payloads).toHaveLength(1);
        (0, globals_1.expect)(connector.payloads[0].model).toBe('u_shaped');
        const scores = engine.getRealTimeScores(userId);
        (0, globals_1.expect)(scores).toHaveLength(1);
        (0, globals_1.expect)(scores[0].conversionId).toBe(conversion.conversionId);
    });
});
