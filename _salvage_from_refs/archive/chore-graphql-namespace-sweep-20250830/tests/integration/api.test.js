/**
 * IntelGraph API Integration Tests
 * 
 * MIT License
 * Copyright (c) 2025 IntelGraph
 */

const request = require('supertest');
const { createApp } = require('../../services/api/src/app.js');
const { neo4jConnection } = require('../../services/api/src/db/neo4j.js');
const { postgresConnection } = require('../../services/api/src/db/postgres.js');
const { redisConnection } = require('../../services/api/src/db/redis.js');
const jwt = require('jsonwebtoken');

describe('IntelGraph API Integration Tests', () => {
  let app;
  let authToken;
  const testTenantId = 'test-tenant-123';

  beforeAll(async () => {
    // Initialize test environment
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test-secret-key';
    process.env.OIDC_ISSUER = 'https://test.auth.com';
    
    // Create application
    app = await createApp();
    
    // Setup test data and authentication
    authToken = 'Bearer test-jwt-token';
    
    // Clear test data
    await clearTestData();
  });

  afterAll(async () => {
    // Cleanup connections
    await neo4jConnection.close();
    await postgresConnection.close();
    await redisConnection.close();
  });

  beforeEach(async () => {
    // Reset test state before each test
    await clearTestData();
  });

  async function clearTestData() {
    try {
      // Clear Neo4j test data
      await neo4jConnection.executeQuery(
        'MATCH (n {tenantId: $tenantId}) DETACH DELETE n',
        { tenantId: testTenantId }
      );

      // Clear PostgreSQL test data
      await postgresConnection.query(
        'DELETE FROM entity_metadata WHERE tenant_id = $1',
        [testTenantId]
      );
      await postgresConnection.query(
        'DELETE FROM investigations WHERE tenant_id = $1',
        [testTenantId]
      );
    } catch (error) {
      console.error('Failed to clear test data:', error);
    }
  }

  describe('Health Checks', () => {
    test('GET /health should return service status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
    });

    test('GET /metrics should return monitoring data', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GraphQL API', () => {
    test('should handle GraphQL queries', async () => {
      const query = `
        query {
          __schema {
            queryType {
              name
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({ query })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data.__schema.queryType.name).toBe('Query');
    });

    test('should create and query entities', async () => {
      // Create entity mutation
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            name
            type
            confidence
          }
        }
      `;

      const entityInput = {
        type: 'PERSON',
        name: 'John Doe',
        description: 'Test person',
        properties: { age: 30, location: 'New York' },
        sourceIds: []
      };

      const createResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: entityInput }
        })
        .expect(200);

      expect(createResponse.body.data.createEntity).toMatchObject({
        name: 'John Doe',
        type: 'PERSON',
        confidence: 1
      });

      const entityId = createResponse.body.data.createEntity.id;

      // Query entity
      const queryEntity = `
        query GetEntity($id: ID!) {
          entity(id: $id) {
            id
            name
            type
            properties
          }
        }
      `;

      const queryResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: queryEntity,
          variables: { id: entityId }
        })
        .expect(200);

      expect(queryResponse.body.data.entity).toMatchObject({
        id: entityId,
        name: 'John Doe',
        type: 'PERSON'
      });
    });

    test('should enforce tenant isolation', async () => {
      const differentTenantId = 'different-tenant-456';

      // Create entity in one tenant
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            name
          }
        }
      `;

      const entityInput = {
        type: 'ORGANIZATION',
        name: 'Secret Corp',
        sourceIds: []
      };

      const createResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: entityInput }
        })
        .expect(200);

      const entityId = createResponse.body.data.createEntity.id;

      // Try to query from different tenant
      const queryEntity = `
        query GetEntity($id: ID!) {
          entity(id: $id) {
            id
            name
          }
        }
      `;

      const queryResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', differentTenantId)
        .send({
          query: queryEntity,
          variables: { id: entityId }
        })
        .expect(200);

      // Should not find entity from different tenant
      expect(queryResponse.body.data.entity).toBeNull();
    });

    describe('Access Control', () => {
      let testCaseId;
      let nonMemberToken;

      beforeEach(async () => {
        // Create a test case
        const caseResult = await neo4jConnection.executeQuery(
          `CREATE (c:Case {id: 'test-case-for-auth-123', name: 'Auth Test Case'}) RETURN c.id AS id`
        );
        testCaseId = caseResult.records[0].get('id');

        // Generate a token for a user who is NOT a member of the testCaseId
        // For simplicity, let's assume a user with ID 'non-member-user' and no cases
        nonMemberToken = jwt.sign(
          { sub: 'non-member-user', email: 'nonmember@example.com', cases: [] },
          process.env.JWT_SECRET,
          { algorithm: 'HS256' }
        );
      });

      test('should return 403 for caseAnswers if user is not a member of the case', async () => {
        const query = `
          query CaseAnswers($caseId: ID!) {
            caseAnswers(caseId: $caseId) {
              id
              content
            }
          }
        `;

        await request(app)
          .post('/graphql')
          .set('Authorization', `Bearer ${nonMemberToken}`)
          .set('X-Tenant-ID', testTenantId)
          .send({
            query,
            variables: { caseId: testCaseId }
          })
          .expect(403); // Expecting a 403 Forbidden status
      });
    });

    describe('Case Management', () => {
      let testCaseId;
      let testAnswerId;
      let testUserId;

      beforeEach(async () => {
        // Create a test user
        const userResult = await neo4jConnection.executeQuery(
          `CREATE (u:User {id: 'test-user-123', name: 'Test User'}) RETURN u.id AS id`
        );
        testUserId = userResult.records[0].get('id');

        // Create a test case
        const caseResult = await neo4jConnection.executeQuery(
          `CREATE (c:Case {id: 'test-case-123', name: 'Test Case'}) RETURN c.id AS id`
        );
        testCaseId = caseResult.records[0].get('id');

        // Create a test answer
        const answerResult = await neo4jConnection.executeQuery(
          `CREATE (a:Answer {id: 'test-answer-123', content: 'Test Answer Content'}) RETURN a.id AS id`
        );
        testAnswerId = answerResult.records[0].get('id');
      });

      test('should attach an answer to a case and record custody', async () => {
        const attachMutation = `
          mutation AttachAnswerToCase($caseId: ID!, $answerId: ID!, $sig: String!) {
            attachAnswerToCase(caseId: $caseId, answerId: $answerId, sig: $sig)
          }
        `;
        const signature = 'test-signature-abc';

        const response = await request(app)
          .post('/graphql')
          .set('Authorization', authToken)
          .set('X-Tenant-ID', testTenantId)
          .send({
            query: attachMutation,
            variables: {
              caseId: testCaseId,
              answerId: testAnswerId,
              sig: signature
            }
          })
          .expect(200);

        expect(response.body.data.attachAnswerToCase).toBe(true);

        // Verify CONTAINS edge
        const containsEdge = await neo4jConnection.executeQuery(
          `MATCH (c:Case {id: $caseId})-[r:CONTAINS]->(a:Answer {id: $answerId}) RETURN r`,
          { caseId: testCaseId, answerId: testAnswerId }
        );
        expect(containsEdge.records.length).toBe(1);

        // Verify COLLECTED edge
        const collectedEdge = await neo4jConnection.executeQuery(
          `MATCH (u:User {id: $userId})-[r:COLLECTED]->(a:Answer {id: $answerId}) RETURN r.sig AS sig`,
          { userId: testUserId, answerId: testAnswerId }
        );
        expect(collectedEdge.records.length).toBe(1);
        expect(collectedEdge.records[0].get('sig')).toBe(signature);
      });
    });
  });

  describe('Write Coalescing', () => {
    let originalExecuteQuery;
    let executeQueryCallCount;

    beforeAll(() => {
      // Mock executeQuery to count calls
      originalExecuteQuery = neo4jConnection.executeQuery;
      executeQueryCallCount = 0;
      neo4jConnection.executeQuery = async (...args) => {
        executeQueryCallCount++;
        return originalExecuteQuery(...args);
      };
    });

    afterAll(() => {
      // Restore original executeQuery
      neo4jConnection.executeQuery = originalExecuteQuery;
    });

    test('should coalesce CITED writes under concurrency', async () => {
      const numRequests = 100;
      const createAnswerAndCite = async (index) => {
        const reqId = `test-req-${index}`;
        const userId = `test-user-${index}`;
        const answerId = `test-answer-${index}`;
        const entityId = `test-entity-${index}`;

        // Simulate the enqueue calls that would happen in assistant.ts
        // This is a simplified version for testing coalescing
        enqueue({
          type: "audit",
          payload: {
            type: "answer_creation",
            userId, reqId, answerId, mode: "test", tokens: 10, exp: "test",
          }
        });
        enqueue({
          type: "cite",
          payload: { answerId, id: entityId, kind: 'entity' }
        });
      };

      // Simulate concurrent requests
      const promises = [];
      for (let i = 0; i < numRequests; i++) {
        promises.push(createAnswerAndCite(i));
      }
      await Promise.all(promises);

      // Wait for coalescer to flush
      await new Promise(resolve => setTimeout(resolve, 50)); // Wait for more than maxDelayMs (20ms)

      // Expect fewer executeQuery calls than numRequests * 2 (if not coalesced at all)
      // Each answer_creation and each cite will trigger a runCypher call in coalescer.ts
      // So, for 100 requests, we expect 100 for answer_creations (as writeAudits is not batched)
      // and 1 for cites (as writeCites is batched). Total 101.
      expect(executeQueryCallCount).toBe(numRequests + 1);
    });
  });

  describe('Real-time Features', () => {
    test('should handle WebSocket connections', (done) => {
      const io = require('socket.io-client');
      const client = io('http://localhost:4000', {
        auth: {
          token: 'test-token'
        }
      });

      client.on('connect', () => {
        client.emit('investigation:join', 'test-investigation-123');
      });

      client.on('investigation:state', (state) => {
        expect(state).toHaveProperty('investigation');
        expect(state).toHaveProperty('timestamp');
        client.disconnect();
        done();
      });

      client.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        done(error);
      });
    });
  });

  describe('Authentication & Authorization', () => {
    test('should reject requests without authentication', async () => {
      const query = `
        query {
          entities {
            id
            name
          }
        }
      `;

      await request(app)
        .post('/graphql')
        .send({ query })
        .expect(401);
    });

    test('should enforce role-based permissions', async () => {
      const restrictedMutation = `
        mutation DeleteEntity($id: ID!) {
          deleteEntity(id: $id)
        }
      `;

      // Mock viewer role token (should not have delete permissions)
      const viewerToken = 'Bearer viewer-jwt-token';

      await request(app)
        .post('/graphql')
        .set('Authorization', viewerToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: restrictedMutation,
          variables: { id: 'test-entity-id' }
        })
        .expect(403);
    });
  });

  describe('Performance & Reliability', () => {
    test('should handle concurrent requests', async () => {
      const query = `
        query {
          entities(limit: 10) {
            id
            name
            type
          }
        }
      `;

      // Create multiple concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        request(app)
          .post('/graphql')
          .set('Authorization', authToken)
          .set('X-Tenant-ID', testTenantId)
          .send({ query })
      );

      const responses = await Promise.all(requests);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('data');
      });
    });

    test('should handle malformed GraphQL queries gracefully', async () => {
      const malformedQuery = `
        query {
          entities {
            id
            nonExistentField
            invalidNesting {
              anotherInvalidField
            }
          }
        }
      `;

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({ query: malformedQuery })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors).toHaveLength(1);
      expect(response.body.errors[0]).toHaveProperty('message');
    });
  });

  describe('Data Validation', () => {
    test('should validate entity input data', async () => {
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            name
            type
          }
        }
      `;

      // Invalid entity type
      const invalidInput = {
        type: 'INVALID_TYPE',
        name: 'Test Entity',
        sourceIds: []
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: invalidInput }
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });

    test('should validate confidence scores', async () => {
      const createMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            confidence
          }
        }
      `;

      // Invalid confidence score (> 1.0)
      const invalidInput = {
        type: 'PERSON',
        name: 'Test Person',
        confidence: 1.5,
        sourceIds: []
      };

      const response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createMutation,
          variables: { input: invalidInput }
        })
        .expect(400);

      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('Analytics Integration', () => {
    test('should perform pathfinding between entities', async () => {
      // First create two entities and a relationship
      const createEntityMutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const entity1Response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createEntityMutation,
          variables: {
            input: {
              type: 'PERSON',
              name: 'Alice',
              sourceIds: []
            }
          }
        })
        .expect(200);

      const entity2Response = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createEntityMutation,
          variables: {
            input: {
              type: 'PERSON',
              name: 'Bob',
              sourceIds: []
            }
          }
        })
        .expect(200);

      const entity1Id = entity1Response.body.data.createEntity.id;
      const entity2Id = entity2Response.body.data.createEntity.id;

      // Create relationship
      const createRelationshipMutation = `
        mutation CreateRelationship($input: CreateRelationshipInput!) {
          createRelationship(input: $input) {
            id
          }
        }
      `;

      await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: createRelationshipMutation,
          variables: {
            input: {
              type: 'CONNECTED_TO',
              sourceId: entity1Id,
              targetId: entity2Id,
              sourceIds: []
            }
          }
        })
        .expect(200);

      // Test pathfinding
      const pathfindingQuery = `
        query FindPaths($input: PathfindingInput!) {
          findPaths(input: $input) {
            paths {
              length
              nodes {
                id
                name
              }
            }
            totalPaths
          }
        }
      `;

      const pathResponse = await request(app)
        .post('/graphql')
        .set('Authorization', authToken)
        .set('X-Tenant-ID', testTenantId)
        .send({
          query: pathfindingQuery,
          variables: {
            input: {
              sourceId: entity1Id,
              targetId: entity2Id,
              algorithm: 'SHORTEST_PATH'
            }
          }
        })
        .expect(200);

      expect(pathResponse.body.data.findPaths.paths).toHaveLength(1);
      expect(pathResponse.body.data.findPaths.paths[0].length).toBe(1);
    });
  });
});