"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const SuppressionService_js_1 = require("../SuppressionService.js");
(0, globals_1.describe)('SuppressionService', () => {
    let suppressionService;
    (0, globals_1.beforeEach)(() => {
        suppressionService = new SuppressionService_js_1.SuppressionService();
    });
    (0, globals_1.it)('should suppress alerts within the window', () => {
        const rule = {
            id: 's1',
            startTime: 1000,
            endTime: 2000,
            reason: 'test',
            createdBy: 'user',
        };
        suppressionService.addRule(rule);
        (0, globals_1.expect)(suppressionService.isSuppressed('r1', 'e1', 1500)).toBe(true);
        (0, globals_1.expect)(suppressionService.isSuppressed('r1', 'e1', 900)).toBe(false);
        (0, globals_1.expect)(suppressionService.isSuppressed('r1', 'e1', 2100)).toBe(false);
    });
    (0, globals_1.it)('should suppress based on ruleId', () => {
        const rule = {
            id: 's1',
            targetRuleId: 'target-rule',
            startTime: 1000,
            endTime: 2000,
            reason: 'test',
            createdBy: 'user',
        };
        suppressionService.addRule(rule);
        (0, globals_1.expect)(suppressionService.isSuppressed('target-rule', 'e1', 1500)).toBe(true);
        (0, globals_1.expect)(suppressionService.isSuppressed('other-rule', 'e1', 1500)).toBe(false);
    });
    (0, globals_1.it)('should suppress based on entityKey', () => {
        const rule = {
            id: 's1',
            targetEntityKey: 'target-entity',
            startTime: 1000,
            endTime: 2000,
            reason: 'test',
            createdBy: 'user',
        };
        suppressionService.addRule(rule);
        (0, globals_1.expect)(suppressionService.isSuppressed('r1', 'target-entity', 1500)).toBe(true);
        (0, globals_1.expect)(suppressionService.isSuppressed('r1', 'other-entity', 1500)).toBe(false);
    });
});
