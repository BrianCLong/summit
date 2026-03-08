"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ai_grounding_js_1 = require("../src/gates/ai_grounding.js");
describe('AI Upgrade Grounding Gate', () => {
    it('should pass if all recommendations resolve', async () => {
        const recs = [
            { name: 'react', version: '18.0.0', ecosystem: 'npm' }
        ];
        // Mock resolver that always returns true
        const result = await (0, ai_grounding_js_1.evaluateAIGrounding)(recs, async () => true);
        expect(result.ok).toBe(true);
        expect(result.findings).toHaveLength(0);
    });
    it('should fail if a recommendation does not resolve', async () => {
        const recs = [
            { name: 'fake-package', version: '1.0.0', ecosystem: 'npm' }
        ];
        // Mock resolver that returns false
        const result = await (0, ai_grounding_js_1.evaluateAIGrounding)(recs, async () => false);
        expect(result.ok).toBe(false);
        expect(result.findings).toContain('Unresolvable recommendation: npm:fake-package@1.0.0');
    });
});
