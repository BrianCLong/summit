"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IntelCorroborationService_1 = require("../../src/services/IntelCorroborationService");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('IntelCorroborationService', () => {
    (0, globals_1.test)('computes confidence with evidence and analyst ratings', () => {
        const service = new IntelCorroborationService_1.IntelCorroborationService();
        const now = Date.now();
        const evidence = [
            { source: 'sourceA', timestamp: now, trust: 0.9, supports: true },
            { source: 'sourceB', timestamp: now, trust: 0.8, supports: true },
            { source: 'sourceC', timestamp: now, trust: 0.6, supports: false },
        ];
        service.addAnalystRating('claim1', 0.8);
        service.addAnalystRating('claim1', 0.6);
        const result = service.evaluateClaim('claim1', evidence);
        (0, globals_1.expect)(result.corroboratedBy).toEqual(['sourceA', 'sourceB']);
        (0, globals_1.expect)(result.disputedBy).toEqual(['sourceC']);
        (0, globals_1.expect)(result.confidenceScore).toBeCloseTo(0.72, 2);
    });
});
