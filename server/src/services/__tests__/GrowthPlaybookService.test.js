"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const GrowthPlaybookService_js_1 = require("../GrowthPlaybookService.js");
(0, globals_1.describe)('GrowthPlaybookService', () => {
    (0, globals_1.it)('generates a playbook', async () => {
        const service = new GrowthPlaybookService_js_1.GrowthPlaybookService();
        globals_1.jest.spyOn(service.llm, 'complete').mockResolvedValue({
            content: JSON.stringify({
                title: 'Test Playbook',
                summary: 'Test Summary',
                score: 90,
                strengths: ['Strength 1'],
                weaknesses: ['Weakness 1'],
                strategic_initiatives: [],
                tactical_actions: [],
            }),
            usage: { total_tokens: 100 },
        });
        const profile = {
            name: 'Acme Corp',
            industry: 'Tech',
            stage: 'growth',
            employees: 50,
            revenue: 5000000,
            challenges: ['Scale'],
            goals: ['IPO'],
        };
        const result = await service.generatePlaybook(profile);
        (0, globals_1.expect)(result).toBeDefined();
        (0, globals_1.expect)(result.title).toBe('Test Playbook');
        (0, globals_1.expect)(result.score).toBe(90);
    });
});
