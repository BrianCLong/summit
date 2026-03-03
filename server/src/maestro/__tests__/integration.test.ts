import request from 'supertest';
import { createApp } from '../../app.js';
import { getPostgresPool } from '../../db/postgres.js';
import { evidenceProvenanceService } from '../evidence/provenance-service.js';
import { describe, test, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

describe('Maestro Integration Tests', () => {
  let testRunId: string;
  let authToken: string;
  let app: any;

  beforeAll(async () => {
    // Create app
    app = await createApp();

    // Setup test database
    const pool = getPostgresPool();
    await pool.query('BEGIN');

    // Create test run
    const result = await pool.query(
      `INSERT INTO "run" (id, runbook, status, started_at)
       VALUES (gen_random_uuid(), 'test-runbook', 'RUNNING', now()) 
       RETURNING id`
    );
    testRunId = result.rows[0]?.id || 'mock-id';

    // Mock auth token (in real tests, use proper auth)
    authToken = 'test-token';
  });

  afterAll(async () => {
    const pool = getPostgresPool();
    await pool.query('ROLLBACK');
    await pool.end();
  });

  describe('Router Decision Transparency', () => {
    beforeEach(async () => {
      const pool = getPostgresPool();
      await pool.query('DELETE FROM router_decision WHERE run_id = $1', [testRunId]);
    });

    test('should fetch router decision', async () => {
      const pool = getPostgresPool();
      const decisionResult = await pool.query(
        `INSERT INTO router_decision (id, run_id, node_id, decision, reasoning, created_at)
         VALUES (gen_random_uuid(), $1, 'test-node', 'test-decision', 'test-reasoning', now())
         RETURNING id`,
        [testRunId]
      );

      const response = await request(app)
        .get(`/api/v1/maestro/runs/${testRunId}/decisions/${decisionResult.rows[0]?.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('decision', 'test-decision');
      expect(response.body).toHaveProperty('reasoning', 'test-reasoning');
    });

    test('should handle override request', async () => {
      const response = await request(app)
        .post(`/api/v1/maestro/runs/${testRunId}/override`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          nodeId: 'test-node',
          overrideDecision: 'manual-override',
          reason: 'Testing override'
        })
        .expect(200);

      expect(response.body).toHaveProperty('status', 'success');
    });

    test('should export audit data', async () => {
      const response = await request(app)
        .get(`/api/v1/maestro/runs/${testRunId}/audit/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.header['content-type']).toMatch(/application\/json/);
      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  describe('Evidence Provenance System', () => {
    test('should store and verify evidence', async () => {
      const evidence = {
        data: 'test-data',
        source: 'test-source',
        timestamp: new Date().toISOString()
      };

      const result = await evidenceProvenanceService.storeEvidence(testRunId, evidence);
      expect(result).toHaveProperty('hash');

      const isValid = await evidenceProvenanceService.verifyEvidence(testRunId, result.hash);
      expect(isValid).toBe(true);
    });

    test('should generate SBOM evidence', async () => {
      const response = await request(app)
        .get(`/api/v1/maestro/runs/${testRunId}/evidence/sbom`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('components');
    });
  });

  describe('Approval System', () => {
    test('should list pending approvals', async () => {
      const response = await request(app)
        .get('/api/v1/maestro/approvals/pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });

    test('should handle approval via GraphQL', async () => {
      const query = `
        mutation {
          approveAction(id: "test-id", approved: true, comment: "Looks good") {
            success
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ query })
        .expect(200);

      // We expect it to pass GraphQL validation, even if mock fails
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('MCP Server Management', () => {
    test('should create MCP server', async () => {
      const serverConfig = {
        name: 'test-mcp-server',
        url: 'http://localhost:8080'
      };

      const response = await request(app)
        .post('/api/v1/maestro/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(serverConfig)
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });

    test('should list MCP servers', async () => {
      const response = await request(app)
        .get('/api/v1/maestro/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBeTruthy();
    });
  });

  describe('Dashboard API', () => {
    test('should fetch dashboard summary', async () => {
      const response = await request(app)
        .get('/api/v1/maestro/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('activeRuns');
      expect(response.body).toHaveProperty('pendingApprovals');
    });

    test('should fetch autonomy configuration', async () => {
      const response = await request(app)
        .get('/api/v1/maestro/config/autonomy')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('level');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent run', async () => {
      await request(app)
        .get('/api/v1/maestro/runs/non-existent-id/decisions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should validate input parameters', async () => {
      await request(app)
        .post(`/api/v1/maestro/runs/${testRunId}/override`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
        })
        .expect(400);
    });

    test('should require authentication', async () => {
      await request(app)
        .get(`/api/v1/maestro/runs/${testRunId}/audit/export`)
        .expect(401);
    });
  });

  describe('Performance & Scalability', () => {
    test('should handle concurrent router decisions', async () => {
      const pool = getPostgresPool();
      const promises = Array(10).fill(0).map((_, i) =>
        pool.query(
          `INSERT INTO router_decision (id, run_id, node_id, decision, reasoning, created_at)
           VALUES (gen_random_uuid(), $1, $2, 'test-decision', 'test-reasoning', now())`,
          [testRunId, `test-node-${i}`]
        )
      );

      await Promise.all(promises);

      const result = await pool.query(
        'SELECT count(*) FROM router_decision WHERE run_id = $1',
        [testRunId]
      );

      expect(parseInt(result.rows[0].count)).toBeGreaterThanOrEqual(10);
    });

    test('should paginate large result sets', async () => {
      const response = await request(app)
        .get(`/api/v1/maestro/runs/${testRunId}/decisions?limit=5&offset=0`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body.data)).toBeTruthy();
      expect(response.body.data.length).toBeLessThanOrEqual(5);
      expect(response.body).toHaveProperty('pagination');
    });
  });
});
