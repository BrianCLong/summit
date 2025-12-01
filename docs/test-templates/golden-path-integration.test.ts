/**
 * Golden Path Integration Test Template
 *
 * This template demonstrates comprehensive integration testing for the
 * Summit/IntelGraph golden path workflow:
 *
 * Investigation → Entities → Relationships → Copilot → Results
 *
 * Key Patterns:
 * - End-to-end workflow testing
 * - Database integration (PostgreSQL + Neo4j)
 * - GraphQL API integration
 * - Service orchestration
 * - Data consistency validation
 * - Real-time updates (WebSocket)
 *
 * Usage:
 * 1. Run with actual services (not mocks)
 * 2. Use test database instances
 * 3. Clean up after each test
 * 4. Validate complete workflows
 */

import { jest } from '@jest/globals';
import axios from 'axios';
import { WebSocket } from 'ws';
import type { Pool } from 'pg';
import type { Driver } from 'neo4j-driver';

describe('Golden Path Integration Tests', () => {
  // Service endpoints
  const API_URL = process.env.TEST_API_URL || 'http://localhost:4000/graphql';
  const WS_URL = process.env.TEST_WS_URL || 'ws://localhost:4000/graphql';

  // Database connections
  let pgPool: Pool;
  let neo4jDriver: Driver;

  // Test data
  let testInvestigationId: string;
  let testEntityIds: string[] = [];
  let testRelationshipIds: string[] = [];
  let testUserId: string = 'test-user-123';
  let authToken: string;

  // Setup before all tests
  beforeAll(async () => {
    // Initialize database connections
    const { Pool } = await import('pg');
    const neo4j = await import('neo4j-driver');

    pgPool = new Pool({
      host: process.env.TEST_PG_HOST || 'localhost',
      port: parseInt(process.env.TEST_PG_PORT || '5432'),
      database: process.env.TEST_PG_DATABASE || 'intelgraph_test',
      user: process.env.TEST_PG_USER || 'postgres',
      password: process.env.TEST_PG_PASSWORD || 'password',
    });

    neo4jDriver = neo4j.driver(
      process.env.TEST_NEO4J_URL || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.TEST_NEO4J_USER || 'neo4j',
        process.env.TEST_NEO4J_PASSWORD || 'password',
      ),
    );

    // Verify connectivity
    await pgPool.query('SELECT 1');
    await neo4jDriver.verifyConnectivity();

    // Get authentication token
    authToken = await getAuthToken();
  });

  // Cleanup after all tests
  afterAll(async () => {
    await cleanupTestData();
    await pgPool.end();
    await neo4jDriver.close();
  });

  // Cleanup after each test
  afterEach(async () => {
    await cleanupTestData();
  });

  // ===========================================
  // STEP 1: INVESTIGATION CREATION
  // ===========================================

  describe('Step 1: Create Investigation', () => {
    it('should create investigation via GraphQL API', async () => {
      // Arrange
      const mutation = `
        mutation CreateInvestigation($input: CreateInvestigationInput!) {
          createInvestigation(input: $input) {
            id
            name
            description
            status
            createdAt
            createdBy
          }
        }
      `;

      const variables = {
        input: {
          name: 'Test Investigation - Golden Path',
          description: 'Integration test for golden path workflow',
          priority: 'high',
          status: 'active',
        },
      };

      // Act
      const response = await graphqlRequest(mutation, variables, authToken);

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data.createInvestigation).toMatchObject({
        id: expect.any(String),
        name: variables.input.name,
        description: variables.input.description,
        status: 'active',
        createdBy: expect.any(String),
      });

      testInvestigationId = response.data.createInvestigation.id;
    });

    it('should persist investigation in PostgreSQL', async () => {
      // Arrange
      await createTestInvestigation();

      // Act
      const result = await pgPool.query(
        'SELECT * FROM investigations WHERE id = $1',
        [testInvestigationId],
      );

      // Assert
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        id: testInvestigationId,
        name: expect.any(String),
        status: 'active',
      });
    });

    it('should create investigation node in Neo4j', async () => {
      // Arrange
      await createTestInvestigation();

      // Act
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          'MATCH (i:Investigation {id: $id}) RETURN i',
          { id: testInvestigationId },
        );

        // Assert
        expect(result.records).toHaveLength(1);
        const investigation = result.records[0].get('i');
        expect(investigation.properties.id).toBe(testInvestigationId);
      } finally {
        await session.close();
      }
    });

    it('should create audit log entry', async () => {
      // Arrange
      await createTestInvestigation();

      // Act
      const result = await pgPool.query(
        `SELECT * FROM audit_logs
         WHERE entity_type = 'investigation'
         AND entity_id = $1
         AND action = 'created'`,
        [testInvestigationId],
      );

      // Assert
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0]).toMatchObject({
        entity_type: 'investigation',
        entity_id: testInvestigationId,
        action: 'created',
        user_id: expect.any(String),
      });
    });
  });

  // ===========================================
  // STEP 2: ENTITY MANAGEMENT
  // ===========================================

  describe('Step 2: Add Entities', () => {
    beforeEach(async () => {
      await createTestInvestigation();
    });

    it('should add multiple entities to investigation', async () => {
      // Arrange
      const entities = [
        {
          investigationId: testInvestigationId,
          type: 'Person',
          name: 'John Doe',
          properties: {
            email: 'john@example.com',
            role: 'Suspect',
          },
        },
        {
          investigationId: testInvestigationId,
          type: 'Organization',
          name: 'Acme Corp',
          properties: {
            industry: 'Technology',
            location: 'San Francisco',
          },
        },
        {
          investigationId: testInvestigationId,
          type: 'Location',
          name: 'San Francisco, CA',
          properties: {
            lat: 37.7749,
            lon: -122.4194,
          },
        },
      ];

      // Act
      for (const entity of entities) {
        const mutation = `
          mutation CreateEntity($input: CreateEntityInput!) {
            createEntity(input: $input) {
              id
              type
              name
              properties
            }
          }
        `;

        const response = await graphqlRequest(
          mutation,
          { input: entity },
          authToken,
        );

        expect(response.errors).toBeUndefined();
        testEntityIds.push(response.data.createEntity.id);
      }

      // Assert
      expect(testEntityIds).toHaveLength(3);
    });

    it('should sync entities to both PostgreSQL and Neo4j', async () => {
      // Arrange
      await addTestEntities();

      // Act & Assert - PostgreSQL
      const pgResult = await pgPool.query(
        'SELECT * FROM entities WHERE id = ANY($1)',
        [testEntityIds],
      );
      expect(pgResult.rows).toHaveLength(testEntityIds.length);

      // Act & Assert - Neo4j
      const session = neo4jDriver.session();
      try {
        const neo4jResult = await session.run(
          'MATCH (e:Entity) WHERE e.id IN $ids RETURN e',
          { ids: testEntityIds },
        );
        expect(neo4jResult.records).toHaveLength(testEntityIds.length);
      } finally {
        await session.close();
      }
    });

    it('should validate entity data consistency', async () => {
      // Arrange
      await addTestEntities();

      // Act
      const entityId = testEntityIds[0];

      // Get from PostgreSQL
      const pgResult = await pgPool.query(
        'SELECT * FROM entities WHERE id = $1',
        [entityId],
      );

      // Get from Neo4j
      const session = neo4jDriver.session();
      let neo4jEntity;
      try {
        const result = await session.run(
          'MATCH (e:Entity {id: $id}) RETURN e',
          { id: entityId },
        );
        neo4jEntity = result.records[0].get('e').properties;
      } finally {
        await session.close();
      }

      // Assert - Data should be consistent
      const pgEntity = pgResult.rows[0];
      expect(neo4jEntity.id).toBe(pgEntity.id);
      expect(neo4jEntity.name).toBe(pgEntity.name);
      expect(neo4jEntity.type).toBe(pgEntity.type);
    });

    it('should handle entity validation errors', async () => {
      // Arrange
      const invalidEntity = {
        investigationId: testInvestigationId,
        type: '', // Invalid: empty type
        name: 'Invalid Entity',
        properties: {},
      };

      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      // Act
      const response = await graphqlRequest(
        mutation,
        { input: invalidEntity },
        authToken,
      );

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toContain('type');
    });
  });

  // ===========================================
  // STEP 3: RELATIONSHIP CREATION
  // ===========================================

  describe('Step 3: Create Relationships', () => {
    beforeEach(async () => {
      await createTestInvestigation();
      await addTestEntities();
    });

    it('should create relationships between entities', async () => {
      // Arrange
      const relationships = [
        {
          investigationId: testInvestigationId,
          fromEntityId: testEntityIds[0], // John Doe
          toEntityId: testEntityIds[1], // Acme Corp
          type: 'WORKS_FOR',
          properties: {
            since: '2020-01-01',
            role: 'Employee',
          },
        },
        {
          investigationId: testInvestigationId,
          fromEntityId: testEntityIds[1], // Acme Corp
          toEntityId: testEntityIds[2], // San Francisco
          type: 'LOCATED_IN',
          properties: {
            since: '2015-01-01',
          },
        },
      ];

      // Act
      for (const relationship of relationships) {
        const mutation = `
          mutation CreateRelationship($input: CreateRelationshipInput!) {
            createRelationship(input: $input) {
              id
              type
              fromEntityId
              toEntityId
              properties
            }
          }
        `;

        const response = await graphqlRequest(
          mutation,
          { input: relationship },
          authToken,
        );

        expect(response.errors).toBeUndefined();
        testRelationshipIds.push(response.data.createRelationship.id);
      }

      // Assert
      expect(testRelationshipIds).toHaveLength(2);
    });

    it('should create graph relationships in Neo4j', async () => {
      // Arrange
      await createTestRelationships();

      // Act
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH (a)-[r]->(b)
           WHERE a.id IN $entityIds AND b.id IN $entityIds
           RETURN r`,
          { entityIds: testEntityIds },
        );

        // Assert
        expect(result.records.length).toBeGreaterThanOrEqual(
          testRelationshipIds.length,
        );
      } finally {
        await session.close();
      }
    });

    it('should support graph traversal queries', async () => {
      // Arrange
      await createTestRelationships();

      // Act - Find path between first and last entity
      const session = neo4jDriver.session();
      try {
        const result = await session.run(
          `MATCH path = (a:Entity {id: $startId})-[*1..3]-(b:Entity {id: $endId})
           RETURN path
           LIMIT 1`,
          {
            startId: testEntityIds[0],
            endId: testEntityIds[2],
          },
        );

        // Assert
        expect(result.records.length).toBeGreaterThan(0);
      } finally {
        await session.close();
      }
    });

    it('should prevent duplicate relationships', async () => {
      // Arrange
      await createTestRelationships();

      const duplicateRelationship = {
        investigationId: testInvestigationId,
        fromEntityId: testEntityIds[0],
        toEntityId: testEntityIds[1],
        type: 'WORKS_FOR', // Same as existing
        properties: {},
      };

      const mutation = `
        mutation CreateRelationship($input: CreateRelationshipInput!) {
          createRelationship(input: $input) {
            id
          }
        }
      `;

      // Act
      const response = await graphqlRequest(
        mutation,
        { input: duplicateRelationship },
        authToken,
      );

      // Assert
      expect(response.errors).toBeDefined();
      expect(response.errors[0].message).toContain('already exists');
    });
  });

  // ===========================================
  // STEP 4: COPILOT INTERACTION
  // ===========================================

  describe('Step 4: Copilot Analysis', () => {
    beforeEach(async () => {
      await createTestInvestigation();
      await addTestEntities();
      await createTestRelationships();
    });

    it('should start copilot run with goal', async () => {
      // Arrange
      const mutation = `
        mutation StartCopilotRun($input: StartCopilotRunInput!) {
          startCopilotRun(input: $input) {
            id
            goal
            status
            investigationId
            createdAt
          }
        }
      `;

      const variables = {
        input: {
          investigationId: testInvestigationId,
          goal: 'Analyze relationships and identify key actors',
        },
      };

      // Act
      const response = await graphqlRequest(mutation, variables, authToken);

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data.startCopilotRun).toMatchObject({
        id: expect.any(String),
        goal: variables.input.goal,
        status: expect.stringMatching(/pending|running/),
        investigationId: testInvestigationId,
      });
    });

    it('should process copilot run and generate insights', async () => {
      // Arrange
      const runId = await startCopilotRun();

      // Act - Poll for completion
      let run;
      let attempts = 0;
      const maxAttempts = 30;

      while (attempts < maxAttempts) {
        const query = `
          query GetCopilotRun($id: ID!) {
            copilotRun(id: $id) {
              id
              status
              insights {
                id
                type
                content
                confidence
              }
            }
          }
        `;

        const response = await graphqlRequest(
          query,
          { id: runId },
          authToken,
        );

        run = response.data.copilotRun;

        if (run.status === 'completed') {
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
        attempts++;
      }

      // Assert
      expect(run.status).toBe('completed');
      expect(run.insights).toBeDefined();
      expect(run.insights.length).toBeGreaterThan(0);
    });

    it('should store copilot insights in database', async () => {
      // Arrange
      const runId = await startCopilotRun();
      await waitForCopilotCompletion(runId);

      // Act
      const result = await pgPool.query(
        `SELECT * FROM copilot_insights
         WHERE run_id = $1`,
        [runId],
      );

      // Assert
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0]).toMatchObject({
        run_id: runId,
        type: expect.any(String),
        content: expect.any(Object),
        confidence: expect.any(Number),
      });
    });
  });

  // ===========================================
  // STEP 5: RESULTS VISUALIZATION
  // ===========================================

  describe('Step 5: Query and Visualize Results', () => {
    beforeEach(async () => {
      await createTestInvestigation();
      await addTestEntities();
      await createTestRelationships();
    });

    it('should query investigation graph data', async () => {
      // Arrange
      const query = `
        query GetInvestigation($id: ID!) {
          investigation(id: $id) {
            id
            name
            entities {
              id
              type
              name
              properties
            }
            relationships {
              id
              type
              fromEntityId
              toEntityId
              properties
            }
          }
        }
      `;

      // Act
      const response = await graphqlRequest(
        query,
        { id: testInvestigationId },
        authToken,
      );

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data.investigation).toMatchObject({
        id: testInvestigationId,
        entities: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            name: expect.any(String),
          }),
        ]),
        relationships: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            type: expect.any(String),
            fromEntityId: expect.any(String),
            toEntityId: expect.any(String),
          }),
        ]),
      });
    });

    it('should run graph analytics queries', async () => {
      // Arrange
      const mutation = `
        mutation RunGraphAnalytics($input: GraphAnalyticsInput!) {
          runGraphAnalytics(input: $input) {
            id
            algorithm
            results
          }
        }
      `;

      const variables = {
        input: {
          investigationId: testInvestigationId,
          algorithms: ['pagerank', 'centrality', 'community'],
        },
      };

      // Act
      const response = await graphqlRequest(mutation, variables, authToken);

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data.runGraphAnalytics).toBeDefined();
      expect(response.data.runGraphAnalytics.results).toBeDefined();
    });

    it('should export investigation data', async () => {
      // Arrange
      const mutation = `
        mutation ExportInvestigation($input: ExportInvestigationInput!) {
          exportInvestigation(input: $input) {
            id
            format
            url
            status
          }
        }
      `;

      const variables = {
        input: {
          investigationId: testInvestigationId,
          format: 'json',
          includeMetadata: true,
        },
      };

      // Act
      const response = await graphqlRequest(mutation, variables, authToken);

      // Assert
      expect(response.errors).toBeUndefined();
      expect(response.data.exportInvestigation).toMatchObject({
        id: expect.any(String),
        format: 'json',
        status: expect.stringMatching(/pending|completed/),
      });
    });
  });

  // ===========================================
  // REAL-TIME UPDATES (WebSocket)
  // ===========================================

  describe('Real-time Updates', () => {
    it('should receive investigation updates via WebSocket', async (done) => {
      // Arrange
      await createTestInvestigation();

      const ws = new WebSocket(WS_URL, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      // Subscribe to investigation updates
      ws.on('open', () => {
        ws.send(
          JSON.stringify({
            type: 'subscribe',
            payload: {
              query: `
                subscription OnInvestigationUpdate($id: ID!) {
                  investigationUpdated(id: $id) {
                    id
                    name
                    status
                  }
                }
              `,
              variables: {
                id: testInvestigationId,
              },
            },
          }),
        );
      });

      // Listen for updates
      ws.on('message', async (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'data') {
          // Assert
          expect(message.payload.data.investigationUpdated).toBeDefined();
          expect(message.payload.data.investigationUpdated.id).toBe(
            testInvestigationId,
          );

          ws.close();
          done();
        }
      });

      // Trigger update
      setTimeout(async () => {
        const mutation = `
          mutation UpdateInvestigation($input: UpdateInvestigationInput!) {
            updateInvestigation(input: $input) {
              id
              status
            }
          }
        `;

        await graphqlRequest(
          mutation,
          {
            input: {
              id: testInvestigationId,
              status: 'in_progress',
            },
          },
          authToken,
        );
      }, 1000);
    }, 10000);
  });

  // ===========================================
  // HELPER FUNCTIONS
  // ===========================================

  async function getAuthToken(): Promise<string> {
    // Mock authentication - replace with actual auth flow
    return 'test-auth-token';
  }

  async function graphqlRequest(
    query: string,
    variables: any,
    token: string,
  ): Promise<any> {
    const response = await axios.post(
      API_URL,
      { query, variables },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return response.data;
  }

  async function createTestInvestigation(): Promise<void> {
    const mutation = `
      mutation CreateInvestigation($input: CreateInvestigationInput!) {
        createInvestigation(input: $input) {
          id
        }
      }
    `;

    const response = await graphqlRequest(
      mutation,
      {
        input: {
          name: `Test Investigation ${Date.now()}`,
          description: 'Integration test investigation',
          status: 'active',
        },
      },
      authToken,
    );

    testInvestigationId = response.data.createInvestigation.id;
  }

  async function addTestEntities(): Promise<void> {
    const entities = [
      { type: 'Person', name: 'John Doe' },
      { type: 'Organization', name: 'Acme Corp' },
      { type: 'Location', name: 'San Francisco' },
    ];

    for (const entity of entities) {
      const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;

      const response = await graphqlRequest(
        mutation,
        {
          input: {
            investigationId: testInvestigationId,
            ...entity,
            properties: {},
          },
        },
        authToken,
      );

      testEntityIds.push(response.data.createEntity.id);
    }
  }

  async function createTestRelationships(): Promise<void> {
    const mutation = `
      mutation CreateRelationship($input: CreateRelationshipInput!) {
        createRelationship(input: $input) {
          id
        }
      }
    `;

    const response = await graphqlRequest(
      mutation,
      {
        input: {
          investigationId: testInvestigationId,
          fromEntityId: testEntityIds[0],
          toEntityId: testEntityIds[1],
          type: 'WORKS_FOR',
          properties: {},
        },
      },
      authToken,
    );

    testRelationshipIds.push(response.data.createRelationship.id);
  }

  async function startCopilotRun(): Promise<string> {
    const mutation = `
      mutation StartCopilotRun($input: StartCopilotRunInput!) {
        startCopilotRun(input: $input) {
          id
        }
      }
    `;

    const response = await graphqlRequest(
      mutation,
      {
        input: {
          investigationId: testInvestigationId,
          goal: 'Analyze test investigation',
        },
      },
      authToken,
    );

    return response.data.startCopilotRun.id;
  }

  async function waitForCopilotCompletion(runId: string): Promise<void> {
    let attempts = 0;
    const maxAttempts = 30;

    while (attempts < maxAttempts) {
      const query = `
        query GetCopilotRun($id: ID!) {
          copilotRun(id: $id) {
            status
          }
        }
      `;

      const response = await graphqlRequest(query, { id: runId }, authToken);

      if (response.data.copilotRun.status === 'completed') {
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    throw new Error('Copilot run timeout');
  }

  async function cleanupTestData(): Promise<void> {
    // Clean up PostgreSQL
    if (testInvestigationId) {
      await pgPool.query('DELETE FROM investigations WHERE id = $1', [
        testInvestigationId,
      ]);
    }

    // Clean up Neo4j
    if (testInvestigationId) {
      const session = neo4jDriver.session();
      try {
        await session.run(
          'MATCH (n) WHERE n.investigationId = $id DETACH DELETE n',
          { id: testInvestigationId },
        );
      } finally {
        await session.close();
      }
    }

    // Reset test data
    testInvestigationId = '';
    testEntityIds = [];
    testRelationshipIds = [];
  }
});
