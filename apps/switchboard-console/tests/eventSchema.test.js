"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const eventSchema_1 = require("../src/logging/eventSchema");
(0, vitest_1.describe)('event schema validation', () => {
    (0, vitest_1.it)('accepts valid event records', () => {
        const record = {
            id: 'event-1',
            type: 'session_start',
            timestamp: new Date().toISOString(),
            sessionId: 'session-1',
            data: { resume: false },
        };
        (0, vitest_1.expect)((0, eventSchema_1.validateEventRecord)(record)).toBe(true);
    });
    (0, vitest_1.it)('rejects invalid event types', () => {
        const record = {
            id: 'event-2',
            type: 'unknown',
            timestamp: new Date().toISOString(),
            sessionId: 'session-2',
            data: {},
        };
        (0, vitest_1.expect)((0, eventSchema_1.validateEventRecord)(record)).toBe(false);
    });
});
