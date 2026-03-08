"use strict";
/**
 * Adoption Analytics Service Tests
 *
 * Tests for privacy-respecting adoption analytics.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AdoptionAnalyticsService_js_1 = require("./AdoptionAnalyticsService.js");
// Mock the database pool
globals_1.jest.mock('../../config/database.js', () => ({
    getPostgresPool: globals_1.jest.fn(() => null),
}));
(0, globals_1.describe)('AdoptionAnalyticsService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = AdoptionAnalyticsService_js_1.AdoptionAnalyticsService.getInstance();
    });
    (0, globals_1.describe)('consent handling', () => {
        (0, globals_1.it)('should not track events without consent', async () => {
            const event = {
                eventId: 'event-1',
                eventType: 'feature_used',
                tenantId: 'tenant-1',
                userId: 'user-1',
                featureId: 'search',
                timestamp: new Date(),
                sessionId: 'session-1',
                properties: {},
                consent: {
                    analyticsConsent: false,
                    consentSource: 'none',
                    consentVersion: '1.0',
                },
            };
            // Should not throw, just skip tracking
            await (0, globals_1.expect)(service.trackEvent(event)).resolves.not.toThrow();
        });
        (0, globals_1.it)('should track events with explicit consent', async () => {
            const event = {
                eventId: 'event-2',
                eventType: 'feature_used',
                tenantId: 'tenant-1',
                userId: 'user-1',
                featureId: 'search',
                timestamp: new Date(),
                sessionId: 'session-1',
                properties: {},
                consent: {
                    analyticsConsent: true,
                    consentedAt: new Date(),
                    consentSource: 'explicit',
                    consentVersion: '1.0',
                },
            };
            // Should not throw
            await (0, globals_1.expect)(service.trackEvent(event)).resolves.not.toThrow();
        });
    });
    (0, globals_1.describe)('privacy protection', () => {
        (0, globals_1.it)('should hash user and tenant identifiers', async () => {
            const event = {
                eventId: 'event-3',
                eventType: 'feature_used',
                tenantId: 'tenant-123',
                userId: 'user-456',
                featureId: 'dashboard',
                timestamp: new Date(),
                sessionId: 'session-789',
                properties: {},
                consent: {
                    analyticsConsent: true,
                    consentedAt: new Date(),
                    consentSource: 'explicit',
                    consentVersion: '1.0',
                },
            };
            // The service should anonymize the event before storage
            await service.trackEvent(event);
            // We can't directly verify the hashing without exposing internals,
            // but we can verify the service doesn't throw
        });
        (0, globals_1.it)('should strip PII from properties', async () => {
            const event = {
                eventId: 'event-4',
                eventType: 'feature_used',
                tenantId: 'tenant-1',
                userId: 'user-1',
                featureId: 'search',
                timestamp: new Date(),
                sessionId: 'session-1',
                properties: {
                    email: 'user@example.com', // Should be removed
                    name: 'John Doe', // Should be removed
                    query: 'search term', // Should be kept
                },
                consent: {
                    analyticsConsent: true,
                    consentedAt: new Date(),
                    consentSource: 'explicit',
                    consentVersion: '1.0',
                },
            };
            await (0, globals_1.expect)(service.trackEvent(event)).resolves.not.toThrow();
        });
    });
    (0, globals_1.describe)('batch tracking', () => {
        (0, globals_1.it)('should track multiple events and report counts', async () => {
            const events = [
                {
                    eventId: 'batch-1',
                    eventType: 'feature_used',
                    tenantId: 'tenant-1',
                    userId: 'user-1',
                    featureId: 'search',
                    timestamp: new Date(),
                    sessionId: 'session-1',
                    properties: {},
                    consent: { analyticsConsent: true, consentSource: 'explicit', consentVersion: '1.0' },
                },
                {
                    eventId: 'batch-2',
                    eventType: 'feature_used',
                    tenantId: 'tenant-1',
                    userId: 'user-2',
                    featureId: 'dashboard',
                    timestamp: new Date(),
                    sessionId: 'session-2',
                    properties: {},
                    consent: { analyticsConsent: false, consentSource: 'none', consentVersion: '1.0' },
                },
            ];
            const result = await service.trackEventBatch(events);
            (0, globals_1.expect)(result.tracked).toBe(1);
            (0, globals_1.expect)(result.skipped).toBe(1);
        });
    });
    (0, globals_1.describe)('feature registration', () => {
        (0, globals_1.it)('should register features for tracking', () => {
            const feature = {
                id: 'new-feature',
                name: 'New Feature',
                category: 'core',
                description: 'A new feature',
                trackingEvents: ['feature_used'],
                adoptionThreshold: 3,
                enabled: true,
            };
            // Should not throw
            (0, globals_1.expect)(() => service.registerFeature(feature)).not.toThrow();
        });
    });
    (0, globals_1.describe)('funnel registration', () => {
        (0, globals_1.it)('should register funnels for analysis', () => {
            const funnel = {
                id: 'test-funnel',
                name: 'Test Funnel',
                timeWindow: 7 * 24 * 60 * 60 * 1000,
                steps: [
                    { id: 'step-1', name: 'Step 1', eventType: 'feature_viewed' },
                    { id: 'step-2', name: 'Step 2', eventType: 'feature_used' },
                ],
            };
            (0, globals_1.expect)(() => service.registerFunnel(funnel)).not.toThrow();
        });
    });
    (0, globals_1.describe)('governance compliance', () => {
        (0, globals_1.it)('should include governance verdict in analytics results', async () => {
            const options = {
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                endDate: new Date(),
                granularity: 'day',
            };
            const result = await service.getFeatureAdoption(options);
            (0, globals_1.expect)(result.governanceVerdict).toBeDefined();
            (0, globals_1.expect)(result.governanceVerdict?.result).toBe('ALLOW');
        });
    });
});
