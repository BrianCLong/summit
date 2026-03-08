"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const translator_1 = require("../../src/services/nlq/translator");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('NLQTranslator', () => {
    (0, globals_1.it)('translates person queries with tenant scoping', async () => {
        const res = await translator_1.translator.translate('Show all people', 't1');
        (0, globals_1.expect)(res.cypher).toContain('MATCH (n:Person)');
        (0, globals_1.expect)(res.cypher).toContain('n.tenantId = $tenantId');
        (0, globals_1.expect)(res.params.tenantId).toBe('t1');
    });
});
