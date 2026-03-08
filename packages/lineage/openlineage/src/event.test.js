"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const event_js_1 = require("./event.js");
const validate_js_1 = require("./validate.js");
(0, vitest_1.describe)('OpenLineageClient', () => {
    (0, vitest_1.it)('should create a valid event', () => {
        const client = new event_js_1.OpenLineageClient('http://producer.com');
        const event = client.createRunEvent({
            eventType: 'START',
            job: { namespace: 'ns', name: 'job' },
            runId: '123e4567-e89b-12d3-a456-426614174000'
        });
        (0, vitest_1.expect)(event.eventType).toBe('START');
        (0, vitest_1.expect)(event.run.runId).toBe('123e4567-e89b-12d3-a456-426614174000');
        const result = (0, validate_js_1.validateEvent)(event);
        (0, vitest_1.expect)(result.success).toBe(true);
    });
});
