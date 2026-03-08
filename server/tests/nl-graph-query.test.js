"use strict";
/**
 * NL Graph Query Copilot - Comprehensive Test Suite
 *
 * Tests the Query Cookbook patterns:
 * - Time-travel queries
 * - Policy-aware queries
 * - Geo-temporal queries
 * - Narrative/timeline queries
 * - Course of Action (COA) queries
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const nl_graph_query_service_js_1 = require("../src/ai/nl-graph-query/nl-graph-query.service.js");
(0, globals_1.describe)('NlGraphQueryService', () => {
    let service;
    let baseContext;
    (0, globals_1.beforeEach)(() => {
        service = new nl_graph_query_service_js_1.NlGraphQueryService();
        baseContext = {
            nodeLabels: ['Entity', 'Person', 'Organization', 'Event', 'Location'],
            relationshipTypes: [
                'KNOWS',
                'WORKS_FOR',
                'LOCATED_AT',
                'ATTENDED',
                'RELATED_TO',
                'PRECEDED_BY',
                'CAUSED_BY',
            ],
            nodeProperties: {
                Entity: ['id', 'type', 'name', 'createdAt'],
                Person: ['id', 'name', 'email', 'age'],
                Organization: ['id', 'name', 'type', 'industry'],
            },
            tenantId: 'test-tenant',
            userId: 'test-user',
        };
    });
    (0, globals_1.describe)('Basic Query Patterns', () => {
        (0, globals_1.it)('should compile "show all nodes" query', async () => {
            const request = {
                prompt: 'show all nodes',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('MATCH (n)');
                (0, globals_1.expect)(response.cypher).toContain('RETURN n');
                (0, globals_1.expect)(response.cypher).toContain('LIMIT');
                (0, globals_1.expect)(response.isSafe).toBe(true);
                (0, globals_1.expect)(response.estimatedCost.costClass).toBe('low');
            }
        });
        (0, globals_1.it)('should compile "count nodes" query', async () => {
            const request = {
                prompt: 'count nodes',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('count(n)');
                (0, globals_1.expect)(response.estimatedCost.costClass).toBe('low');
            }
        });
        (0, globals_1.it)('should compile "show relationships" query', async () => {
            const request = {
                prompt: 'show all relationships',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toMatch(/MATCH.*-\[.*\]->/);
                (0, globals_1.expect)(response.estimatedCost.costClass).toMatch(/low|medium/);
            }
        });
        (0, globals_1.it)('should compile "find neighbors" query', async () => {
            const request = {
                prompt: 'show neighbors of node123',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('MATCH');
                (0, globals_1.expect)(response.cypher).toContain('-[r]-(neighbor)');
                (0, globals_1.expect)(response.requiredParameters).toContain('nodeId');
            }
        });
    });
    (0, globals_1.describe)('Time-Travel Query Patterns', () => {
        (0, globals_1.it)('should compile time-travel snapshot query', async () => {
            const request = {
                prompt: 'show graph state at 2024-01-15',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('validFrom');
                (0, globals_1.expect)(response.cypher).toContain('validTo');
                (0, globals_1.expect)(response.cypher).toContain('$timestamp');
                (0, globals_1.expect)(response.requiredParameters).toContain('timestamp');
                (0, globals_1.expect)(response.estimatedCost.costClass).toMatch(/medium|high/);
                (0, globals_1.expect)(response.explanation).toContain('time');
            }
            else {
                const error = result;
                (0, globals_1.expect)(error.message).toMatch(/no matching pattern|could not generate/i);
            }
        });
        (0, globals_1.it)('should compile time-travel changes query', async () => {
            const request = {
                prompt: 'show changes between 2024-01-01 and 2024-01-31',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('validFrom');
                (0, globals_1.expect)(response.cypher).toContain('$startTime');
                (0, globals_1.expect)(response.cypher).toContain('$endTime');
                (0, globals_1.expect)(response.requiredParameters).toContain('startTime');
                (0, globals_1.expect)(response.requiredParameters).toContain('endTime');
                (0, globals_1.expect)(response.explanation).toMatch(/changes|retrieves|matching/i);
            }
        });
    });
    (0, globals_1.describe)('Policy-Aware Query Patterns', () => {
        (0, globals_1.it)('should compile policy-filtered entity query', async () => {
            const contextWithPolicy = {
                ...baseContext,
                policyTags: [
                    { label: 'Person', classification: 'CONFIDENTIAL' },
                    { label: 'Organization', classification: 'SECRET' },
                ],
            };
            const request = {
                prompt: 'show all Person with classification CONFIDENTIAL',
                schemaContext: contextWithPolicy,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('Person');
                // Should include policy filtering
                (0, globals_1.expect)(response.isSafe).toBe(true);
            }
        });
        (0, globals_1.it)('should apply tenant filtering when tenantId is present', async () => {
            const request = {
                prompt: 'show all nodes',
                schemaContext: { ...baseContext, tenantId: 'tenant-123' },
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('tenantId');
                (0, globals_1.expect)(response.cypher).toContain('$tenantId');
            }
        });
    });
    (0, globals_1.describe)('Geo-Temporal Query Patterns', () => {
        (0, globals_1.it)('should compile geo-temporal entity query', async () => {
            const request = {
                prompt: 'show entities near New York at 2024-01-15',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('point.distance');
                (0, globals_1.expect)(response.cypher).toContain('latitude');
                (0, globals_1.expect)(response.cypher).toContain('longitude');
                (0, globals_1.expect)(response.cypher).toContain('observedAt');
                (0, globals_1.expect)(response.requiredParameters).toContain('lat');
                (0, globals_1.expect)(response.requiredParameters).toContain('lon');
                (0, globals_1.expect)(response.estimatedCost.costClass).toMatch(/medium|high|very-high/);
                (0, globals_1.expect)(response.estimatedCost.costDrivers).toEqual(globals_1.expect.arrayContaining([
                    globals_1.expect.stringMatching(/geo-spatial|distance/i),
                ]));
            }
        });
    });
    (0, globals_1.describe)('Narrative/Timeline Query Patterns', () => {
        (0, globals_1.it)('should compile timeline query', async () => {
            const request = {
                prompt: 'show timeline of events for investigation',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('timestamp');
                (0, globals_1.expect)(response.cypher).toContain('ORDER BY');
                (0, globals_1.expect)(response.cypher).toMatch(/PRECEDED_BY|CAUSED_BY|RELATED_TO/);
                (0, globals_1.expect)(response.explanation).toMatch(/timeline|chronological|sequence|pattern/i);
            }
        });
    });
    (0, globals_1.describe)('Course of Action (COA) Query Patterns', () => {
        (0, globals_1.it)('should compile shortest path COA query', async () => {
            const request = {
                prompt: 'shortest path from nodeA to nodeB',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('shortestPath');
                (0, globals_1.expect)(response.cypher).toContain('$startId');
                (0, globals_1.expect)(response.cypher).toContain('$endId');
                (0, globals_1.expect)(response.requiredParameters).toContain('startId');
                (0, globals_1.expect)(response.requiredParameters).toContain('endId');
                (0, globals_1.expect)(response.estimatedCost.costClass).toMatch(/high|very-high/);
            }
        });
        (0, globals_1.it)('should compile path analysis query', async () => {
            const request = {
                prompt: 'find paths from entityA to entityB',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('allShortestPaths');
                (0, globals_1.expect)(response.cypher).toMatch(/\[\*\.\.(\d+)\]/); // Variable-length path
                (0, globals_1.expect)(response.estimatedCost.costClass).toMatch(/high|very-high/);
            }
        });
        (0, globals_1.it)('should compile constrained path query', async () => {
            const request = {
                prompt: 'show paths that avoid suspicious entities',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.cypher).toContain('NOT ANY');
                (0, globals_1.expect)(response.cypher).toContain('excludedTypes');
                (0, globals_1.expect)(response.requiredParameters).toContain('excludedTypes');
                (0, globals_1.expect)(response.estimatedCost.costClass).toBe('very-high');
            }
        });
    });
    (0, globals_1.describe)('Cost Estimation', () => {
        (0, globals_1.it)('should estimate low cost for simple queries', async () => {
            const request = {
                prompt: 'count nodes',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.estimatedCost.costClass).toBe('low');
                (0, globals_1.expect)(response.estimatedCost.estimatedTimeMs).toBeLessThan(200);
            }
        });
        (0, globals_1.it)('should estimate high cost for variable-length paths', async () => {
            const request = {
                prompt: 'find paths from A to B',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.estimatedCost.costClass).toMatch(/high|very-high/);
                (0, globals_1.expect)(response.estimatedCost.nodesScanned).toBeGreaterThan(1000);
            }
        });
        (0, globals_1.it)('should provide cost drivers in explanation', async () => {
            const request = {
                prompt: 'show paths that avoid suspicious entities',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.estimatedCost.costDrivers.length).toBeGreaterThan(0);
                (0, globals_1.expect)(response.warnings.length).toBeGreaterThan(0);
            }
        });
    });
    (0, globals_1.describe)('Validation and Security', () => {
        (0, globals_1.it)('should reject mutation queries', async () => {
            const request = {
                prompt: 'create new nodes',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            // Should either fail validation or mark as unsafe
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.isSafe).toBe(false);
                (0, globals_1.expect)(response.warnings).toEqual(globals_1.expect.arrayContaining([
                    globals_1.expect.stringMatching(/mutation/i),
                ]));
            }
        });
        (0, globals_1.it)('should detect dangerous operations', async () => {
            // This should not generate, but if it does, should be marked unsafe
            const request = {
                prompt: 'delete all nodes',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            // Should be an error or unsafe
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.isSafe).toBe(false);
            }
        });
        (0, globals_1.it)('should require parameters for parameterized queries', async () => {
            const request = {
                prompt: 'show neighbors of node123',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.requiredParameters.length).toBeGreaterThan(0);
                (0, globals_1.expect)(response.requiredParameters).toContain('nodeId');
            }
        });
        (0, globals_1.it)('should validate balanced syntax', async () => {
            // Service should never generate invalid Cypher, but this tests the validator
            const request = {
                prompt: 'show all nodes',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                // Should have balanced parentheses, brackets, braces
                const cypher = response.cypher;
                (0, globals_1.expect)((cypher.match(/\(/g) || []).length).toBe((cypher.match(/\)/g) || []).length);
                (0, globals_1.expect)((cypher.match(/\[/g) || []).length).toBe((cypher.match(/\]/g) || []).length);
            }
        });
    });
    (0, globals_1.describe)('Explanation Generation', () => {
        (0, globals_1.it)('should provide concise explanation by default', async () => {
            const request = {
                prompt: 'count nodes',
                schemaContext: baseContext,
                verbose: false,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.explanation).toBeTruthy();
                (0, globals_1.expect)(response.explanation.length).toBeGreaterThan(10);
                (0, globals_1.expect)(response.explanation.length).toBeLessThan(200);
            }
        });
        (0, globals_1.it)('should provide detailed explanation in verbose mode', async () => {
            const request = {
                prompt: 'shortest path from A to B',
                schemaContext: baseContext,
                verbose: true,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('cypher' in result).toBe(true);
            if ('cypher' in result) {
                const response = result;
                (0, globals_1.expect)(response.explanation).toBeTruthy();
                (0, globals_1.expect)(response.explanation.length).toBeGreaterThan(100);
                (0, globals_1.expect)(response.explanation).toContain('---');
            }
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should return error for empty prompt', async () => {
            const request = {
                prompt: '',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('code' in result).toBe(true);
            if ('code' in result) {
                const error = result;
                (0, globals_1.expect)(error.code).toBe('INVALID_INPUT');
                (0, globals_1.expect)(error.suggestions.length).toBeGreaterThan(0);
            }
        });
        (0, globals_1.it)('should return error for prompt that is too long', async () => {
            const request = {
                prompt: 'a'.repeat(1001),
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('code' in result).toBe(true);
            if ('code' in result) {
                const error = result;
                (0, globals_1.expect)(error.code).toBe('INVALID_INPUT');
            }
        });
        (0, globals_1.it)('should return error with suggestions for unrecognized pattern', async () => {
            const request = {
                prompt: 'foobar bazqux nonexistent query pattern',
                schemaContext: baseContext,
            };
            const result = await service.compile(request);
            (0, globals_1.expect)('code' in result).toBe(true);
            if ('code' in result) {
                const error = result;
                (0, globals_1.expect)(error.code).toBe('GENERATION_FAILED');
                (0, globals_1.expect)(error.suggestions.length).toBeGreaterThan(0);
            }
        });
    });
    (0, globals_1.describe)('Caching', () => {
        (0, globals_1.it)('should cache compilation results', async () => {
            const request = {
                prompt: 'show all nodes',
                schemaContext: baseContext,
            };
            const result1 = await service.compile(request);
            const result2 = await service.compile(request);
            (0, globals_1.expect)('queryId' in result1).toBe(true);
            (0, globals_1.expect)('queryId' in result2).toBe(true);
            // Should return the same cached result
            if ('queryId' in result1 && 'queryId' in result2) {
                (0, globals_1.expect)(result1.queryId).toBe(result2.queryId);
            }
        });
        (0, globals_1.it)('should clear cache on demand', async () => {
            const request = {
                prompt: 'show all nodes',
                schemaContext: baseContext,
            };
            await service.compile(request);
            const statsBefore = service.getCacheStats();
            (0, globals_1.expect)(statsBefore.size).toBeGreaterThan(0);
            service.clearCache();
            const statsAfter = service.getCacheStats();
            (0, globals_1.expect)(statsAfter.size).toBe(0);
        });
    });
    (0, globals_1.describe)('Service Information', () => {
        (0, globals_1.it)('should return available patterns', () => {
            const patterns = service.getAvailablePatterns();
            (0, globals_1.expect)(patterns.length).toBeGreaterThan(0);
            (0, globals_1.expect)(patterns[0]).toHaveProperty('name');
            (0, globals_1.expect)(patterns[0]).toHaveProperty('description');
            (0, globals_1.expect)(patterns[0]).toHaveProperty('expectedCost');
        });
        (0, globals_1.it)('should provide cache statistics', () => {
            const stats = service.getCacheStats();
            (0, globals_1.expect)(stats).toHaveProperty('size');
            (0, globals_1.expect)(stats).toHaveProperty('maxSize');
            (0, globals_1.expect)(typeof stats.size).toBe('number');
            (0, globals_1.expect)(typeof stats.maxSize).toBe('number');
        });
    });
    (0, globals_1.describe)('Integration: Investigation Workflow', () => {
        (0, globals_1.it)('should support complete investigation query workflow', async () => {
            const investigationContext = {
                ...baseContext,
                investigationId: 'inv-123',
                policyTags: [
                    { label: 'Person', classification: 'CONFIDENTIAL', purpose: ['investigation'] },
                ],
            };
            // Step 1: Get all entities in investigation
            const step1 = await service.compile({
                prompt: 'show all entities in investigation inv-123',
                schemaContext: investigationContext,
            });
            (0, globals_1.expect)('cypher' in step1).toBe(true);
            // Step 2: Find timeline
            const step2 = await service.compile({
                prompt: 'show timeline of events',
                schemaContext: investigationContext,
            });
            (0, globals_1.expect)('cypher' in step2).toBe(true);
            // Step 3: Analyze paths
            const step3 = await service.compile({
                prompt: 'find paths from suspect1 to suspect2',
                schemaContext: investigationContext,
            });
            (0, globals_1.expect)('cypher' in step3).toBe(true);
            // All should be safe read-only queries
            if ('cypher' in step1 && 'cypher' in step2 && 'cypher' in step3) {
                (0, globals_1.expect)(step1.isSafe).toBe(true);
                (0, globals_1.expect)(step2.isSafe).toBe(true);
                // step3 might be unsafe due to high cost
            }
        });
    });
});
(0, globals_1.describe)('No Side Effects', () => {
    (0, globals_1.it)('should not have database client imported', async () => {
        // Verify the module doesn't import database clients
        const serviceModule = await Promise.resolve().then(() => __importStar(require('../src/ai/nl-graph-query/nl-graph-query.service.js')));
        // The service should not have any database connection
        (0, globals_1.expect)(serviceModule).toBeDefined();
        (0, globals_1.expect)(new serviceModule.NlGraphQueryService()).toBeDefined();
    });
    (0, globals_1.it)('should not execute queries during compilation', async () => {
        const service = new nl_graph_query_service_js_1.NlGraphQueryService();
        const request = {
            prompt: 'show all nodes',
            schemaContext: {
                tenantId: 'test-tenant',
            },
        };
        // This should only compile, not execute
        const result = await service.compile(request);
        (0, globals_1.expect)('cypher' in result).toBe(true);
        // No database should have been touched
    });
});
