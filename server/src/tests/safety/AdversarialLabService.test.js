"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const AdversarialLabService_js_1 = require("../../services/safety/AdversarialLabService.js");
(0, globals_1.describe)('AdversarialLabService', () => {
    let service;
    (0, globals_1.beforeEach)(() => {
        service = new AdversarialLabService_js_1.AdversarialLabService();
    });
    (0, globals_1.it)('should run drill and detect failure', async () => {
        const results = await service.runPromptInjectionDrill('mock-endpoint');
        (0, globals_1.expect)(results.length).toBeGreaterThan(0);
        // At least one probe should "succeed" in simulation (finding a vulnerability)
        // Based on the mock implementation, the DAN probe returns a "bomb" string which triggers detection.
        const danResult = results.find(r => r.probeName.includes('DAN'));
        (0, globals_1.expect)(danResult?.success).toBe(true);
    });
});
