import request from 'supertest';
import { app } from '../app.js';
import { getPostgresPool } from '../db/postgres.js';
import { evidenceProvenanceService } from '../maestro/evidence/provenance-service.js';

describe('Maestro Integration Tests', () => {
  let testRunId: string;
  let authToken: string;

  beforeAll(async () => {
    // Setup test database
    const pool = getPostgresPool();
    await pool.query('BEGIN');

    // Create test run
    const result = await pool.query(
      `INSERT INTO run (id, runbook, status, started_at) 
       VALUES (gen_random_uuid(), 'test-runbook', 'RUNNING', now()) 
       RETURNING id`,
    );
    testRunId = result.rows[0].id;

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
      // Insert test router decision
      await pool.query(
        `INSERT INTO router_decisions (id, run_id, node_id, selected_model, candidates, policy_applied)
         VALUES (gen_random_uuid(), $1, 'test-node', 'gpt-4', $2, 'cost-optimization')`,
        [
          testRunId,
          JSON.stringify([
            {
              model: 'gpt-4',
              score: 0.95,
              reason: 'Highest quality for complex task',
            },
            {
              model: 'gpt-3.5-turbo',
              score: 0.8,
              reason: 'Cost effective alternative',
            },
          ]),
        ],
      );
    });

    test('should fetch router decision', async () => {
      const response = await request(app)
        .get(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/routing`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('selectedModel', 'gpt-4');
      expect(response.body.candidates).toHaveLength(2);
      expect(response.body).toHaveProperty('canOverride');
    });

    test('should handle override request', async () => {
      const response = await request(app)
        .post(
          `/api/maestro/v1/runs/${testRunId}/nodes/test-node/override-routing`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-3.5-turbo',
          reason: 'Cost optimization for testing',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should export audit data', async () => {
      // First get the decision ID
      const getResponse = await request(app)
        .get(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/routing`)
        .set('Authorization', `Bearer ${authToken}`);

      const decisionId = getResponse.body.id;

      const response = await request(app)
        .get(`/api/maestro/v1/audit/router-decisions/${decisionId}/export`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.body).toHaveProperty('exportedAt');
    });
  });

  describe('Evidence Provenance System', () => {
    test('should store and verify evidence', async () => {
      const artifact = {
        runId: testRunId,
        artifactType: 'sbom' as const,
        content: JSON.stringify({ components: [] }),
        metadata: { format: 'cycloneDX' },
      };

      const artifactId =
        await evidenceProvenanceService.storeEvidence(artifact);
      expect(artifactId).toBeDefined();

      const verification =
        await evidenceProvenanceService.verifyEvidence(artifactId);
      expect(verification.valid).toBe(true);
      expect(verification.integrity).toBe(true);
      expect(verification.provenance).toBe(true);
    });

    test('should generate SBOM evidence', async () => {
      const dependencies = [
        { name: 'express', version: '4.18.0', licenses: ['MIT'] },
        { name: 'postgres', version: '14.0', licenses: ['PostgreSQL'] },
      ];

      const artifactId = await evidenceProvenanceService.generateSBOMEvidence(
        testRunId,
        dependencies,
      );
      expect(artifactId).toBeDefined();

      const artifacts =
        await evidenceProvenanceService.listEvidenceForRun(testRunId);
      const sbomArtifact = artifacts.find((a) => a.artifact_type === 'sbom');
      expect(sbomArtifact).toBeDefined();
    });
  });

  describe('Approval System', () => {
    beforeEach(async () => {
      const pool = getPostgresPool();
      // Create approval request
      await pool.query(
        `INSERT INTO run_step (run_id, step_id, status) 
         VALUES ($1, 'approval-step', 'BLOCKED')`,
        [testRunId],
      );
      await pool.query(
        `INSERT INTO run_event (run_id, kind, payload)
         VALUES ($1, 'approval.created', $2)`,
        [
          testRunId,
          { stepId: 'approval-step', labels: ['production', 'high-cost'] },
        ],
      );
    });

    test('should list pending approvals', async () => {
      const response = await request(app)
        .get('/api/conductor/v1/approvals')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toContainEqual(
        expect.objectContaining({
          runId: testRunId,
          stepId: 'approval-step',
        }),
      );
    });

    test('should handle approval via GraphQL', async () => {
      const mutation = `
        mutation ApproveStep($runId: ID!, $stepId: ID!, $justification: String!) {
          approveStep(runId: $runId, stepId: $stepId, justification: $justification)
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: mutation,
          variables: {
            runId: testRunId,
            stepId: 'approval-step',
            justification: 'Approved for testing purposes',
          },
        })
        .expect(200);

      expect(response.body.data.approveStep).toBe(true);
    });
  });

  describe('MCP Server Management', () => {
    test('should create MCP server', async () => {
      const serverData = {
        name: 'test-mcp-server',
        url: 'wss://test.example.com/mcp',
        scopes: ['read', 'write'],
        tags: ['test'],
      };

      const response = await request(app)
        .post('/api/maestro/v1/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .send(serverData)
        .expect(201);

      expect(response.body.name).toBe('test-mcp-server');
      expect(response.body).not.toHaveProperty('auth_token'); // Should be hidden
    });

    test('should list MCP servers', async () => {
      const response = await request(app)
        .get('/api/maestro/v1/mcp/servers')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Dashboard API', () => {
    test('should fetch dashboard summary', async () => {
      const response = await request(app)
        .get('/api/maestro/v1/dashboard/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('autonomy');
      expect(response.body).toHaveProperty('health');
      expect(response.body).toHaveProperty('budgets');
      expect(response.body).toHaveProperty('runs');
      expect(response.body).toHaveProperty('approvals');
    });

    test('should fetch autonomy configuration', async () => {
      const response = await request(app)
        .get('/api/maestro/v1/dashboard/autonomy')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('level');
      expect(response.body).toHaveProperty('policies');
      expect(Array.isArray(response.body.policies)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 for non-existent run', async () => {
      const fakeRunId = '00000000-0000-0000-0000-000000000000';

      await request(app)
        .get(`/api/maestro/v1/runs/${fakeRunId}/nodes/test-node/routing`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    test('should validate input parameters', async () => {
      await request(app)
        .post(
          `/api/maestro/v1/runs/${testRunId}/nodes/test-node/override-routing`,
        )
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: '', // Invalid empty model
          reason: 'test',
        })
        .expect(400);
    });

    test('should require authentication', async () => {
      await request(app).get('/api/maestro/v1/dashboard/summary').expect(401);
    });
  });

  describe('Performance & Scalability', () => {
    test('should handle concurrent router decisions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .get(`/api/maestro/v1/runs/${testRunId}/nodes/test-node-${i}/routing`)
          .set('Authorization', `Bearer ${authToken}`),
      );

      const responses = await Promise.allSettled(promises);
      const successfulResponses = responses.filter(
        (r) => r.status === 'fulfilled',
      ).length;

      // Should handle most requests successfully
      expect(successfulResponses).toBeGreaterThan(5);
    });

    test('should paginate large result sets', async () => {
      const response = await request(app)
        .get('/api/maestro/v1/runs?limit=5&offset=0')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toBeDefined();
      expect(response.body.items.length).toBeLessThanOrEqual(5);
    });
  });
});

// Additional test utilities
export function createTestRun(runbook: string = 'test-runbook') {
  return getPostgresPool().query(
    `INSERT INTO run (id, runbook, status, started_at) 
     VALUES (gen_random_uuid(), $1, 'RUNNING', now()) 
     RETURNING id`,
    [runbook],
  );
}

export function createTestRouterDecision(runId: string, nodeId: string) {
  return getPostgresPool().query(
    `INSERT INTO router_decisions (id, run_id, node_id, selected_model, candidates)
     VALUES (gen_random_uuid(), $1, $2, 'gpt-4', $3)`,
    [
      runId,
      nodeId,
      JSON.stringify([
        { model: 'gpt-4', score: 0.95, reason: 'Best quality' },
        { model: 'gpt-3.5-turbo', score: 0.8, reason: 'Cost effective' },
      ]),
    ],
  );
}
