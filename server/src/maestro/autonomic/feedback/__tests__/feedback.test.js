"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const feedback_service_js_1 = require("../feedback-service.js");
(0, globals_1.describe)('FeedbackService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new feedback_service_js_1.FeedbackService();
    });
    (0, globals_1.it)('should calculate summary stats correctly', () => {
        service.ingestFeedback({
            source: 'USER',
            type: 'RATING_1_5',
            value: 5,
            target: { agentId: 'gpt-4' },
            tenantId: 't1'
        });
        service.ingestFeedback({
            source: 'USER',
            type: 'RATING_1_5',
            value: 3,
            target: { agentId: 'gpt-4' },
            tenantId: 't1'
        });
        service.ingestFeedback({
            source: 'USER',
            type: 'THUMBS',
            value: true,
            target: { agentId: 'gpt-4' },
            tenantId: 't1'
        });
        const summary = service.getAgentSummary('gpt-4');
        (0, globals_1.expect)(summary.avgRating).toBe(4); // (5+3)/2
        (0, globals_1.expect)(summary.positiveRate).toBe(1.0); // 1/1
        (0, globals_1.expect)(summary.sampleSize).toBe(3);
    });
});
