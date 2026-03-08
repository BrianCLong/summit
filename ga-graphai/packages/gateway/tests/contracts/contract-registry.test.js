"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const openapi_js_1 = require("../../src/contracts/openapi.js");
const registry_js_1 = require("../../src/contracts/registry.js");
const schema_js_1 = require("../../src/graphql/schema.js");
(0, vitest_1.describe)('contract registry and devex guardrails', () => {
    const bundle = (0, registry_js_1.buildContractBundle)({
        openapi: openapi_js_1.gatewayOpenApiContract,
        graphqlSdl: schema_js_1.sdl,
        version: '2025.3.0',
    });
    (0, vitest_1.it)('builds a stable bundle hash from the schema sources', () => {
        const nextBundle = (0, registry_js_1.buildContractBundle)({
            openapi: openapi_js_1.gatewayOpenApiContract,
            graphqlSdl: schema_js_1.sdl,
            version: '2025.3.0',
        });
        (0, vitest_1.expect)(nextBundle.hash).toEqual(bundle.hash);
        (0, vitest_1.expect)(nextBundle.generatedAt).not.toEqual(bundle.generatedAt);
    });
    (0, vitest_1.it)('generates versioned client SDK artifacts for supported languages', () => {
        const clients = (0, registry_js_1.generateClientLibraries)(bundle, ['typescript', 'python', 'go']);
        const tsClient = clients.find((client) => client.language === 'typescript');
        (0, vitest_1.expect)(tsClient?.files[0].contents).toContain('gateway contract 2025.3.0');
        const pyClient = clients.find((client) => client.language === 'python');
        (0, vitest_1.expect)(pyClient?.files[0].contents).toContain('gateway contract 2025.3.0');
        const goClient = clients.find((client) => client.language === 'go');
        (0, vitest_1.expect)(goClient?.files[0].contents).toContain('not yet supported');
    });
    (0, vitest_1.it)('runs contract tests for real and simulated clients', async () => {
        const openApiClients = [
            {
                name: 'real-client',
                invoke: async (operationId) => {
                    if (operationId === 'searchUnified') {
                        return {
                            trace_id: 'trace-real',
                            items: [
                                {
                                    title: 'Bridge operations',
                                    source: 'demo-index',
                                    snippet: 'Real client payload',
                                    ranking_features: { bm25: 0.91 },
                                },
                            ],
                        };
                    }
                    return { data: { models: [] } };
                },
            },
            {
                name: 'sim-client',
                invoke: async () => ({
                    trace_id: 'trace-sim',
                    items: [
                        { title: 'Bridge operations', source: 'demo-index', ranking_features: { bm25: 0.9 } },
                    ],
                }),
            },
        ];
        const graphqlClients = [
            {
                name: 'real-graphql',
                execute: async () => ({
                    data: {
                        models: [
                            {
                                id: 'gpt-4',
                                family: 'llm',
                                license: 'closed',
                                modality: ['text'],
                                ctx: 16000,
                                local: false,
                                description: 'real gateway model',
                            },
                        ],
                    },
                    errors: [],
                }),
            },
            {
                name: 'sim-graphql',
                execute: async () => ({
                    data: {
                        models: [
                            {
                                id: 'mixtral',
                                family: 'llm',
                                license: 'apache-2.0',
                                modality: ['text'],
                                ctx: 8192,
                                local: true,
                                description: 'simulated model payload',
                            },
                        ],
                    },
                    errors: [],
                }),
            },
        ];
        const report = await (0, registry_js_1.runContractTestSuite)({
            bundle,
            openApiClients,
            graphqlClients,
        });
        (0, vitest_1.expect)(report.passed).toBe(true);
        (0, vitest_1.expect)(report.openApiResults.flat().every((result) => result.status === 'passed')).toBe(true);
        (0, vitest_1.expect)(report.graphqlResults.flat().every((result) => result.status === 'passed')).toBe(true);
    });
    (0, vitest_1.it)('creates deprecation notices and migration guides automatically', () => {
        const notice = (0, registry_js_1.generateDeprecationNotice)(bundle, {
            sunsetDate: '2025-06-30',
            replacementVersion: '2025.4.0',
            channel: 'email',
        });
        (0, vitest_1.expect)(notice).toContain('2025-06-30');
        (0, vitest_1.expect)(notice).toContain('2025.4.0');
        const previousOpenApi = { ...openapi_js_1.gatewayOpenApiContract, version: '2025.2.0' };
        const guide = (0, registry_js_1.buildMigrationGuide)(bundle, previousOpenApi);
        (0, vitest_1.expect)(guide.title).toContain('Migration to 2025.3.0');
        (0, vitest_1.expect)(guide.steps.some((step) => step.includes('Regenerate client SDKs'))).toBe(true);
    });
});
