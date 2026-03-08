"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const graphql_1 = require("graphql");
const graphql_hardening_js_1 = require("../graphql-hardening.js");
(0, globals_1.describe)('createGraphQLHardening validation rules', () => {
    const schema = (0, graphql_1.buildSchema)(`
    type Child { value: String, child: Child }
    type Query { root: Child }
  `);
    (0, globals_1.it)('rejects queries that exceed configured depth', () => {
        const hardening = (0, graphql_hardening_js_1.createGraphQLHardening)({ maxDepth: 2, maxComplexity: 100, maxCost: 100 });
        const document = (0, graphql_1.parse)('{ root { child { child { value } } } }');
        const errors = (0, graphql_1.validate)(schema, document, hardening.validationRules);
        (0, globals_1.expect)(errors.some((error) => /depth/i.test(error.message))).toBe(true);
    });
    (0, globals_1.it)('rejects queries that exceed configured complexity', () => {
        const hardening = (0, graphql_hardening_js_1.createGraphQLHardening)({ maxDepth: 10, maxComplexity: 2, maxCost: 100 });
        const document = (0, graphql_1.parse)('{ root { child { value child { value } } } }');
        const errors = (0, graphql_1.validate)(schema, document, hardening.validationRules);
        (0, globals_1.expect)(errors.some((error) => error.message.includes('exceeds maximum allowed complexity'))).toBe(true);
    });
});
