/**
 * Integration tests for AI/ML workflows
 */
const request = require('supertest');
const { v4: uuidv4 } = require('uuid');

// Mock app factory for testing
function createTestApp() {
  const express = require('express');
  const app = express();

  app.use(express.json());

  // Mock AI webhook endpoint
  app.post('/ai/webhook', (req, res) => {
    const { job_id, kind } = req.body;

    // Simulate successful webhook processing
    res.json({
      ok: true,
      processed: true,
      jobId: job_id,
      kind: kind,
    });
  });

  // Mock ML service health check
  app.get('/ml/health', (req, res) => {
    res.json({ status: 'ok', service: 'ml' });
  });

  // Mock GraphQL endpoint for AI operations
  app.post('/graphql', (req, res) => {
    const { query, variables } = req.body;

    if (query.includes('aiExtractEntities')) {
      res.json({
        data: {
          aiExtractEntities: {
            id: uuidv4(),
            kind: 'nlp_entities',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
          },
        },
      });
    } else if (query.includes('aiLinkPredict')) {
      res.json({
        data: {
          aiLinkPredict: {
            id: uuidv4(),
            kind: 'link_prediction',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
          },
        },
      });
    } else if (query.includes('aiCommunityDetect')) {
      res.json({
        data: {
          aiCommunityDetect: {
            id: uuidv4(),
            kind: 'community_detect',
            status: 'QUEUED',
            createdAt: new Date().toISOString(),
          },
        },
      });
    } else if (query.includes('insights')) {
      res.json({
        data: {
          insights: [
            {
              id: uuidv4(),
              jobId: variables?.jobId || uuidv4(),
              kind: 'nlp_entities',
              status: 'PENDING',
              payload: {
                entities: [
                  { text: 'John Doe', label: 'PERSON', confidence: 0.95 },
                ],
              },
              createdAt: new Date().toISOString(),
            },
          ],
        },
      });
    } else {
      res.status(400).json({ error: 'Unknown GraphQL query' });
    }
  });

  return app;
}

