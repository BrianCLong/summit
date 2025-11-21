/**
 * Tests for GraphRAGQueryService
 *
 * Validates:
 * - ≥95% syntactic validity on test prompts
 * - Citations resolve correctly
 * - Runs are replayable
 * - Glass-box observability works
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import type { Pool } from 'pg';
import type { Redis } from 'ioredis';
import type { Driver } from 'neo4j-driver';
import { GraphRAGQueryService } from '../GraphRAGQueryService.js';
import { GraphRAGService } from '../GraphRAGService.js';
import { QueryPreviewService } from '../QueryPreviewService.js';
import { GlassBoxRunService } from '../GlassBoxRunService.js';
import { NlToCypherService } from '../../ai/nl-to-cypher/nl-to-cypher.service.js';

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

describe('GraphRAGQueryService', () => {
  let pool: Pool;
  let neo4jDriver: Driver;
  let redis: Redis | undefined;
  let graphRAGQueryService: GraphRAGQueryService;
  let queryPreviewService: QueryPreviewService;
  let glassBoxService: GlassBoxRunService;

  beforeAll(async () => {
    // Setup would normally initialize actual database connections
    // For testing, we'll use mocks
    pool = createMockPool();
    neo4jDriver = createMockNeo4jDriver();
    redis = undefined; // Optional for testing

    // Initialize services
    glassBoxService = new GlassBoxRunService(pool, redis);

    const nlToCypherService = new NlToCypherService(neo4jDriver, pool);

    queryPreviewService = new QueryPreviewService(
      pool,
      neo4jDriver,
      nlToCypherService,
      glassBoxService,
      redis
    );

    const graphRAGService = new GraphRAGService(
      neo4jDriver,
      createMockLLMService(),
      createMockEmbeddingService(),
      redis
    );

    graphRAGQueryService = new GraphRAGQueryService(
      graphRAGService,
      queryPreviewService,
      glassBoxService,
      pool,
      neo4jDriver
    );

    // Setup test database schema
    await setupTestSchema(pool);
  });

  afterAll(async () => {
    // Cleanup
    await cleanupTestData(pool);
    await pool.end();
  });

  beforeEach(async () => {
    // Clear test data between tests
    await clearTestData(pool);
  });

  describe('Syntactic Validity', () => {
    it('should generate syntactically valid queries for ≥95% of test prompts', async () => {
      const results: { prompt: string; valid: boolean; error?: string }[] = [];

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
        } catch (error) {
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
      expect(validityRate).toBeGreaterThanOrEqual(95);
    }, 60000); // 60 second timeout

    it('should handle complex multi-pattern queries', async () => {
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

      expect(preview.syntacticallyValid).toBe(true);
      expect(preview.generatedQuery).toContain('MATCH');
      expect(preview.validationErrors).toHaveLength(0);
    });

    it('should add investigation scoping to generated queries', async () => {
      const preview = await queryPreviewService.createPreview({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        naturalLanguageQuery: 'Find all entities',
        language: 'cypher',
      });

      expect(preview.generatedQuery).toContain('investigationId');
      expect(preview.generatedQuery).toContain(TEST_INVESTIGATION_ID);
    });
  });

  describe('Citation Resolution', () => {
    it('should return enriched citations with entity details', async () => {
      // Setup test entities
      await setupTestEntities(pool, TEST_INVESTIGATION_ID);

      const response = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'What entities are connected to person John Doe?',
        autoExecute: true,
      });

      expect(response.citations).toBeDefined();
      expect(response.citations.length).toBeGreaterThan(0);

      // Verify citation enrichment
      response.citations.forEach(citation => {
        expect(citation.entityId).toBeDefined();
        expect(citation.entityKind).toBeDefined();
        expect(citation.entityName).toBeDefined();
      });
    });

    it('should validate all citations exist in subgraph', async () => {
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
        expect(entity).toBeDefined();
        expect(entity.investigationId).toBe(TEST_INVESTIGATION_ID);
      }
    });

    it('should include why_paths with valid relationship IDs', async () => {
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
          expect(path.from).toBeDefined();
          expect(path.to).toBeDefined();
          expect(path.relId).toBeDefined();
          expect(path.type).toBeDefined();
          expect(path.supportScore).toBeGreaterThanOrEqual(0);
          expect(path.supportScore).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('Glass-Box Run Capture', () => {
    it('should create glass-box run for every query', async () => {
      const response = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Test query',
        autoExecute: true,
      });

      expect(response.runId).toBeDefined();

      const run = await glassBoxService.getRun(response.runId);
      expect(run).toBeDefined();
      expect(run!.investigationId).toBe(TEST_INVESTIGATION_ID);
      expect(run!.prompt).toBe('Test query');
      expect(run!.type).toBe('graphrag_query');
    });

    it('should capture execution steps', async () => {
      const response = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Test query with steps',
        generateQueryPreview: true,
        autoExecute: true,
      });

      const run = await glassBoxService.getRun(response.runId);
      expect(run!.steps).toBeDefined();
      expect(run!.steps.length).toBeGreaterThan(0);

      // Verify step structure
      run!.steps.forEach(step => {
        expect(step.id).toBeDefined();
        expect(step.stepNumber).toBeGreaterThan(0);
        expect(step.type).toBeDefined();
        expect(step.description).toBeDefined();
        expect(step.startTime).toBeDefined();
      });
    });

    it('should capture tool calls', async () => {
      const response = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Test query with tools',
        autoExecute: true,
      });

      const run = await glassBoxService.getRun(response.runId);
      expect(run!.toolCalls).toBeDefined();
      // Tool calls may or may not be present depending on execution path
    });

    it('should mark runs as replayable', async () => {
      const response = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Replayable query',
        autoExecute: true,
      });

      const run = await glassBoxService.getRun(response.runId);
      expect(run!.replayable).toBe(true);
    });
  });

  describe('Run Replay', () => {
    it('should replay a run with same parameters', async () => {
      const original = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Original query',
        autoExecute: true,
      });

      const replayed = await graphRAGQueryService.replayRun(
        original.runId,
        TEST_USER_ID
      );

      expect(replayed.runId).not.toBe(original.runId);

      const replayedRun = await glassBoxService.getRun(replayed.runId);
      expect(replayedRun!.parentRunId).toBe(original.runId);
      expect(replayedRun!.prompt).toBe('Original query');
    });

    it('should replay with modified question', async () => {
      const original = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Original query',
        autoExecute: true,
      });

      const replayed = await graphRAGQueryService.replayRun(
        original.runId,
        TEST_USER_ID,
        {
          modifiedQuestion: 'Modified query',
        }
      );

      const replayedRun = await glassBoxService.getRun(replayed.runId);
      expect(replayedRun!.prompt).toBe('Modified query');
      expect(replayedRun!.parentRunId).toBe(original.runId);
    });

    it('should track replay history', async () => {
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
      expect(history.length).toBe(2);
    });

    it('should increment replay count on original', async () => {
      const original = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Original query',
        autoExecute: true,
      });

      await graphRAGQueryService.replayRun(original.runId, TEST_USER_ID);

      const originalRun = await glassBoxService.getRun(original.runId);
      expect(originalRun!.replayCount).toBe(1);
    });
  });

  describe('Query Preview Workflow', () => {
    it('should return preview without execution when autoExecute=false', async () => {
      const response = await graphRAGQueryService.query({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        question: 'Test preview',
        generateQueryPreview: true,
        autoExecute: false,
      });

      expect(response.preview).toBeDefined();
      expect(response.preview!.generatedQuery).toBeDefined();
      expect(response.preview!.costLevel).toBeDefined();
      expect(response.preview!.riskLevel).toBeDefined();
      expect(response.answer).toBe(''); // No execution
    });

    it('should allow editing preview before execution', async () => {
      const preview = await queryPreviewService.createPreview({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        naturalLanguageQuery: 'Test query',
        language: 'cypher',
      });

      const editedQuery = 'MATCH (n:Entity) RETURN n LIMIT 10';
      const edited = await queryPreviewService.editPreview(
        preview.id,
        TEST_USER_ID,
        editedQuery
      );

      expect(edited.editedQuery).toBe(editedQuery);
      expect(edited.editedBy).toBe(TEST_USER_ID);
      expect(edited.editedAt).toBeDefined();
    });

    it('should execute preview with edited query', async () => {
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

      expect(response.runId).toBeDefined();
      expect(response.preview!.id).toBe(preview.id);
    });

    it('should support dry run mode', async () => {
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

      expect(response.answer).toContain('Dry run');
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate query cost correctly', async () => {
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

        expect(testCase.expectedLevel).toContain(preview.costEstimate.level);
      }
    });

    it('should warn about missing LIMIT clause', async () => {
      const preview = await queryPreviewService.createPreview({
        investigationId: TEST_INVESTIGATION_ID,
        tenantId: TEST_TENANT_ID,
        userId: TEST_USER_ID,
        naturalLanguageQuery: 'Find all entities of any type',
        language: 'cypher',
      });

      const hasLimitWarning = preview.costEstimate.warnings.some(w =>
        w.toLowerCase().includes('limit')
      );
      expect(hasLimitWarning).toBe(true);
    });
  });
});

// Mock factory functions
function createMockPool(): any {
  return {
    query: async (sql: string, params?: any[]) => {
      // Mock implementation
      return { rows: [], rowCount: 0 };
    },
    end: async () => {},
  };
}

function createMockNeo4jDriver(): any {
  return {
    session: () => ({
      run: async (cypher: string, params?: any) => {
        return { records: [] };
      },
      close: async () => {},
    }),
  };
}

function createMockLLMService(): any {
  return {
    chat: async () => ({ content: 'Mock answer' }),
  };
}

function createMockEmbeddingService(): any {
  return {
    embed: async () => [0.1, 0.2, 0.3],
  };
}

async function setupTestSchema(pool: Pool): Promise<void> {
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

async function setupTestEntities(pool: Pool, investigationId: string): Promise<void> {
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

async function getEntity(pool: Pool, entityId: string): Promise<any> {
  const result = await pool.query('SELECT * FROM entities WHERE id = $1', [entityId]);
  return result.rows[0];
}

async function clearTestData(pool: Pool): Promise<void> {
  await pool.query('DELETE FROM entities');
  await pool.query('DELETE FROM glass_box_runs');
  await pool.query('DELETE FROM query_previews');
}

async function cleanupTestData(pool: Pool): Promise<void> {
  await pool.query('DROP TABLE IF EXISTS entities CASCADE');
  await pool.query('DROP TABLE IF EXISTS glass_box_runs CASCADE');
  await pool.query('DROP TABLE IF EXISTS query_previews CASCADE');
}
