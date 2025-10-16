/**
 * End-to-End Integration Test Suite
 * Comprehensive testing of all IntelGraph platform capabilities
 */

import { describe, it, before, after, beforeEach, afterEach } from 'mocha';
import { expect } from 'chai';
import request from 'supertest';
import { Client } from 'pg';
import Redis from 'ioredis';
import { driver as neo4jDriver } from 'neo4j-driver';
import { randomUUID } from 'crypto';

// Test configuration
const TEST_CONFIG = {
  api: {
    baseUrl: process.env.TEST_API_BASE_URL || 'http://localhost:3000',
    timeout: 30000,
  },
  databases: {
    postgres: {
      connectionString:
        process.env.TEST_POSTGRES_URL ||
        'postgresql://test:test@localhost:5432/intelgraph_test',
    },
    neo4j: {
      uri: process.env.TEST_NEO4J_URI || 'bolt://localhost:7687',
      user: process.env.TEST_NEO4J_USER || 'neo4j',
      password: process.env.TEST_NEO4J_PASSWORD || 'test',
    },
    redis: {
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
    },
  },
  auth: {
    testUser: {
      email: 'test@intelgraph.ai',
      password: 'TestPassword123!',
      tenantId: 'test-tenant',
    },
  },
};

describe('🚀 IntelGraph Platform - End-to-End Integration Tests', () => {
  let authToken: string;
  let pgClient: Client;
  let redisClient: Redis;
  let neo4jDriver: any;
  let testCorrelationId: string;

  before(async function () {
    this.timeout(60000); // 1 minute setup timeout

    console.log('🔧 Setting up test environment...');

    // Initialize database connections
    pgClient = new Client({
      connectionString: TEST_CONFIG.databases.postgres.connectionString,
    });
    await pgClient.connect();

    redisClient = new Redis(TEST_CONFIG.databases.redis);

    neo4jDriver = neo4jDriver(
      TEST_CONFIG.databases.neo4j.uri,
      neo4jDriver.auth.basic(
        TEST_CONFIG.databases.neo4j.user,
        TEST_CONFIG.databases.neo4j.password,
      ),
    );

    // Verify database connectivity
    await pgClient.query('SELECT 1');
    await redisClient.ping();

    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();

    console.log('✅ Database connections established');

    // Authenticate test user
    const authResponse = await request(TEST_CONFIG.api.baseUrl)
      .post('/api/auth/login')
      .send({
        email: TEST_CONFIG.auth.testUser.email,
        password: TEST_CONFIG.auth.testUser.password,
      })
      .timeout(TEST_CONFIG.api.timeout);

    expect(authResponse.status).to.equal(200);
    expect(authResponse.body.token).to.be.a('string');
    authToken = authResponse.body.token;

    console.log('✅ Test user authenticated');
  });

  after(async function () {
    this.timeout(30000);

    console.log('🧹 Cleaning up test environment...');

    // Close database connections
    if (pgClient) await pgClient.end();
    if (redisClient) redisClient.disconnect();
    if (neo4jDriver) await neo4jDriver.close();

    console.log('✅ Test environment cleanup complete');
  });

  beforeEach(() => {
    testCorrelationId = randomUUID();
  });

  describe('🏗️ Core Platform Health', () => {
    it('should verify all system components are healthy', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/health')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('status', 'healthy');
      expect(response.body).to.have.property('components');
      expect(response.body.components).to.have.property('database', 'healthy');
      expect(response.body.components).to.have.property('redis', 'healthy');
      expect(response.body.components).to.have.property('neo4j', 'healthy');
    });

    it('should verify autonomous orchestrator is running', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/maestro/v1/health')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('orchestrator', 'running');
      expect(response.body).to.have.property('workers');
      expect(response.body.workers).to.be.greaterThan(0);
    });
  });

  describe('🔐 Authentication & Authorization', () => {
    it('should authenticate user and return valid JWT', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/auth/login')
        .send({
          email: TEST_CONFIG.auth.testUser.email,
          password: TEST_CONFIG.auth.testUser.password,
        })
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('token');
      expect(response.body).to.have.property('user');
      expect(response.body.user).to.have.property(
        'email',
        TEST_CONFIG.auth.testUser.email,
      );
    });

    it('should reject invalid credentials', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/auth/login')
        .send({
          email: TEST_CONFIG.auth.testUser.email,
          password: 'invalid-password',
        })
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(401);
    });

    it('should protect endpoints with authentication', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/graphs')
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(401);
    });
  });

  describe('🧠 Graph Analytics Engine', () => {
    let testGraphId: string;

    it('should create a new graph', async () => {
      const graphData = {
        name: `Test Graph ${Date.now()}`,
        description: 'End-to-end test graph',
        settings: {
          privacy: 'private',
          collaboration: false,
        },
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/graphs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(graphData)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('id');
      expect(response.body).to.have.property('name', graphData.name);

      testGraphId = response.body.id;
    });

    it('should add entities to the graph', async () => {
      const entityData = {
        type: 'Person',
        properties: {
          name: 'John Test',
          email: 'john@test.com',
          role: 'Analyst',
        },
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post(`/api/graphs/${testGraphId}/entities`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(entityData)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('id');
      expect(response.body).to.have.property('type', entityData.type);
      expect(response.body.properties).to.deep.include(entityData.properties);
    });

    it('should query entities with filtering', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get(`/api/graphs/${testGraphId}/entities`)
        .query({ type: 'Person', limit: 10 })
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('entities');
      expect(response.body.entities).to.be.an('array');
      expect(response.body).to.have.property('totalCount');
    });

    it('should perform graph analytics', async () => {
      const analysisRequest = {
        type: 'centrality',
        algorithm: 'pagerank',
        parameters: {
          iterations: 20,
          dampingFactor: 0.85,
        },
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post(`/api/graphs/${testGraphId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(analysisRequest)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('jobId');
      expect(response.body).to.have.property('status', 'started');
    });
  });

  describe('🤖 Autonomous Orchestration System', () => {
    let testRunId: string;

    it('should create an autonomous orchestration run', async () => {
      const runConfig = {
        goal: 'Analyze test dataset and generate intelligence report',
        autonomy: 2, // Guarded auto-plan
        mode: 'PLAN',
        budgets: {
          tokens: 50000,
          usd: 25.0,
          timeMinutes: 30,
        },
        reasonForAccess: 'End-to-end integration testing',
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/maestro/v1/runs')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(runConfig)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('runId');
      expect(response.body).to.have.property('status', 'pending');

      testRunId = response.body.runId;
    });

    it('should retrieve run status and progress', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get(`/api/maestro/v1/runs/${testRunId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('id', testRunId);
      expect(response.body).to.have.property('status');
      expect(response.body).to.have.property('budgets');
      expect(response.body).to.have.property('tasks');
    });

    it('should handle run approval workflow', async () => {
      // First, check if approval is required
      const statusResponse = await request(TEST_CONFIG.api.baseUrl)
        .get(`/api/maestro/v1/runs/${testRunId}/approvals`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      if (
        statusResponse.body.pending &&
        statusResponse.body.pending.length > 0
      ) {
        const approvalId = statusResponse.body.pending[0].id;

        const approvalResponse = await request(TEST_CONFIG.api.baseUrl)
          .post(`/api/maestro/v1/approvals/${approvalId}/approve`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Correlation-ID', testCorrelationId)
          .send({ reason: 'Integration test approval' })
          .timeout(TEST_CONFIG.api.timeout);

        expect(approvalResponse.status).to.equal(200);
      }
    });
  });

  describe('💰 Premium Model Routing', () => {
    it('should optimize model selection based on query complexity', async () => {
      const queryRequest = {
        query:
          'Analyze the relationship patterns in the network and identify potential risk indicators',
        context: {
          complexity: 'high',
          domain: 'intelligence',
          urgency: 'normal',
        },
        constraints: {
          maxCost: 10.0,
          maxLatency: 30000,
          minQuality: 0.8,
        },
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/maestro/v1/routing/optimize')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(queryRequest)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('selectedModel');
      expect(response.body).to.have.property('estimatedCost');
      expect(response.body).to.have.property('estimatedLatency');
      expect(response.body).to.have.property('routingReason');
    });

    it('should track Thompson sampling performance', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/maestro/v1/routing/analytics')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('models');
      expect(response.body).to.have.property('performance');
      expect(response.body).to.have.property('costEfficiency');
      expect(response.body.models).to.be.an('array');
    });
  });

  describe('🛡️ Compliance & Policy Enforcement', () => {
    it('should evaluate policy decisions', async () => {
      const policyRequest = {
        subject: 'test-user',
        action: 'data:export',
        resource: 'sensitive-dataset',
        context: {
          purpose: 'intelligence_analysis',
          environment: 'test',
        },
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/maestro/v1/policy/evaluate')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(policyRequest)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('allowed');
      expect(response.body).to.have.property('reason');
      expect(response.body).to.have.property('riskScore');
    });

    it('should generate compliance reports', async () => {
      const reportRequest = {
        framework: 'SOC2',
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/maestro/v1/compliance/reports')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(reportRequest)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('framework', 'SOC2');
      expect(response.body).to.have.property('summary');
      expect(response.body).to.have.property('violations');
      expect(response.body).to.have.property('recommendations');
    });
  });

  describe('📊 Audit & Logging System', () => {
    it('should record audit events', async () => {
      const auditEvent = {
        eventType: 'user_action',
        level: 'info',
        action: 'integration_test_execution',
        message: 'End-to-end integration test executed',
        details: {
          testSuite: 'e2e-integration',
          correlationId: testCorrelationId,
        },
        complianceRelevant: true,
        complianceFrameworks: ['SOC2'],
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/maestro/v1/audit/events')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(auditEvent)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('eventId');
    });

    it('should query audit events', async () => {
      const query = {
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date().toISOString(),
        correlationIds: [testCorrelationId],
        limit: 100,
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/maestro/v1/audit/events')
        .query(query)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('events');
      expect(response.body.events).to.be.an('array');
    });

    it('should verify audit trail integrity', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/maestro/v1/audit/verify')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send({
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        })
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('valid');
      expect(response.body).to.have.property('totalEvents');
      expect(response.body).to.have.property('validEvents');
      expect(response.body).to.have.property('invalidEvents');
    });
  });

  describe('🔗 SIG Integration Contracts', () => {
    it('should register evidence through SIG API', async () => {
      const evidenceData = {
        sourceId: 'test-source-001',
        data: Buffer.from('Test evidence data').toString('base64'),
        contentType: 'text/plain',
        license: 'internal-use-only',
        transforms: [
          {
            operation: 'normalization',
            algorithm: 'standard',
            parameters: {},
          },
        ],
        metadata: {
          classification: 'internal',
          tags: ['test', 'integration'],
        },
      };

      const response = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/sig/v1/evidence/register')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send(evidenceData)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(201);
      expect(response.body).to.have.property('evidenceId');
      expect(response.body).to.have.property('checksum');
      expect(response.body).to.have.property('receipt');
    });

    it('should validate provenance chain', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/sig/v1/provenance/validate')
        .query({ correlationId: testCorrelationId })
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('valid');
      expect(response.body).to.have.property('chain');
      expect(response.body.chain).to.be.an('array');
    });
  });

  describe('📈 Performance & Monitoring', () => {
    it('should retrieve system metrics', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/maestro/v1/metrics')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('system');
      expect(response.body).to.have.property('database');
      expect(response.body).to.have.property('orchestration');
      expect(response.body).to.have.property('timestamp');
    });

    it('should handle concurrent requests efficiently', async function () {
      this.timeout(60000); // 1 minute for concurrent test

      const concurrentRequests = Array.from({ length: 10 }, (_, i) =>
        request(TEST_CONFIG.api.baseUrl)
          .get('/api/health')
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Correlation-ID', `${testCorrelationId}-${i}`)
          .timeout(TEST_CONFIG.api.timeout),
      );

      const results = await Promise.allSettled(concurrentRequests);
      const successful = results.filter((r) => r.status === 'fulfilled').length;

      expect(successful).to.be.at.least(8); // At least 80% success rate
    });
  });

  describe('🚨 Error Handling & Resilience', () => {
    it('should handle graceful degradation', async () => {
      // Simulate high load condition
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/health')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .set('X-Load-Test', 'true')
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.be.oneOf([200, 503]); // Healthy or service unavailable

      if (response.status === 503) {
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include(
          'service temporarily unavailable',
        );
      }
    });

    it('should implement circuit breaker pattern', async () => {
      const response = await request(TEST_CONFIG.api.baseUrl)
        .get('/api/maestro/v1/circuit-breaker/status')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(response.status).to.equal(200);
      expect(response.body).to.have.property('circuits');
      expect(response.body.circuits).to.be.an('object');
    });
  });

  describe('🔄 End-to-End Workflow', () => {
    it('should execute complete intelligence analysis workflow', async function () {
      this.timeout(120000); // 2 minutes for full workflow

      console.log('🚀 Starting complete workflow test...');

      // Step 1: Create investigation workspace
      const workspaceResponse = await request(TEST_CONFIG.api.baseUrl)
        .post('/api/investigations')
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send({
          name: `E2E Test Investigation ${Date.now()}`,
          description: 'End-to-end workflow test',
        })
        .timeout(TEST_CONFIG.api.timeout);

      expect(workspaceResponse.status).to.equal(201);
      const workspaceId = workspaceResponse.body.id;

      // Step 2: Initiate autonomous analysis
      const analysisResponse = await request(TEST_CONFIG.api.baseUrl)
        .post(`/api/investigations/${workspaceId}/analyze`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .send({
          goal: 'Perform comprehensive analysis of test dataset',
          autonomy: 3,
          budgets: {
            tokens: 100000,
            usd: 50.0,
            timeMinutes: 60,
          },
        })
        .timeout(TEST_CONFIG.api.timeout);

      expect(analysisResponse.status).to.equal(202);
      const analysisId = analysisResponse.body.analysisId;

      // Step 3: Monitor progress
      let analysisComplete = false;
      let attempts = 0;
      const maxAttempts = 20; // 2 minutes max wait

      while (!analysisComplete && attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 6000)); // 6 second intervals

        const statusResponse = await request(TEST_CONFIG.api.baseUrl)
          .get(`/api/investigations/${workspaceId}/analyses/${analysisId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .set('X-Correlation-ID', testCorrelationId)
          .timeout(TEST_CONFIG.api.timeout);

        expect(statusResponse.status).to.equal(200);

        const status = statusResponse.body.status;
        console.log(
          `📊 Analysis status: ${status} (attempt ${attempts + 1}/${maxAttempts})`,
        );

        if (status === 'completed' || status === 'failed') {
          analysisComplete = true;
          expect(status).to.equal('completed');
        }

        attempts++;
      }

      expect(analysisComplete).to.be.true;

      // Step 4: Verify results and artifacts
      const resultsResponse = await request(TEST_CONFIG.api.baseUrl)
        .get(`/api/investigations/${workspaceId}/results`)
        .set('Authorization', `Bearer ${authToken}`)
        .set('X-Correlation-ID', testCorrelationId)
        .timeout(TEST_CONFIG.api.timeout);

      expect(resultsResponse.status).to.equal(200);
      expect(resultsResponse.body).to.have.property('results');
      expect(resultsResponse.body).to.have.property('artifacts');
      expect(resultsResponse.body).to.have.property('provenance');

      console.log('✅ Complete workflow test successful!');
    });
  });
});

// Test utilities
class TestUtils {
  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 30000,
    interval: number = 1000,
  ): Promise<boolean> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    return false;
  }

  static generateTestData(type: 'entity' | 'relationship' | 'graph') {
    const timestamp = Date.now();

    switch (type) {
      case 'entity':
        return {
          type: 'TestEntity',
          properties: {
            name: `Test Entity ${timestamp}`,
            category: 'test',
            created: new Date().toISOString(),
          },
        };

      case 'relationship':
        return {
          type: 'RELATED_TO',
          properties: {
            strength: Math.random(),
            created: new Date().toISOString(),
          },
        };

      case 'graph':
        return {
          name: `Test Graph ${timestamp}`,
          description: 'Generated test graph',
          settings: {
            privacy: 'private',
            collaboration: false,
          },
        };

      default:
        throw new Error(`Unknown test data type: ${type}`);
    }
  }
}

export { TestUtils };
