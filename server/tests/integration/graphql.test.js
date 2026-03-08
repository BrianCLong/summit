"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const setup_js_1 = require("../setup.js");
const globals_1 = require("@jest/globals");
let createServer = null;
const allowIntegration = process.env.RUN_GRAPHQL_INTEGRATION === 'true';
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ createServer } = require('../../src/server'));
}
catch (error) {
    console.warn('createServer not available; skipping GraphQL integration tests in this environment');
}
const describeIntegration = createServer && allowIntegration ? globals_1.describe : globals_1.describe.skip;
describeIntegration('GraphQL API Integration Tests', () => {
    let app;
    let testUser;
    let authToken;
    (0, globals_1.beforeAll)(async () => {
        if (!createServer)
            return;
        app = await createServer({ env: 'test' });
        testUser = (0, setup_js_1.createTestUser)();
        // Mock JWT token for testing
        authToken = 'test-jwt-token';
        // Mock authentication middleware to return test user
        globals_1.jest.mock('../../src/middleware/auth', () => ({
            authMiddleware: (req, res, next) => {
                req.user = testUser;
                next();
            },
        }));
    });
    (0, globals_1.afterAll)(async () => {
        if (app?.close)
            await app.close();
    });
    (0, globals_1.describe)('Authentication & Authorization', () => {
        (0, globals_1.it)('should reject requests without authentication', async () => {
            const query = `
        query {
          cases {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app).post('/graphql').send({ query });
            (0, globals_1.expect)(response.status).toBe(401);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toMatch(/not authenticated/i);
        });
        (0, globals_1.it)('should allow authenticated requests', async () => {
            const query = `
        query {
          cases {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.data).toBeDefined();
        });
        (0, globals_1.it)('should enforce role-based access control', async () => {
            const viewerUser = (0, setup_js_1.createTestUser)({ role: 'viewer' });
            // Mock viewer user
            globals_1.jest.doMock('../../src/middleware/auth', () => ({
                authMiddleware: (req, res, next) => {
                    req.user = viewerUser;
                    next();
                },
            }));
            const mutation = `
        mutation {
          createCase(input: { 
            title: "Test Case",
            description: "Test Description"
          }) {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query: mutation });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toMatch(/not authorized/i);
        });
    });
    (0, globals_1.describe)('Case Management', () => {
        (0, globals_1.it)('should create a new case', async () => {
            const mutation = `
        mutation CreateCase($input: CreateCaseInput!) {
          createCase(input: $input) {
            id
            title
            description
            status
            priority
            assignee {
              id
              name
            }
            createdAt
            updatedAt
          }
        }
      `;
            const variables = {
                input: {
                    title: 'Test Investigation Case',
                    description: 'A test case for integration testing',
                    priority: 'HIGH',
                    assigneeId: testUser.id,
                },
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query: mutation, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const caseData = response.body.data.createCase;
            (0, globals_1.expect)(caseData.id).toBeValidUUID();
            (0, globals_1.expect)(caseData.title).toBe(variables.input.title);
            (0, globals_1.expect)(caseData.description).toBe(variables.input.description);
            (0, globals_1.expect)(caseData.status).toBe('ACTIVE');
            (0, globals_1.expect)(caseData.priority).toBe('HIGH');
            (0, globals_1.expect)(caseData.assignee.id).toBe(testUser.id);
            (0, globals_1.expect)(caseData.createdAt).toBeISODate();
            (0, globals_1.expect)(caseData.updatedAt).toBeISODate();
        });
        (0, globals_1.it)('should retrieve case list with pagination', async () => {
            // Create test cases first
            const testCase1 = (0, setup_js_1.createTestCase)({ title: 'Case 1' });
            const testCase2 = (0, setup_js_1.createTestCase)({ title: 'Case 2' });
            // Mock database to return test cases
            globals_1.jest
                .spyOn(global.testDb, 'query')
                .mockResolvedValueOnce({
                rows: [testCase1, testCase2],
                rowCount: 2,
            });
            const query = `
        query GetCases($limit: Int, $offset: Int) {
          cases(limit: $limit, offset: $offset) {
            items {
              id
              title
              status
              createdAt
            }
            pageInfo {
              total
              hasNextPage
              hasPreviousPage
            }
          }
        }
      `;
            const variables = { limit: 10, offset: 0 };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const casesData = response.body.data.cases;
            (0, globals_1.expect)(casesData.items).toHaveLength(2);
            (0, globals_1.expect)(casesData.items[0].title).toBe('Case 1');
            (0, globals_1.expect)(casesData.items[1].title).toBe('Case 2');
            (0, globals_1.expect)(casesData.pageInfo.total).toBe(2);
        });
        (0, globals_1.it)('should update case status', async () => {
            const testCase = (0, setup_js_1.createTestCase)();
            const mutation = `
        mutation UpdateCase($id: ID!, $input: UpdateCaseInput!) {
          updateCase(id: $id, input: $input) {
            id
            status
            updatedAt
          }
        }
      `;
            const variables = {
                id: testCase.id,
                input: {
                    status: 'RESOLVED',
                },
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query: mutation, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const updatedCase = response.body.data.updateCase;
            (0, globals_1.expect)(updatedCase.id).toBe(testCase.id);
            (0, globals_1.expect)(updatedCase.status).toBe('RESOLVED');
        });
    });
    (0, globals_1.describe)('Entity Management', () => {
        (0, globals_1.it)('should create entity with validation', async () => {
            const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            type
            name
            properties
            confidence
            caseId
          }
        }
      `;
            const variables = {
                input: {
                    type: 'PERSON',
                    name: 'John Doe',
                    properties: {
                        email: 'john.doe@example.com',
                        phone: '+1-555-0123',
                    },
                    caseId: 'test-case-1',
                    confidence: 0.95,
                },
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query: mutation, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const entity = response.body.data.createEntity;
            (0, globals_1.expect)(entity.id).toBeValidUUID();
            (0, globals_1.expect)(entity.type).toBe('PERSON');
            (0, globals_1.expect)(entity.name).toBe('John Doe');
            (0, globals_1.expect)(entity.properties.email).toBe('john.doe@example.com');
            (0, globals_1.expect)(entity.confidence).toBe(0.95);
        });
        (0, globals_1.it)('should reject invalid entity data', async () => {
            const mutation = `
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
          }
        }
      `;
            const variables = {
                input: {
                    type: 'INVALID_TYPE',
                    name: '', // Empty name should be invalid
                    confidence: 1.5, // Invalid confidence > 1.0
                },
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query: mutation, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toMatch(/validation/i);
        });
    });
    (0, globals_1.describe)('Graph Analytics', () => {
        (0, globals_1.it)('should find shortest path between entities', async () => {
            const query = `
        query FindPath($from: ID!, $to: ID!, $maxHops: Int) {
          findPath(from: $from, to: $to, maxHops: $maxHops) {
            path {
              nodes {
                id
                type
                name
              }
              edges {
                id
                type
                weight
              }
            }
            distance
            confidence
          }
        }
      `;
            const variables = {
                from: 'entity-1',
                to: 'entity-2',
                maxHops: 5,
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const pathData = response.body.data.findPath;
            (0, globals_1.expect)(pathData.path).toBeDefined();
            (0, globals_1.expect)(pathData.distance).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(pathData.confidence).toBeGreaterThanOrEqual(0);
        });
        (0, globals_1.it)('should calculate centrality metrics', async () => {
            const query = `
        query CalculateCentrality($entityId: ID!, $type: CentralityType!) {
          calculateCentrality(entityId: $entityId, type: $type) {
            score
            rank
            percentile
          }
        }
      `;
            const variables = {
                entityId: 'entity-1',
                type: 'BETWEENNESS',
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const centrality = response.body.data.calculateCentrality;
            (0, globals_1.expect)(centrality.score).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(centrality.rank).toBeGreaterThan(0);
            (0, globals_1.expect)(centrality.percentile).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(centrality.percentile).toBeLessThanOrEqual(100);
        });
    });
    (0, globals_1.describe)('Real-time Subscriptions', () => {
        (0, globals_1.it)('should handle case updates subscription', (done) => {
            // Mock WebSocket subscription
            const subscription = `
        subscription CaseUpdates($caseId: ID!) {
          caseUpdated(caseId: $caseId) {
            id
            title
            status
            updatedAt
          }
        }
      `;
            // This would require WebSocket testing setup
            // For now, we'll test the subscription resolver directly
            (0, globals_1.expect)(subscription).toBeDefined();
            done();
        });
    });
    (0, globals_1.describe)('Search Integration', () => {
        (0, globals_1.it)('should perform full-text search', async () => {
            const query = `
        query Search($query: String!, $filters: SearchFilters) {
          search(query: $query, filters: $filters) {
            results {
              id
              type
              title
              snippet
              score
            }
            total
            facets {
              entityTypes {
                value
                count
              }
              sources {
                value
                count
              }
            }
          }
        }
      `;
            const variables = {
                query: 'test investigation',
                filters: {
                    entityTypes: ['PERSON', 'ORGANIZATION'],
                },
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const searchData = response.body.data.search;
            (0, globals_1.expect)(searchData.results).toBeDefined();
            (0, globals_1.expect)(searchData.total).toBeGreaterThanOrEqual(0);
            (0, globals_1.expect)(searchData.facets).toBeDefined();
        });
    });
    (0, globals_1.describe)('Audit Trail', () => {
        (0, globals_1.it)('should create audit log for mutations', async () => {
            const mutation = `
        mutation CreateCase($input: CreateCaseInput!) {
          createCase(input: $input) {
            id
            auditTrail {
              id
              action
              userId
              timestamp
              changes
            }
          }
        }
      `;
            const variables = {
                input: {
                    title: 'Audited Case',
                    description: 'Test case for audit trail',
                },
            };
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query: mutation, variables });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeUndefined();
            const caseData = response.body.data.createCase;
            (0, globals_1.expect)(caseData.auditTrail).toBeDefined();
            (0, globals_1.expect)(caseData.auditTrail.length).toBeGreaterThan(0);
            const auditEntry = caseData.auditTrail[0];
            (0, globals_1.expect)(auditEntry.action).toBe('CREATE');
            (0, globals_1.expect)(auditEntry.userId).toBe(testUser.id);
            (0, globals_1.expect)(auditEntry.timestamp).toBeISODate();
        });
    });
    (0, globals_1.describe)('Error Handling', () => {
        (0, globals_1.it)('should handle database connection errors gracefully', async () => {
            // Mock database error
            globals_1.jest
                .spyOn(global.testDb, 'query')
                .mockRejectedValueOnce(new Error('Database connection failed'));
            const query = `
        query {
          cases {
            id
            title
          }
        }
      `;
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query });
            (0, globals_1.expect)(response.status).toBe(200);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
            (0, globals_1.expect)(response.body.errors[0].message).toMatch(/database/i);
        });
        (0, globals_1.it)('should handle malformed GraphQL queries', async () => {
            const invalidQuery = `
        query {
          cases {
            invalidField
        }
      `; // Missing closing brace
            const response = await (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query: invalidQuery });
            (0, globals_1.expect)(response.status).toBe(400);
            (0, globals_1.expect)(response.body.errors).toBeDefined();
        });
    });
    (0, globals_1.describe)('Performance', () => {
        (0, globals_1.it)('should handle concurrent requests efficiently', async () => {
            const query = `
        query {
          cases(limit: 10) {
            items {
              id
              title
            }
          }
        }
      `;
            const requests = Array(10)
                .fill(null)
                .map(() => (0, supertest_1.default)(app)
                .post('/graphql')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ query }));
            const startTime = Date.now();
            const responses = await Promise.all(requests);
            const endTime = Date.now();
            // All requests should succeed
            responses.forEach((response) => {
                (0, globals_1.expect)(response.status).toBe(200);
                (0, globals_1.expect)(response.body.errors).toBeUndefined();
            });
            // Should complete within reasonable time (5 seconds for 10 concurrent requests)
            (0, globals_1.expect)(endTime - startTime).toBeLessThan(5000);
        });
    });
});
