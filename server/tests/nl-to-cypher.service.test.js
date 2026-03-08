"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const nl_to_cypher_service_1 = require("../src/ai/nl-to-cypher/nl-to-cypher.service");
const globals_1 = require("@jest/globals");
class MockAdapter {
    async generate(prompt) {
        return `generated: ${prompt}`;
    }
}
(0, globals_1.describe)('NlToCypherService', () => {
    (0, globals_1.it)('translates known prompts', async () => {
        const service = new nl_to_cypher_service_1.NlToCypherService(new MockAdapter());
        await (0, globals_1.expect)(service.translate('show all nodes')).resolves.toBe('MATCH (n) RETURN n LIMIT 25');
    });
    (0, globals_1.it)('falls back to model adapter', async () => {
        const service = new nl_to_cypher_service_1.NlToCypherService(new MockAdapter());
        await (0, globals_1.expect)(service.translate('unknown')).resolves.toBe('generated: unknown');
    });
});
