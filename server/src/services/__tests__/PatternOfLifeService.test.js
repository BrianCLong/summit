"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const PatternOfLifeService_js_1 = require("../PatternOfLifeService.js");
(0, globals_1.describe)('PatternOfLifeService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new PatternOfLifeService_js_1.PatternOfLifeService();
    });
    const createEvent = (timestamp, actionType, id = 'test-id') => ({
        id,
        tenantId: 'tenant-1',
        sequenceNumber: BigInt(1),
        previousHash: 'prev',
        currentHash: 'curr',
        timestamp,
        actionType,
        resourceType: 'resource',
        resourceId: 'res-1',
        actorId: 'user-1',
        actorType: 'user',
        payload: {
            mutationType: 'CREATE',
            entityId: id,
            entityType: 'resource',
        },
        metadata: {},
    });
    (0, globals_1.describe)('detectPeriodicity', () => {
        (0, globals_1.it)('should detect a perfect periodic pattern', () => {
            const now = new Date();
            const events = [];
            // Create an event every hour (3600 seconds)
            for (let i = 0; i < 10; i++) {
                events.push(createEvent(new Date(now.getTime() + i * 3600 * 1000), 'LOGIN'));
            }
            const patterns = service.detectPeriodicity(events);
            (0, globals_1.expect)(patterns).toHaveLength(1);
            (0, globals_1.expect)(patterns[0].type).toBe('periodicity');
            (0, globals_1.expect)(patterns[0].metadata.actionType).toBe('LOGIN');
            (0, globals_1.expect)(patterns[0].metadata.intervalSeconds).toBeCloseTo(3600);
            (0, globals_1.expect)(patterns[0].confidence).toBeGreaterThan(0.9);
        });
        (0, globals_1.it)('should ignore irregular patterns', () => {
            const now = new Date();
            const events = [
                createEvent(new Date(now.getTime()), 'RANDOM'),
                createEvent(new Date(now.getTime() + 1000), 'RANDOM'), // +1s
                createEvent(new Date(now.getTime() + 50000), 'RANDOM'), // +49s
                createEvent(new Date(now.getTime() + 51000), 'RANDOM'), // +1s
            ];
            const patterns = service.detectPeriodicity(events);
            (0, globals_1.expect)(patterns).toHaveLength(0);
        });
        (0, globals_1.it)('should handle multiple event types', () => {
            const now = new Date();
            const events = [];
            // LOGIN every hour
            for (let i = 0; i < 5; i++) {
                events.push(createEvent(new Date(now.getTime() + i * 3600 * 1000), 'LOGIN'));
            }
            // LOGOUT every hour (offset by 30 mins)
            for (let i = 0; i < 5; i++) {
                events.push(createEvent(new Date(now.getTime() + i * 3600 * 1000 + 1800 * 1000), 'LOGOUT'));
            }
            const patterns = service.detectPeriodicity(events);
            (0, globals_1.expect)(patterns).toHaveLength(2);
            const loginPattern = patterns.find(p => p.metadata.actionType === 'LOGIN');
            const logoutPattern = patterns.find(p => p.metadata.actionType === 'LOGOUT');
            (0, globals_1.expect)(loginPattern).toBeDefined();
            (0, globals_1.expect)(logoutPattern).toBeDefined();
        });
    });
    (0, globals_1.describe)('detectSequences', () => {
        (0, globals_1.it)('should detect repeated sequences', () => {
            const now = new Date();
            const events = [];
            // Pattern: A -> B -> C repeated 3 times
            const seq = ['A', 'B', 'C'];
            for (let i = 0; i < 3; i++) {
                seq.forEach((action, idx) => {
                    events.push(createEvent(new Date(now.getTime() + i * 10000 + idx * 1000), action));
                });
            }
            // Add some noise
            events.push(createEvent(new Date(now.getTime() + 40000), 'D'));
            const patterns = service.detectSequences(events);
            // Should detect 'A|B', 'B|C', 'A|B|C' at least
            const fullSeq = patterns.find(p => p.metadata.sequence.join('|') === 'A|B|C');
            (0, globals_1.expect)(fullSeq).toBeDefined();
            (0, globals_1.expect)(fullSeq?.metadata.occurrenceCount).toBe(3);
        });
    });
    (0, globals_1.describe)('detectTimeDistribution', () => {
        (0, globals_1.it)('should identify active hours', () => {
            const events = [];
            // All events at 10 AM on different days
            for (let i = 0; i < 10; i++) {
                const d = new Date('2023-01-01T10:00:00Z');
                d.setDate(d.getDate() + i);
                events.push(createEvent(d, 'WORK'));
            }
            const patterns = service.detectTimeDistribution(events);
            const expectedHour = new Date('2023-01-01T10:00:00Z').getHours();
            (0, globals_1.expect)(patterns).toHaveLength(1);
            (0, globals_1.expect)(patterns[0].metadata.activeHours).toContain(expectedHour);
        });
    });
});
