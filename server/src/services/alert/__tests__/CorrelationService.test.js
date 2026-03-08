"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const CorrelationService_js_1 = require("../CorrelationService.js");
(0, globals_1.describe)('CorrelationService', () => {
    let correlationService;
    (0, globals_1.beforeEach)(() => {
        correlationService = new CorrelationService_js_1.CorrelationService(5000); // 5 seconds window
    });
    (0, globals_1.it)('should group events by entity key', () => {
        const events = [
            { id: '1', ruleId: 'r1', metric: 'm1', value: 10, threshold: 5, message: 'm', timestamp: 1000, entities: ['e1'], attributes: {} },
            { id: '2', ruleId: 'r2', metric: 'm2', value: 20, threshold: 5, message: 'm', timestamp: 2000, entities: ['e1'], attributes: {} },
            { id: '3', ruleId: 'r3', metric: 'm3', value: 30, threshold: 5, message: 'm', timestamp: 3000, entities: ['e2'], attributes: {} },
        ];
        const incidents = correlationService.correlate(events);
        // Should have 2 incidents: one for e1 (2 events), one for e2 (1 event)
        (0, globals_1.expect)(incidents.length).toBe(2);
        const e1Incident = incidents.find(i => i.key === 'e1');
        (0, globals_1.expect)(e1Incident).toBeDefined();
        (0, globals_1.expect)(e1Incident.events.length).toBe(2);
        (0, globals_1.expect)(e1Incident.severity).toBe('medium');
        const e2Incident = incidents.find(i => i.key === 'e2');
        (0, globals_1.expect)(e2Incident).toBeDefined();
        (0, globals_1.expect)(e2Incident.events.length).toBe(1);
        (0, globals_1.expect)(e2Incident.severity).toBe('low');
    });
    (0, globals_1.it)('should split incidents based on time window', () => {
        const events = [
            { id: '1', ruleId: 'r1', metric: 'm1', value: 10, threshold: 5, message: 'm', timestamp: 1000, entities: ['e1'], attributes: {} },
            { id: '2', ruleId: 'r2', metric: 'm2', value: 20, threshold: 5, message: 'm', timestamp: 7000, entities: ['e1'], attributes: {} }, // 6s later
        ];
        const incidents = correlationService.correlate(events);
        // Should have 2 incidents because the second event is outside the 5s window of the first
        (0, globals_1.expect)(incidents.length).toBe(2);
        (0, globals_1.expect)(incidents[0].events[0].id).toBe('1');
        (0, globals_1.expect)(incidents[1].events[0].id).toBe('2');
    });
    (0, globals_1.it)('should promote severity based on event count', () => {
        const events = [];
        for (let i = 0; i < 5; i++) {
            events.push({
                id: `${i}`,
                ruleId: 'r1',
                metric: 'm1',
                value: 10,
                threshold: 5,
                message: 'm',
                timestamp: 1000 + i * 100,
                entities: ['critical-entity'],
                attributes: {}
            });
        }
        const incidents = correlationService.correlate(events);
        (0, globals_1.expect)(incidents.length).toBe(1);
        (0, globals_1.expect)(incidents[0].severity).toBe('critical');
    });
});
