"use strict";
/**
 * Tests for GraphRAGQueryService
 *
 * Validates:
 * - ≥95% syntactic validity on test prompts
 * - Citations resolve correctly
 * - Runs are replayable
 * - Glass-box observability works
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// Mock modules before importing services
globals_1.jest.mock('../../observability/metrics', () => ({
    metrics: {
        featureUsageTotal: { inc: globals_1.jest.fn() },
        queryDuration: { observe: globals_1.jest.fn(), startTimer: globals_1.jest.fn(() => globals_1.jest.fn()) },
        queriesTotal: { inc: globals_1.jest.fn() },
        previewsTotal: { inc: globals_1.jest.fn() },
        queryPreviewErrorsTotal: { inc: globals_1.jest.fn() },
        queryExecutionErrors: { inc: globals_1.jest.fn() },
        citationValidation: { observe: globals_1.jest.fn() },
        glassBoxRunsTotal: { inc: globals_1.jest.fn() },
        previewEditTotal: { inc: globals_1.jest.fn() },
        previewExecuteTotal: { inc: globals_1.jest.fn() },
    },
}));
globals_1.jest.mock('../../utils/logger');
globals_1.jest.mock('../../config/logger');
const GraphRAGQueryService_js_1 = require("../GraphRAGQueryService.js");
const GraphRAGService_js_1 = require("../GraphRAGService.js");
const QueryPreviewService_js_1 = require("../QueryPreviewService.js");
const GlassBoxRunService_js_1 = require("../GlassBoxRunService.js");
const nl_to_cypher_service_js_1 = require("../../ai/nl-to-cypher/nl-to-cypher.service.js");
const describeGraphRag = process.env.RUN_GRAPHRAG === 'true' ? globals_1.describe : globals_1.describe.skip;
// Mock promptRegistry to verify audit linking
globals_1.jest.mock('../../prompts/registry.js', () => {
    const getPrompt = globals_1.jest
        .fn()
        .mockImplementation((id) => {
        if (id === 'core.jules-copilot@v4') {
            return {
                meta: { id, owner: 'jules' },
            };
        }
        return null;
    });
    return {
        promptRegistry: {
            getPrompt,
        },
    };
});
// Test constants
const TEST_TENANT_ID = 'test-tenant';
const TEST_USER_ID = 'test-user';
const TEST_INVESTIGATION_ID = 'test-investigation-001';
// Test prompts for syntactic validity testing
const TEST_PROMPTS = [
    'Find all entities connected to person X',
    'What relationships exist between organization A and person B?',
    'Show me the shortest path between entity 1 and entity 2',
    'List all entities of type PERSON with confidence > 0.8',
    'Find entities created in the last 7 days',
    'What are the most connected entities in this investigation?',
    'Show entities with more than 5 relationships',
    'Find all TRANSACTION relationships with amount > 10000',
    'List entities that mention keyword "suspicious"',
    'Show the 2-hop neighborhood of entity X',
    'Find entities with label FINANCIAL_INSTITUTION',
    'What entities have property risk_score > 0.7?',
    'Show all relationships of type TRANSFER between date A and B',
    'Find entities connected through OWNS relationships',
    'List all entities in the investigation sorted by creation date',
    'Show entities with confidence between 0.5 and 0.9',
    'Find the most central entities in the graph',
    'What entities have no outgoing relationships?',
    'Show entities connected to more than 3 other entities',
    'Find all paths of length 3 between entity A and entity B',
];
describeGraphRag('GraphRAGQueryService', () => {
    let pool;
    let neo4jDriver;
    let redis;
    let graphRAGQueryService;
    let queryPreviewService;
    let glassBoxService;
    (0, globals_1.beforeAll)(async () => {
        // Setup would normally initialize actual database connections
        // For testing, we'll use mocks
        pool = createMockPool();
        neo4jDriver = createMockNeo4jDriver();
        redis = undefined; // Optional for testing
        // Initialize services
        glassBoxService = new GlassBoxRunService_js_1.GlassBoxRunService(pool, redis);
        const nlToCypherService = new nl_to_cypher_service_js_1.NlToCypherService({ generate: async () => 'MATCH (n) RETURN n' });
        queryPreviewService = new QueryPreviewService_js_1.QueryPreviewService(pool, neo4jDriver, nlToCypherService, glassBoxService, redis);
        const graphRAGService = new GraphRAGService_js_1.GraphRAGService(neo4jDriver, createMockLLMService(), createMockEmbeddingService(), redis);
        graphRAGQueryService = new GraphRAGQueryService_js_1.GraphRAGQueryService(graphRAGService, queryPreviewService, glassBoxService, pool, neo4jDriver);
        // Setup test database schema
        await setupTestSchema(pool);
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup
        await cleanupTestData(pool);
        await pool.end();
    });
    (0, globals_1.beforeEach)(async () => {
        // Clear test data between tests
        await clearTestData(pool);
    });
    (0, globals_1.describe)('Syntactic Validity', () => {
        (0, globals_1.it)('should generate syntactically valid queries for ≥95% of test prompts', async () => {
            const results = [];
            for (const prompt of TEST_PROMPTS) {
                try {
                    const preview = await queryPreviewService.createPreview({
                        investigationId: TEST_INVESTIGATION_ID,
                        tenantId: TEST_TENANT_ID,
                        userId: TEST_USER_ID,
                        naturalLanguageQuery: prompt,
                        language: 'cypher',
                    });
                    results.push({
                        prompt,
                        valid: preview.syntacticallyValid,
                        error: preview.validationErrors.join(', '),
                    });
                }
                catch (error) {
                    results.push({
                        prompt,
                        valid: false,
                        error: String(error),
                    });
                }
            }
            const validCount = results.filter(r => r.valid).length;
            const validityRate = (validCount / TEST_PROMPTS.length) * 100;
            console.log(`\nSyntactic Validity Results:`);
            console.log(`Valid: ${validCount}/${TEST_PROMPTS.length} (${validityRate.toFixed(1)}%)`);
            console.log(`\nInvalid queries:`);
            results.filter(r => !r.valid).forEach(r => {
                console.log(`  - "${r.prompt}": ${r.error}`);
            });
            // Acceptance criteria: ≥95% syntactic validity
            (0, globals_1.expect)(validityRate).toBeGreaterThanOrEqual(95);
        }, 60000); // 60 second timeout
        (0, globals_1.it)('should handle complex multi-pattern queries', async () => {
            const complexPrompt = `
        Find all people who work for organization X,
        and show their relationships to any financial institutions,
        limited to connections made in the last 30 days
      `;
            const preview = await queryPreviewService.createPreview({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                naturalLanguageQuery: complexPrompt,
                language: 'cypher',
            });
            (0, globals_1.expect)(preview.syntacticallyValid).toBe(true);
            (0, globals_1.expect)(preview.generatedQuery).toContain('MATCH');
            (0, globals_1.expect)(preview.validationErrors).toHaveLength(0);
        });
        (0, globals_1.it)('should add investigation scoping to generated queries', async () => {
            const preview = await queryPreviewService.createPreview({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                naturalLanguageQuery: 'Find all entities',
                language: 'cypher',
            });
            (0, globals_1.expect)(preview.generatedQuery).toContain('investigationId');
            (0, globals_1.expect)(preview.generatedQuery).toContain(TEST_INVESTIGATION_ID);
        });
    });
    (0, globals_1.describe)('Citation Resolution', () => {
        (0, globals_1.it)('should return enriched citations with entity details', async () => {
            // Setup test entities
            await setupTestEntities(pool, TEST_INVESTIGATION_ID);
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'What entities are connected to person John Doe?',
                autoExecute: true,
            });
            (0, globals_1.expect)(response.citations).toBeDefined();
            (0, globals_1.expect)(response.citations.length).toBeGreaterThan(0);
            // Verify citation enrichment
            response.citations.forEach(citation => {
                (0, globals_1.expect)(citation.entityId).toBeDefined();
                (0, globals_1.expect)(citation.entityKind).toBeDefined();
                (0, globals_1.expect)(citation.entityName).toBeDefined();
            });
        });
        (0, globals_1.it)('should validate all citations exist in subgraph', async () => {
            await setupTestEntities(pool, TEST_INVESTIGATION_ID);
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Show me the investigation graph',
                autoExecute: true,
            });
            // All cited entities should be retrievable
            for (const citation of response.citations) {
                const entity = await getEntity(pool, citation.entityId);
                (0, globals_1.expect)(entity).toBeDefined();
                (0, globals_1.expect)(entity.investigationId).toBe(TEST_INVESTIGATION_ID);
            }
        });
        (0, globals_1.it)('should include why_paths with valid relationship IDs', async () => {
            await setupTestEntities(pool, TEST_INVESTIGATION_ID);
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Explain the connections in this investigation',
                autoExecute: true,
            });
            if (response.why_paths && response.why_paths.length > 0) {
                for (const path of response.why_paths) {
                    (0, globals_1.expect)(path.from).toBeDefined();
                    (0, globals_1.expect)(path.to).toBeDefined();
                    (0, globals_1.expect)(path.relId).toBeDefined();
                    (0, globals_1.expect)(path.type).toBeDefined();
                    (0, globals_1.expect)(path.supportScore).toBeGreaterThanOrEqual(0);
                    (0, globals_1.expect)(path.supportScore).toBeLessThanOrEqual(1);
                }
            }
        });
    });
    (0, globals_1.describe)('Glass-Box Run Capture', () => {
        (0, globals_1.it)('should create glass-box run for every query with linked prompt audit metadata', async () => {
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Test query',
                autoExecute: true,
            });
            (0, globals_1.expect)(response.runId).toBeDefined();
            const run = await glassBoxService.getRun(response.runId);
            (0, globals_1.expect)(run).toBeDefined();
            (0, globals_1.expect)(run.investigationId).toBe(TEST_INVESTIGATION_ID);
            (0, globals_1.expect)(run.prompt).toBe('Test query');
            (0, globals_1.expect)(run.type).toBe('graphrag_query');
            // Verify audit metadata
            (0, globals_1.expect)(run.parameters).toBeDefined();
            (0, globals_1.expect)(run.parameters.systemPromptId).toBe('core.jules-copilot@v4');
            (0, globals_1.expect)(run.parameters.systemPromptOwner).toBe('jules');
        });
        (0, globals_1.it)('should block publication if claims lack provenance (strict prompt contract)', async () => {
            // Mock GraphRAGService to return an answer without citations
            const mockGraphRAGServiceNoCitations = new GraphRAGService_js_1.GraphRAGService(neo4jDriver, createMockLLMService(), createMockEmbeddingService(), redis);
            // Override answer to return no citations but a long answer
            mockGraphRAGServiceNoCitations.answer = globals_1.jest.fn(async () => ({
                answer: 'This is a very long generated answer that claims many things but provides absolutely no citations to back them up, which is a violation of the strict prompt contract.',
                confidence: 0.8,
                citations: { entityIds: [] }, // No citations
                why_paths: []
            }));
            // Create a service instance with this mock
            const strictService = new GraphRAGQueryService_js_1.GraphRAGQueryService(mockGraphRAGServiceNoCitations, queryPreviewService, glassBoxService, pool, neo4jDriver);
            // Execute query
            try {
                await strictService.query({
                    investigationId: TEST_INVESTIGATION_ID,
                    tenantId: TEST_TENANT_ID,
                    userId: TEST_USER_ID,
                    question: 'Generate a claim without evidence',
                    autoExecute: true,
                });
                fail('Should have thrown an error due to missing citations');
            }
            catch (error) {
                (0, globals_1.expect)(error.message).toContain('Publication blocked');
                (0, globals_1.expect)(error.message).toContain('lacks required citations');
            }
        });
        (0, globals_1.it)('should capture execution steps', async () => {
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Test query with steps',
                generateQueryPreview: true,
                autoExecute: true,
            });
            const run = await glassBoxService.getRun(response.runId);
            (0, globals_1.expect)(run.steps).toBeDefined();
            (0, globals_1.expect)(run.steps.length).toBeGreaterThan(0);
            // Verify step structure
            run.steps.forEach(step => {
                (0, globals_1.expect)(step.id).toBeDefined();
                (0, globals_1.expect)(step.stepNumber).toBeGreaterThan(0);
                (0, globals_1.expect)(step.type).toBeDefined();
                (0, globals_1.expect)(step.description).toBeDefined();
                (0, globals_1.expect)(step.startTime).toBeDefined();
            });
        });
        (0, globals_1.it)('should capture tool calls', async () => {
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Test query with tools',
                autoExecute: true,
            });
            const run = await glassBoxService.getRun(response.runId);
            (0, globals_1.expect)(run.toolCalls).toBeDefined();
            // Tool calls may or may not be present depending on execution path
        });
        (0, globals_1.it)('should mark runs as replayable', async () => {
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Replayable query',
                autoExecute: true,
            });
            const run = await glassBoxService.getRun(response.runId);
            (0, globals_1.expect)(run.replayable).toBe(true);
        });
    });
    (0, globals_1.describe)('Run Replay', () => {
        (0, globals_1.it)('should replay a run with same parameters', async () => {
            const original = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Original query',
                autoExecute: true,
            });
            const replayed = await graphRAGQueryService.replayRun(original.runId, TEST_USER_ID);
            (0, globals_1.expect)(replayed.runId).not.toBe(original.runId);
            const replayedRun = await glassBoxService.getRun(replayed.runId);
            (0, globals_1.expect)(replayedRun.parentRunId).toBe(original.runId);
            (0, globals_1.expect)(replayedRun.prompt).toBe('Original query');
        });
        (0, globals_1.it)('should replay with modified question', async () => {
            const original = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Original query',
                autoExecute: true,
            });
            const replayed = await graphRAGQueryService.replayRun(original.runId, TEST_USER_ID, {
                modifiedQuestion: 'Modified query',
            });
            const replayedRun = await glassBoxService.getRun(replayed.runId);
            (0, globals_1.expect)(replayedRun.prompt).toBe('Modified query');
            (0, globals_1.expect)(replayedRun.parentRunId).toBe(original.runId);
        });
        (0, globals_1.it)('should track replay history', async () => {
            const original = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Original query',
                autoExecute: true,
            });
            // Replay twice
            await graphRAGQueryService.replayRun(original.runId, TEST_USER_ID);
            await graphRAGQueryService.replayRun(original.runId, TEST_USER_ID);
            const history = await graphRAGQueryService.getReplayHistory(original.runId);
            (0, globals_1.expect)(history.length).toBe(2);
        });
        (0, globals_1.it)('should increment replay count on original', async () => {
            const original = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Original query',
                autoExecute: true,
            });
            await graphRAGQueryService.replayRun(original.runId, TEST_USER_ID);
            const originalRun = await glassBoxService.getRun(original.runId);
            (0, globals_1.expect)(originalRun.replayCount).toBe(1);
        });
    });
    (0, globals_1.describe)('Query Preview Workflow', () => {
        (0, globals_1.it)('should return preview without execution when autoExecute=false', async () => {
            const response = await graphRAGQueryService.query({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                question: 'Test preview',
                generateQueryPreview: true,
                autoExecute: false,
            });
            (0, globals_1.expect)(response.preview).toBeDefined();
            (0, globals_1.expect)(response.preview.generatedQuery).toBeDefined();
            (0, globals_1.expect)(response.preview.costLevel).toBeDefined();
            (0, globals_1.expect)(response.preview.riskLevel).toBeDefined();
            (0, globals_1.expect)(response.answer).toBe(''); // No execution
        });
        (0, globals_1.it)('should allow editing preview before execution', async () => {
            const preview = await queryPreviewService.createPreview({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                naturalLanguageQuery: 'Test query',
                language: 'cypher',
            });
            const editedQuery = 'MATCH (n:Entity) RETURN n LIMIT 10';
            const edited = await queryPreviewService.editPreview(preview.id, TEST_USER_ID, editedQuery);
            (0, globals_1.expect)(edited.editedQuery).toBe(editedQuery);
            (0, globals_1.expect)(edited.editedBy).toBe(TEST_USER_ID);
            (0, globals_1.expect)(edited.editedAt).toBeDefined();
        });
        (0, globals_1.it)('should execute preview with edited query', async () => {
            const preview = await queryPreviewService.createPreview({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                naturalLanguageQuery: 'Test query',
                language: 'cypher',
            });
            const editedQuery = 'MATCH (n:Entity {investigationId: $investigationId}) RETURN n LIMIT 5';
            await queryPreviewService.editPreview(preview.id, TEST_USER_ID, editedQuery);
            const response = await graphRAGQueryService.executePreview({
                previewId: preview.id,
                userId: TEST_USER_ID,
                useEditedQuery: true,
            });
            (0, globals_1.expect)(response.runId).toBeDefined();
            (0, globals_1.expect)(response.preview.id).toBe(preview.id);
        });
        (0, globals_1.it)('should support dry run mode', async () => {
            const preview = await queryPreviewService.createPreview({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                naturalLanguageQuery: 'Test query',
                language: 'cypher',
            });
            const response = await graphRAGQueryService.executePreview({
                previewId: preview.id,
                userId: TEST_USER_ID,
                dryRun: true,
            });
            (0, globals_1.expect)(response.answer).toContain('Dry run');
        });
    });
    (0, globals_1.describe)('Cost Estimation', () => {
        (0, globals_1.it)('should estimate query cost correctly', async () => {
            const testCases = [
                {
                    prompt: 'Find one entity',
                    expectedLevel: ['low', 'medium'],
                },
                {
                    prompt: 'Find all entities connected through any path',
                    expectedLevel: ['high', 'very_high'],
                },
            ];
            for (const testCase of testCases) {
                const preview = await queryPreviewService.createPreview({
                    investigationId: TEST_INVESTIGATION_ID,
                    tenantId: TEST_TENANT_ID,
                    userId: TEST_USER_ID,
                    naturalLanguageQuery: testCase.prompt,
                    language: 'cypher',
                });
                (0, globals_1.expect)(testCase.expectedLevel).toContain(preview.costEstimate.level);
            }
        });
        (0, globals_1.it)('should warn about missing LIMIT clause', async () => {
            const preview = await queryPreviewService.createPreview({
                investigationId: TEST_INVESTIGATION_ID,
                tenantId: TEST_TENANT_ID,
                userId: TEST_USER_ID,
                naturalLanguageQuery: 'Find all entities of any type',
                language: 'cypher',
            });
            const hasLimitWarning = preview.costEstimate.warnings.some(w => w.toLowerCase().includes('limit'));
            (0, globals_1.expect)(hasLimitWarning).toBe(true);
        });
    });
});
// Mock factory functions
function createMockPool() {
    return {
        query: async (sql, params) => {
            // Mock implementation
            return { rows: [], rowCount: 0 };
        },
        end: async () => { },
    };
}
function createMockNeo4jDriver() {
    return {
        session: () => ({
            run: async (cypher, params) => {
                return { records: [] };
            },
            close: async () => { },
        }),
    };
}
function createMockLLMService() {
    return {
        chat: async () => ({ content: 'Mock answer' }),
    };
}
function createMockEmbeddingService() {
    return {
        embed: async () => [0.1, 0.2, 0.3],
    };
}
async function setupTestSchema(pool) {
    // Create test tables
    await pool.query(`
    CREATE TABLE IF NOT EXISTS entities (
      id UUID PRIMARY KEY,
      tenant_id TEXT,
      kind TEXT,
      labels TEXT[],
      props JSONB
    )
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS glass_box_runs (
      id UUID PRIMARY KEY,
      investigation_id TEXT,
      tenant_id TEXT,
      user_id TEXT,
      type TEXT,
      status TEXT,
      prompt TEXT,
      parameters JSONB,
      steps JSONB,
      tool_calls JSONB,
      result JSONB,
      error TEXT,
      model_used TEXT,
      tokens_used INTEGER,
      cost_estimate DECIMAL,
      confidence DECIMAL,
      start_time TIMESTAMPTZ,
      end_time TIMESTAMPTZ,
      duration_ms INTEGER,
      replayable BOOLEAN,
      parent_run_id UUID,
      replay_count INTEGER,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    )
  `);
    await pool.query(`
    CREATE TABLE IF NOT EXISTS query_previews (
      id UUID PRIMARY KEY,
      investigation_id TEXT,
      tenant_id TEXT,
      user_id TEXT,
      natural_language_query TEXT,
      parameters JSONB,
      language TEXT,
      generated_query TEXT,
      query_explanation TEXT,
      cost_estimate JSONB,
      risk_assessment JSONB,
      syntactically_valid BOOLEAN,
      validation_errors JSONB,
      can_execute BOOLEAN,
      requires_approval BOOLEAN,
      sandbox_only BOOLEAN,
      model_used TEXT,
      confidence DECIMAL,
      generated_at TIMESTAMPTZ,
      expires_at TIMESTAMPTZ,
      executed BOOLEAN,
      executed_at TIMESTAMPTZ,
      execution_run_id UUID,
      edited_query TEXT,
      edited_by TEXT,
      edited_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    )
  `);
}
async function setupTestEntities(pool, investigationId) {
    // Insert test entities
    await pool.query(`
    INSERT INTO entities (id, tenant_id, kind, labels, props)
    VALUES
      (gen_random_uuid(), $1, 'PERSON', ARRAY['Person'],
       jsonb_build_object('name', 'John Doe', 'investigationId', $2)),
      (gen_random_uuid(), $1, 'ORGANIZATION', ARRAY['Organization'],
       jsonb_build_object('name', 'Acme Corp', 'investigationId', $2))
  `, [TEST_TENANT_ID, investigationId]);
}
async function getEntity(pool, entityId) {
    const result = await pool.query('SELECT * FROM entities WHERE id = $1', [entityId]);
    return result.rows[0];
}
async function clearTestData(pool) {
    await pool.query('DELETE FROM entities');
    await pool.query('DELETE FROM glass_box_runs');
    await pool.query('DELETE FROM query_previews');
}
async function cleanupTestData(pool) {
    await pool.query('DROP TABLE IF EXISTS entities CASCADE');
    await pool.query('DROP TABLE IF EXISTS glass_box_runs CASCADE');
    await pool.query('DROP TABLE IF EXISTS query_previews CASCADE');
}
