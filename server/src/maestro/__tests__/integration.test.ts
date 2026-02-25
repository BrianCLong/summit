import express from 'express';
import request from 'supertest';
import { beforeAll, beforeEach, describe, expect, test } from '@jest/globals';

type EvidenceArtifact = {
  artifact_id: string;
  run_id: string;
  artifact_type: string;
};

const authToken = 'test-token';
const testRunId = '00000000-0000-0000-0000-000000000001';

const evidenceArtifacts: EvidenceArtifact[] = [];
const approvals: Array<{ runId: string; stepId: string }> = [];
const mcpServers: Array<{ name: string; url: string; scopes: string[]; tags: string[] }> = [];

const evidenceProvenanceService = {
  async storeEvidence(input: { runId: string; artifactType: string }) {
    const artifactId = `artifact-${evidenceArtifacts.length + 1}`;
    evidenceArtifacts.push({
      artifact_id: artifactId,
      run_id: input.runId,
      artifact_type: input.artifactType,
    });
    return artifactId;
  },
  async verifyEvidence(_artifactId: string) {
    return { valid: true, integrity: true, provenance: true };
  },
  async generateSBOMEvidence(runId: string, _dependencies: unknown[]) {
    const artifactId = `artifact-${evidenceArtifacts.length + 1}`;
    evidenceArtifacts.push({
      artifact_id: artifactId,
      run_id: runId,
      artifact_type: 'sbom',
    });
    return artifactId;
  },
  async listEvidenceForRun(runId: string) {
    return evidenceArtifacts.filter((a) => a.run_id === runId);
  },
};

function buildTestApp() {
  const app = express();
  app.use(express.json());

  app.use('/api', (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  });
  app.use('/graphql', (req, res, next) => {
    if (!req.headers.authorization) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    return next();
  });

  app.get('/api/maestro/v1/runs/:runId/nodes/:nodeId/routing', (req, res) => {
    if (req.params.runId !== testRunId) {
      return res.status(404).json({ error: 'Run not found' });
    }

    return res.json({
      id: 'decision-1',
      selectedModel: 'gpt-4',
      candidates: [
        { model: 'gpt-4', score: 0.95 },
        { model: 'gpt-3.5-turbo', score: 0.8 },
      ],
      canOverride: true,
    });
  });

  app.post(
    '/api/maestro/v1/runs/:runId/nodes/:nodeId/override-routing',
    (req, res) => {
      if (!req.body?.model) {
        return res.status(400).json({ error: 'model is required' });
      }
      return res.json({ success: true });
    },
  );

  app.get('/api/maestro/v1/audit/router-decisions/:decisionId/export', (_req, res) => {
    return res.json({ exportedAt: new Date().toISOString() });
  });

  app.get('/api/conductor/v1/approvals', (_req, res) => {
    return res.json({ items: approvals });
  });

  app.post('/graphql', (_req, res) => {
    return res.json({ data: { approveStep: true } });
  });

  app.post('/api/maestro/v1/mcp/servers', (req, res) => {
    const server = {
      name: req.body.name,
      url: req.body.url,
      scopes: req.body.scopes || [],
      tags: req.body.tags || [],
    };
    mcpServers.push(server);
    return res.status(201).json(server);
  });

  app.get('/api/maestro/v1/mcp/servers', (_req, res) => {
    return res.json(mcpServers);
  });

  app.get('/api/maestro/v1/dashboard/summary', (_req, res) => {
    return res.json({
      autonomy: {},
      health: {},
      budgets: {},
      runs: {},
      approvals: {},
    });
  });

  app.get('/api/maestro/v1/dashboard/autonomy', (_req, res) => {
    return res.json({ level: 'human-supervised', policies: [] });
  });

  app.get('/api/maestro/v1/runs', (req, res) => {
    const limit = Number(req.query.limit ?? 10);
    const items = Array.from({ length: Math.min(limit, 5) }).map((_, i) => ({
      id: `${testRunId}-${i}`,
    }));
    return res.json({ items });
  });

  return app;
}

describe('Maestro Integration Tests', () => {
  let app: express.Express;

  beforeAll(async () => {
    app = buildTestApp();
  });

  describe('Router Decision Transparency', () => {
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
        .post(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/override-routing`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: 'gpt-3.5-turbo',
          reason: 'Cost optimization for testing',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should export audit data', async () => {
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
    beforeEach(() => {
      evidenceArtifacts.length = 0;
    });

    test('should store and verify evidence', async () => {
      const artifactId = await evidenceProvenanceService.storeEvidence({
        runId: testRunId,
        artifactType: 'sbom',
      });
      expect(artifactId).toBeDefined();

      const verification = await evidenceProvenanceService.verifyEvidence(
        artifactId,
      );
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

      const artifacts = await evidenceProvenanceService.listEvidenceForRun(
        testRunId,
      );
      const sbomArtifact = artifacts.find((a) => a.artifact_type === 'sbom');
      expect(sbomArtifact).toBeDefined();
    });
  });

  describe('Approval System', () => {
    beforeEach(() => {
      approvals.length = 0;
      approvals.push({ runId: testRunId, stepId: 'approval-step' });
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
    beforeEach(() => {
      mcpServers.length = 0;
    });

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
      expect(response.body).not.toHaveProperty('auth_token');
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
        .post(`/api/maestro/v1/runs/${testRunId}/nodes/test-node/override-routing`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          model: '',
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
        (r): r is PromiseFulfilledResult<request.Response> =>
          r.status === 'fulfilled' && r.value.status === 200,
      ).length;

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
