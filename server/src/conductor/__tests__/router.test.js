"use strict";
// Tests for MoE Router
// Comprehensive test suite for routing decisions and feature extraction
Object.defineProperty(exports, "__esModule", { value: true });
const router_js_1 = require("../router.js");
const globals_1 = require("@jest/globals");
(0, globals_1.describe)('MoERouter', () => {
    let router;
    (0, globals_1.beforeEach)(() => {
        router = new router_js_1.MoERouter();
    });
    (0, globals_1.describe)('route', () => {
        (0, globals_1.test)('routes graph tasks to GRAPH_TOOL', () => {
            const input = {
                task: 'Run Cypher: MATCH (n)-[r]->(m) RETURN count(*)',
                sensitivity: 'low',
                maxLatencyMs: 4000,
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('GRAPH_TOOL');
            (0, globals_1.expect)(decision.reason).toContain('graph-related keywords');
            (0, globals_1.expect)(decision.confidence).toBeGreaterThan(0.5);
        });
        (0, globals_1.test)('routes file operations to FILES_TOOL', () => {
            const input = {
                task: "Search for files containing 'classified' in /documents",
                sensitivity: 'low',
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('FILES_TOOL');
            (0, globals_1.expect)(decision.reason).toContain('file operations required');
        });
        (0, globals_1.test)('routes OSINT tasks to OSINT_TOOL', () => {
            const input = {
                task: 'Search web for threat intelligence on domain example.com',
                sensitivity: 'low',
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('OSINT_TOOL');
            (0, globals_1.expect)(decision.reason).toContain('OSINT/web research');
        });
        (0, globals_1.test)('routes export requests to EXPORT_TOOL', () => {
            const input = {
                task: 'Generate PDF report for investigation case-123',
                sensitivity: 'low',
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('EXPORT_TOOL');
            (0, globals_1.expect)(decision.reason).toContain('export/report generation');
        });
        (0, globals_1.test)('routes simple queries to LLM_LIGHT for speed', () => {
            const input = {
                task: 'What is the capital of France?',
                sensitivity: 'low',
                maxLatencyMs: 1000,
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('LLM_LIGHT');
            (0, globals_1.expect)(decision.reason).toContain('tight latency');
        });
        (0, globals_1.test)('routes complex queries to LLM_HEAVY', () => {
            const input = {
                task: 'Analyze the legal implications of cross-border data sharing in intelligence operations, considering GDPR compliance, national security exemptions, and bilateral intelligence agreements. Provide a comprehensive framework for risk assessment and mitigation strategies for a multi-jurisdictional investigation involving sensitive personal data.',
                sensitivity: 'low',
                maxLatencyMs: 10000,
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('LLM_HEAVY');
            (0, globals_1.expect)(decision.reason).toContain('complex');
        });
        (0, globals_1.test)('routes investigation context queries to RAG_TOOL', () => {
            const input = {
                task: 'What connections exist between entity A and entity B?',
                sensitivity: 'low',
                investigationId: 'inv-123',
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('RAG_TOOL');
            (0, globals_1.expect)(decision.reason).toContain('investigation context');
        });
        (0, globals_1.test)('falls back to LLM_LIGHT when no specific tool matches', () => {
            const input = {
                task: 'Random question without specific keywords',
                sensitivity: 'low',
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('LLM_LIGHT');
            (0, globals_1.expect)(decision.reason).toContain('Fallback');
        });
    });
    (0, globals_1.describe)('feature extraction', () => {
        (0, globals_1.test)('detects graph keywords correctly', () => {
            const inputs = [
                'Execute cypher query',
                'Find pagerank scores',
                'Calculate betweenness centrality',
                'Show shortest path between nodes',
                'Return all relationships',
            ];
            inputs.forEach((task) => {
                const decision = router.route({ task, sensitivity: 'low' });
                (0, globals_1.expect)(decision.features.hasGraphKeywords).toBe(true);
            });
        });
        (0, globals_1.test)('detects file keywords correctly', () => {
            const inputs = [
                'Read document file',
                'Upload PDF attachment',
                'Search files for keyword',
                'Download CSV data',
            ];
            inputs.forEach((task) => {
                const decision = router.route({ task, sensitivity: 'low' });
                (0, globals_1.expect)(decision.features.hasFileKeywords).toBe(true);
            });
        });
        (0, globals_1.test)('detects OSINT keywords correctly', () => {
            const inputs = [
                'Search web for information',
                'Fetch URL content',
                'Scrape social media',
                'Check domain whois',
            ];
            inputs.forEach((task) => {
                const decision = router.route({ task, sensitivity: 'low' });
                (0, globals_1.expect)(decision.features.hasOSINTKeywords).toBe(true);
            });
        });
        (0, globals_1.test)('calculates complexity score correctly', () => {
            const simpleTask = 'Hello';
            const complexTask = 'Analyze comprehensive forensic investigation legal policy regulatory framework advanced multi-step detailed complex deep';
            const simpleDecision = router.route({
                task: simpleTask,
                sensitivity: 'low',
            });
            const complexDecision = router.route({
                task: complexTask,
                sensitivity: 'low',
            });
            (0, globals_1.expect)(simpleDecision.features.complexityScore).toBeLessThan(complexDecision.features.complexityScore);
            (0, globals_1.expect)(complexDecision.features.complexityScore).toBeGreaterThan(5);
        });
    });
    (0, globals_1.describe)('security constraints', () => {
        (0, globals_1.test)('respects sensitivity levels in routing', () => {
            const secretInput = {
                task: 'Process classified intelligence data',
                sensitivity: 'secret',
            };
            const decision = router.route(secretInput);
            (0, globals_1.expect)(decision.features.sensitivityLevel).toBe('secret');
        });
        (0, globals_1.test)('considers user context in routing', () => {
            const input = {
                task: 'Administrative query',
                sensitivity: 'low',
                userContext: {
                    role: 'admin',
                    scopes: ['graph:read', 'files:read'],
                },
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.features.userRole).toBe('admin');
        });
    });
    (0, globals_1.describe)('routing statistics', () => {
        (0, globals_1.test)('tracks routing decisions', () => {
            const inputs = [
                { task: 'MATCH (n) RETURN n', sensitivity: 'low' },
                { task: 'Search files', sensitivity: 'low' },
                { task: 'Simple question', sensitivity: 'low' },
            ];
            inputs.forEach((input) => router.route(input));
            const stats = router.getRoutingStats();
            (0, globals_1.expect)(stats.totalDecisions).toBe(3);
            (0, globals_1.expect)(Object.keys(stats.expertDistribution)).toContain('GRAPH_TOOL');
            (0, globals_1.expect)(Object.keys(stats.expertDistribution)).toContain('FILES_TOOL');
        });
        (0, globals_1.test)('calculates average confidence correctly', () => {
            const input = {
                task: 'MATCH (n) RETURN count(n)',
                sensitivity: 'low',
            };
            router.route(input);
            router.route(input);
            const stats = router.getRoutingStats();
            (0, globals_1.expect)(stats.avgConfidence).toBeGreaterThan(0);
            (0, globals_1.expect)(stats.avgConfidence).toBeLessThanOrEqual(1);
        });
    });
    (0, globals_1.describe)('edge cases', () => {
        (0, globals_1.test)('handles empty task', () => {
            const input = {
                task: '',
                sensitivity: 'low',
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBeDefined();
            (0, globals_1.expect)(decision.reason).toBeDefined();
        });
        (0, globals_1.test)('handles very long tasks', () => {
            const longTask = 'A'.repeat(10000);
            const input = {
                task: longTask,
                sensitivity: 'low',
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('LLM_HEAVY'); // Should route to heavy model
            (0, globals_1.expect)(decision.features.taskLength).toBe(10000);
        });
        (0, globals_1.test)('handles tight latency constraints', () => {
            const input = {
                task: 'Complex analysis that would normally go to heavy model',
                sensitivity: 'low',
                maxLatencyMs: 500,
            };
            const decision = router.route(input);
            (0, globals_1.expect)(decision.expert).toBe('LLM_LIGHT'); // Should prefer speed
        });
        (0, globals_1.test)('handles multiple keyword matches', () => {
            const input = {
                task: 'Search files for cypher queries and export results to PDF',
                sensitivity: 'low',
            };
            const decision = router.route(input);
            // Should pick the first matching expert (in priority order)
            (0, globals_1.expect)(['GRAPH_TOOL', 'FILES_TOOL', 'EXPORT_TOOL']).toContain(decision.expert);
            (0, globals_1.expect)(decision.alternatives.length).toBeGreaterThan(0);
        });
    });
});