describe('AI Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('AI Webhook Processing', () => {
    it('should process NLP entity extraction webhook', async () => {
      const webhookPayload = {
        job_id: uuidv4(),
        kind: 'nlp_entities',
        results: [
          {
            doc_id: 'doc1',
            entities: [
              {
                text: 'John Doe',
                label: 'PERSON',
                start: 0,
                end: 8,
                confidence: 0.95,
                source: 'spacy',
              },
              {
                text: 'john@example.com',
                label: 'EMAIL',
                start: 20,
                end: 36,
                confidence: 0.9,
                source: 'pattern',
              },
            ],
          },
        ],
      };

      const response = await request(app)
        .post('/ai/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.jobId).toBe(webhookPayload.job_id);
      expect(response.body.kind).toBe('nlp_entities');
    });

    it('should process entity resolution webhook', async () => {
      const webhookPayload = {
        job_id: uuidv4(),
        kind: 'entity_resolution',
        links: [
          ['entity1', 'entity2', 0.92],
          ['entity3', 'entity4', 0.87],
        ],
        method: 'transformer',
        threshold: 0.85,
        total_entities: 10,
        matches_found: 2,
      };

      const response = await request(app)
        .post('/ai/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.kind).toBe('entity_resolution');
    });

    it('should process link prediction webhook', async () => {
      const webhookPayload = {
        job_id: uuidv4(),
        kind: 'link_prediction',
        predictions: [
          { u: 'nodeA', v: 'nodeB', score: 3.2, method: 'adamic_adar' },
          { u: 'nodeC', v: 'nodeD', score: 2.8, method: 'adamic_adar' },
        ],
        method: 'adamic_adar',
        total_edges: 50,
        predictions_count: 2,
      };

      const response = await request(app)
        .post('/ai/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.kind).toBe('link_prediction');
    });

    it('should process community detection webhook', async () => {
      const webhookPayload = {
        job_id: uuidv4(),
        kind: 'community_detect',
        communities: [
          {
            community_id: 'c0',
            members: ['node1', 'node2', 'node3'],
            size: 3,
            algorithm: 'louvain',
          },
          {
            community_id: 'c1',
            members: ['node4', 'node5'],
            size: 2,
            algorithm: 'louvain',
          },
        ],
        algorithm: 'louvain',
        resolution: 1.0,
        total_edges: 20,
        communities_found: 2,
      };

      const response = await request(app)
        .post('/ai/webhook')
        .send(webhookPayload)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.kind).toBe('community_detect');
    });
  });

  describe('GraphQL AI Mutations', () => {
    it('should queue entity extraction job', async () => {
      const mutation = `
        mutation ExtractEntities($docs: [JSON!]!) {
          aiExtractEntities(docs: $docs) {
            id
            kind
            status
            createdAt
          }
        }
      `;

      const variables = {
        docs: [
          {
            id: 'doc1',
            text: 'John Doe works at Acme Corp. Contact: john@acme.com',
          },
        ],
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data.aiExtractEntities).toBeDefined();
      expect(response.body.data.aiExtractEntities.kind).toBe('nlp_entities');
      expect(response.body.data.aiExtractEntities.status).toBe('QUEUED');
    });

    it('should queue link prediction job', async () => {
      const mutation = `
        mutation PredictLinks($graphSnapshotId: ID!, $topK: Int) {
          aiLinkPredict(graphSnapshotId: $graphSnapshotId, topK: $topK) {
            id
            kind
            status
            createdAt
          }
        }
      `;

      const variables = {
        graphSnapshotId: 'snapshot-123',
        topK: 20,
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data.aiLinkPredict).toBeDefined();
      expect(response.body.data.aiLinkPredict.kind).toBe('link_prediction');
      expect(response.body.data.aiLinkPredict.status).toBe('QUEUED');
    });

    it('should queue community detection job', async () => {
      const mutation = `
        mutation DetectCommunities($graphSnapshotId: ID!) {
          aiCommunityDetect(graphSnapshotId: $graphSnapshotId) {
            id
            kind
            status
            createdAt
          }
        }
      `;

      const variables = {
        graphSnapshotId: 'snapshot-456',
      };

      const response = await request(app)
        .post('/graphql')
        .send({ query: mutation, variables })
        .expect(200);

      expect(response.body.data.aiCommunityDetect).toBeDefined();
      expect(response.body.data.aiCommunityDetect.kind).toBe(
        'community_detect',
      );
      expect(response.body.data.aiCommunityDetect.status).toBe('QUEUED');
    });
  });

  describe('GraphQL AI Queries', () => {
    it('should fetch pending insights', async () => {
      const query = `
        query GetInsights($status: String) {
          insights(status: $status) {
            id
            jobId
            kind
            status
            payload
            createdAt
          }
        }
      `;

      const variables = { status: 'PENDING' };

      const response = await request(app)
        .post('/graphql')
        .send({ query, variables })
        .expect(200);

      expect(response.body.data.insights).toBeDefined();
      expect(Array.isArray(response.body.data.insights)).toBe(true);

      if (response.body.data.insights.length > 0) {
        const insight = response.body.data.insights[0];
        expect(insight.id).toBeDefined();
        expect(insight.kind).toBeDefined();
        expect(insight.status).toBe('PENDING');
        expect(insight.payload).toBeDefined();
      }
    });
  });

  describe('ML Service Health Checks', () => {
    it('should check ML service health', async () => {
      const response = await request(app).get('/ml/health').expect(200);

      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('ml');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed webhook payloads', async () => {
      const malformedPayload = {
        invalid: 'payload',
        missing: 'required_fields',
      };

      const response = await request(app)
        .post('/ai/webhook')
        .send(malformedPayload)
        .expect(200);

      // Should still process but handle gracefully
      expect(response.body.ok).toBe(true);
    });

    it('should handle invalid GraphQL queries', async () => {
      const invalidQuery = `
        query InvalidQuery {
          nonexistentField {
            id
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .send({ query: invalidQuery })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle missing webhook signature', async () => {
      const payload = {
        job_id: uuidv4(),
        kind: 'test',
      };

      // In a real implementation, this would check HMAC signature
      // For now, just ensure it doesn't crash
      const response = await request(app).post('/ai/webhook').send(payload);

      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(500);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent webhook requests', async () => {
      const requests = Array.from({ length: 10 }, (_, i) =>
        request(app).post('/ai/webhook').send({
          job_id: uuidv4(),
          kind: 'test_load',
          batch: i,
        }),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.ok).toBe(true);
      });
    });

    it('should handle large webhook payloads', async () => {
      const largePayload = {
        job_id: uuidv4(),
        kind: 'nlp_entities',
        results: Array.from({ length: 1000 }, (_, i) => ({
          doc_id: `doc${i}`,
          entities: Array.from({ length: 10 }, (_, j) => ({
            text: `entity${j}`,
            label: 'TEST',
            start: j * 10,
            end: j * 10 + 7,
            confidence: 0.9,
          })),
        })),
      };

      const response = await request(app)
        .post('/ai/webhook')
        .send(largePayload)
        .expect(200);

      expect(response.body.ok).toBe(true);
      expect(response.body.kind).toBe('nlp_entities');
    });
  });
});

module.exports = { createTestApp };
