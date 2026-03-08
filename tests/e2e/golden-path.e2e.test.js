"use strict";
/**
 * @fileoverview Golden Path E2E Test Suite
 *
 * Comprehensive end-to-end tests covering:
 * - Complete user workflows
 * - Investigation lifecycle
 * - Entity and relationship management
 * - AI/ML integration
 * - Authentication and authorization
 * - Real-time collaboration
 * - Data export/import
 *
 * @module tests/e2e/golden-path.e2e.test
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
// ============================================================================
// Test Utilities
// ============================================================================
/**
 * HTTP client for API calls
 */
class TestApiClient {
    baseUrl;
    authToken = null;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    setAuthToken(token) {
        this.authToken = token;
    }
    async fetch(path, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        const response = await fetch(`${this.baseUrl}${path}`, {
            ...options,
            headers,
        });
        const data = await response.json();
        return { status: response.status, data };
    }
    async graphql(query, variables) {
        const { data } = await this.fetch('/graphql', {
            method: 'POST',
            body: JSON.stringify({ query, variables }),
        });
        return data;
    }
}
/**
 * Generate unique test data
 */
function generateTestData() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return {
        email: `test-${timestamp}-${random}@intelgraph.test`,
        username: `testuser_${timestamp}_${random}`,
        password: 'TestP@ssw0rd123!',
        investigationTitle: `Test Investigation ${timestamp}`,
        entityLabel: `Test Entity ${timestamp}`,
    };
}
/**
 * Wait for condition with timeout
 */
async function waitFor(condition, timeout = 10000, interval = 500) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
}
// ============================================================================
// Test Context Setup
// ============================================================================
const ctx = {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
    graphqlUrl: process.env.GRAPHQL_URL || 'http://localhost:4000/graphql',
    authToken: '',
    refreshToken: '',
    testUser: { id: '', email: '', username: '', role: '' },
    testInvestigation: null,
    testEntities: [],
    testRelationships: [],
};
let apiClient;
// ============================================================================
// Test Suite
// ============================================================================
(0, globals_1.describe)('IntelGraph Golden Path E2E Tests', () => {
    (0, globals_1.beforeAll)(async () => {
        apiClient = new TestApiClient(ctx.baseUrl);
        // Wait for services to be ready
        await waitFor(async () => {
            try {
                const { status } = await apiClient.fetch('/health');
                return status === 200;
            }
            catch {
                return false;
            }
        }, 30000);
    });
    (0, globals_1.afterAll)(async () => {
        // Cleanup test data
        if (ctx.authToken) {
            apiClient.setAuthToken(ctx.authToken);
            // Delete test relationships
            for (const rel of ctx.testRelationships) {
                try {
                    await apiClient.graphql(`
            mutation DeleteRelationship($id: ID!) {
              deleteRelationship(id: $id)
            }
          `, { id: rel.id });
                }
                catch {
                    // Ignore cleanup errors
                }
            }
            // Delete test entities
            for (const entity of ctx.testEntities) {
                try {
                    await apiClient.graphql(`
            mutation DeleteEntity($id: ID!) {
              deleteEntity(id: $id)
            }
          `, { id: entity.id });
                }
                catch {
                    // Ignore cleanup errors
                }
            }
            // Delete test investigation
            if (ctx.testInvestigation) {
                try {
                    await apiClient.graphql(`
            mutation DeleteInvestigation($id: ID!) {
              deleteInvestigation(id: $id)
            }
          `, { id: ctx.testInvestigation.id });
                }
                catch {
                    // Ignore cleanup errors
                }
            }
        }
    });
    // ==========================================================================
    // Health Check Tests
    // ==========================================================================
    (0, globals_1.describe)('Health Checks', () => {
        (0, globals_1.it)('should return healthy status from /health', async () => {
            const { status, data } = await apiClient.fetch('/health');
            (0, globals_1.expect)(status).toBe(200);
            (0, globals_1.expect)(data.status).toBe('healthy');
        });
        (0, globals_1.it)('should return ready status from /health/ready', async () => {
            const { status, data } = await apiClient.fetch('/health/ready');
            (0, globals_1.expect)(status).toBe(200);
            (0, globals_1.expect)(data.ready).toBe(true);
        });
        (0, globals_1.it)('should return live status from /health/live', async () => {
            const { status, data } = await apiClient.fetch('/health/live');
            (0, globals_1.expect)(status).toBe(200);
            (0, globals_1.expect)(data.live).toBe(true);
        });
        (0, globals_1.it)('should return detailed health information', async () => {
            const { status, data } = await apiClient.fetch('/health/detailed');
            (0, globals_1.expect)(status).toBe(200);
            (0, globals_1.expect)(data.status).toBe('healthy');
            (0, globals_1.expect)(data.services).toBeDefined();
        });
    });
    // ==========================================================================
    // Authentication Tests
    // ==========================================================================
    (0, globals_1.describe)('Authentication Flow', () => {
        const testData = generateTestData();
        (0, globals_1.it)('should register a new user', async () => {
            const response = await apiClient.graphql(`
        mutation Register($input: RegisterInput!) {
          register(input: $input) {
            user {
              id
              email
              username
              role
            }
            token
            refreshToken
          }
        }
      `, {
                input: {
                    email: testData.email,
                    username: testData.username,
                    password: testData.password,
                    firstName: 'Test',
                    lastName: 'User',
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.register.user.email).toBe(testData.email);
            (0, globals_1.expect)(response.data?.register.token).toBeDefined();
            // Store for subsequent tests
            ctx.authToken = response.data.register.token;
            ctx.refreshToken = response.data.register.refreshToken;
            ctx.testUser = response.data.register.user;
            apiClient.setAuthToken(ctx.authToken);
        });
        (0, globals_1.it)('should login with valid credentials', async () => {
            const response = await apiClient.graphql(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            user {
              id
              email
              username
              role
            }
            token
          }
        }
      `, {
                input: {
                    email: testData.email,
                    password: testData.password,
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.login.user.email).toBe(testData.email);
            (0, globals_1.expect)(response.data?.login.token).toBeDefined();
        });
        (0, globals_1.it)('should reject login with invalid credentials', async () => {
            const response = await apiClient.graphql(`
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            token
          }
        }
      `, {
                input: {
                    email: testData.email,
                    password: 'WrongPassword123!',
                },
            });
            (0, globals_1.expect)(response.errors).toBeDefined();
            (0, globals_1.expect)(response.errors?.[0]?.message).toContain('Invalid');
        });
        (0, globals_1.it)('should refresh authentication token', async () => {
            const response = await apiClient.graphql(`
        mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            token
            refreshToken
          }
        }
      `, {
                refreshToken: ctx.refreshToken,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.refreshToken.token).toBeDefined();
            // Update tokens
            ctx.authToken = response.data.refreshToken.token;
            ctx.refreshToken = response.data.refreshToken.refreshToken;
            apiClient.setAuthToken(ctx.authToken);
        });
        (0, globals_1.it)('should return current user profile', async () => {
            const response = await apiClient.graphql(`
        query Me {
          me {
            id
            email
            username
            role
          }
        }
      `);
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.me.id).toBe(ctx.testUser.id);
        });
    });
    // ==========================================================================
    // Investigation Lifecycle Tests
    // ==========================================================================
    (0, globals_1.describe)('Investigation Lifecycle', () => {
        (0, globals_1.it)('should create a new investigation', async () => {
            const testData = generateTestData();
            const response = await apiClient.graphql(`
        mutation CreateInvestigation($input: CreateInvestigationInput!) {
          createInvestigation(input: $input) {
            id
            title
            status
          }
        }
      `, {
                input: {
                    title: testData.investigationTitle,
                    description: 'E2E test investigation',
                    priority: 'MEDIUM',
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.createInvestigation.title).toBe(testData.investigationTitle);
            (0, globals_1.expect)(response.data?.createInvestigation.status).toBe('DRAFT');
            ctx.testInvestigation = response.data.createInvestigation;
        });
        (0, globals_1.it)('should retrieve the investigation by ID', async () => {
            const response = await apiClient.graphql(`
        query GetInvestigation($id: ID!) {
          investigation(id: $id) {
            id
            title
            status
          }
        }
      `, {
                id: ctx.testInvestigation.id,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.investigation.id).toBe(ctx.testInvestigation.id);
        });
        (0, globals_1.it)('should update investigation status', async () => {
            const response = await apiClient.graphql(`
        mutation UpdateInvestigation($id: ID!, $input: UpdateInvestigationInput!) {
          updateInvestigation(id: $id, input: $input) {
            id
            title
            status
          }
        }
      `, {
                id: ctx.testInvestigation.id,
                input: {
                    status: 'ACTIVE',
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.updateInvestigation.status).toBe('ACTIVE');
            ctx.testInvestigation = response.data.updateInvestigation;
        });
        (0, globals_1.it)('should list investigations with pagination', async () => {
            const response = await apiClient.graphql(`
        query ListInvestigations($first: Int) {
          investigations(first: $first) {
            edges {
              node {
                id
                title
                status
              }
            }
            pageInfo {
              hasNextPage
            }
            totalCount
          }
        }
      `, {
                first: 10,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.investigations.edges).toBeDefined();
            (0, globals_1.expect)(response.data?.investigations.totalCount).toBeGreaterThanOrEqual(1);
        });
    });
    // ==========================================================================
    // Entity Management Tests
    // ==========================================================================
    (0, globals_1.describe)('Entity Management', () => {
        (0, globals_1.it)('should create a person entity', async () => {
            const response = await apiClient.graphql(`
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            type
            label
          }
        }
      `, {
                input: {
                    type: 'PERSON',
                    label: 'John Doe',
                    description: 'Test person entity',
                    investigationId: ctx.testInvestigation.id,
                    properties: {
                        occupation: 'Software Engineer',
                        nationality: 'US',
                    },
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.createEntity.type).toBe('PERSON');
            (0, globals_1.expect)(response.data?.createEntity.label).toBe('John Doe');
            ctx.testEntities.push(response.data.createEntity);
        });
        (0, globals_1.it)('should create an organization entity', async () => {
            const response = await apiClient.graphql(`
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            type
            label
          }
        }
      `, {
                input: {
                    type: 'ORGANIZATION',
                    label: 'Acme Corp',
                    description: 'Test organization entity',
                    investigationId: ctx.testInvestigation.id,
                    properties: {
                        industry: 'Technology',
                        founded: 2020,
                    },
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.createEntity.type).toBe('ORGANIZATION');
            ctx.testEntities.push(response.data.createEntity);
        });
        (0, globals_1.it)('should create a location entity', async () => {
            const response = await apiClient.graphql(`
        mutation CreateEntity($input: CreateEntityInput!) {
          createEntity(input: $input) {
            id
            type
            label
          }
        }
      `, {
                input: {
                    type: 'LOCATION',
                    label: 'San Francisco',
                    description: 'Test location entity',
                    investigationId: ctx.testInvestigation.id,
                    properties: {
                        country: 'USA',
                        coordinates: { lat: 37.7749, lng: -122.4194 },
                    },
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.createEntity.type).toBe('LOCATION');
            ctx.testEntities.push(response.data.createEntity);
        });
        (0, globals_1.it)('should update an entity', async () => {
            const entity = ctx.testEntities[0];
            const response = await apiClient.graphql(`
        mutation UpdateEntity($id: ID!, $input: UpdateEntityInput!) {
          updateEntity(id: $id, input: $input) {
            id
            type
            label
            description
          }
        }
      `, {
                id: entity.id,
                input: {
                    description: 'Updated description',
                    confidence: 0.9,
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.updateEntity.description).toBe('Updated description');
        });
        (0, globals_1.it)('should search entities', async () => {
            const response = await apiClient.graphql(`
        query SearchEntities($query: String!, $investigationId: ID) {
          searchEntities(query: $query, investigationId: $investigationId) {
            edges {
              node {
                id
                type
                label
              }
            }
            totalCount
          }
        }
      `, {
                query: 'John',
                investigationId: ctx.testInvestigation.id,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.searchEntities.totalCount).toBeGreaterThanOrEqual(1);
        });
    });
    // ==========================================================================
    // Relationship Management Tests
    // ==========================================================================
    (0, globals_1.describe)('Relationship Management', () => {
        (0, globals_1.it)('should create a WORKS_FOR relationship', async () => {
            const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON');
            const orgEntity = ctx.testEntities.find((e) => e.type === 'ORGANIZATION');
            const response = await apiClient.graphql(`
        mutation CreateRelationship($input: CreateRelationshipInput!) {
          createRelationship(input: $input) {
            id
            type
            sourceId
            targetId
          }
        }
      `, {
                input: {
                    type: 'WORKS_FOR',
                    sourceId: personEntity.id,
                    targetId: orgEntity.id,
                    confidence: 0.95,
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.createRelationship.type).toBe('WORKS_FOR');
            ctx.testRelationships.push(response.data.createRelationship);
        });
        (0, globals_1.it)('should create a LOCATED_AT relationship', async () => {
            const orgEntity = ctx.testEntities.find((e) => e.type === 'ORGANIZATION');
            const locationEntity = ctx.testEntities.find((e) => e.type === 'LOCATION');
            const response = await apiClient.graphql(`
        mutation CreateRelationship($input: CreateRelationshipInput!) {
          createRelationship(input: $input) {
            id
            type
            sourceId
            targetId
          }
        }
      `, {
                input: {
                    type: 'LOCATED_AT',
                    sourceId: orgEntity.id,
                    targetId: locationEntity.id,
                    confidence: 0.9,
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.createRelationship.type).toBe('LOCATED_AT');
            ctx.testRelationships.push(response.data.createRelationship);
        });
        (0, globals_1.it)('should query entity relationships', async () => {
            const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON');
            const response = await apiClient.graphql(`
        query GetEntityRelationships($id: ID!) {
          entity(id: $id) {
            id
            relationships {
              id
              type
              target {
                id
                label
              }
            }
          }
        }
      `, {
                id: personEntity.id,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.entity.relationships.length).toBeGreaterThanOrEqual(1);
        });
    });
    // ==========================================================================
    // Graph Analysis Tests
    // ==========================================================================
    (0, globals_1.describe)('Graph Analysis', () => {
        (0, globals_1.it)('should perform path finding between entities', async () => {
            const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON');
            const locationEntity = ctx.testEntities.find((e) => e.type === 'LOCATION');
            const response = await apiClient.graphql(`
        query FindPaths($sourceId: ID!, $targetId: ID!, $maxDepth: Int) {
          findPaths(sourceId: $sourceId, targetId: $targetId, maxDepth: $maxDepth) {
            nodes {
              id
              label
            }
            relationships {
              type
            }
          }
        }
      `, {
                sourceId: personEntity.id,
                targetId: locationEntity.id,
                maxDepth: 3,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.findPaths.length).toBeGreaterThanOrEqual(1);
        });
        (0, globals_1.it)('should calculate network centrality', async () => {
            const response = await apiClient.graphql(`
        query CalculateCentrality($investigationId: ID!, $algorithm: CentralityAlgorithm!) {
          calculateCentrality(investigationId: $investigationId, algorithm: $algorithm) {
            entityId
            score
          }
        }
      `, {
                investigationId: ctx.testInvestigation.id,
                algorithm: 'BETWEENNESS',
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.calculateCentrality).toBeDefined();
        });
        (0, globals_1.it)('should detect communities in the graph', async () => {
            const response = await apiClient.graphql(`
        query DetectCommunities($investigationId: ID!) {
          detectCommunities(investigationId: $investigationId) {
            id
            members {
              id
              label
            }
          }
        }
      `, {
                investigationId: ctx.testInvestigation.id,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.detectCommunities).toBeDefined();
        });
    });
    // ==========================================================================
    // AI/ML Integration Tests
    // ==========================================================================
    (0, globals_1.describe)('AI/ML Integration', () => {
        (0, globals_1.it)('should perform entity resolution', async () => {
            const entityIds = ctx.testEntities.map((e) => e.id);
            const response = await apiClient.graphql(`
        mutation EntityResolution($input: EntityResolutionInput!) {
          entityResolution(input: $input) {
            jobId
            status
          }
        }
      `, {
                input: {
                    entityIds,
                    threshold: 0.8,
                },
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.entityResolution.jobId).toBeDefined();
        });
        (0, globals_1.it)('should generate entity summary with AI', async () => {
            const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON');
            const response = await apiClient.graphql(`
        query GenerateSummary($entityId: ID!) {
          generateSummary(entityId: $entityId) {
            summary
            confidence
          }
        }
      `, {
                entityId: personEntity.id,
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.generateSummary.summary).toBeDefined();
        });
    });
    // ==========================================================================
    // Data Export/Import Tests
    // ==========================================================================
    (0, globals_1.describe)('Data Export/Import', () => {
        (0, globals_1.it)('should export investigation data', async () => {
            const response = await apiClient.graphql(`
        mutation ExportInvestigation($id: ID!, $format: ExportFormat!) {
          exportInvestigation(id: $id, format: $format) {
            format
            data
          }
        }
      `, {
                id: ctx.testInvestigation.id,
                format: 'JSON',
            });
            (0, globals_1.expect)(response.errors).toBeUndefined();
            (0, globals_1.expect)(response.data?.exportInvestigation.data).toBeDefined();
            // Validate export structure
            const exportedData = JSON.parse(response.data.exportInvestigation.data);
            (0, globals_1.expect)(exportedData.investigation).toBeDefined();
            (0, globals_1.expect)(exportedData.entities).toBeDefined();
            (0, globals_1.expect)(exportedData.relationships).toBeDefined();
        });
    });
    // ==========================================================================
    // Authorization Tests
    // ==========================================================================
    (0, globals_1.describe)('Authorization', () => {
        (0, globals_1.it)('should deny access to admin endpoints for non-admin users', async () => {
            const response = await apiClient.graphql(`
        query AdminStats {
          adminStats {
            totalUsers
            totalInvestigations
          }
        }
      `);
            (0, globals_1.expect)(response.errors).toBeDefined();
            (0, globals_1.expect)(response.errors?.[0]?.message).toContain('permission');
        });
        (0, globals_1.it)('should deny access without authentication', async () => {
            const unauthClient = new TestApiClient(ctx.baseUrl);
            const response = await unauthClient.graphql(`
        query Me {
          me {
            id
            email
          }
        }
      `);
            (0, globals_1.expect)(response.errors).toBeDefined();
            (0, globals_1.expect)(response.errors?.[0]?.message).toContain('Authentication');
        });
    });
    // ==========================================================================
    // Rate Limiting Tests
    // ==========================================================================
    (0, globals_1.describe)('Rate Limiting', () => {
        (0, globals_1.it)('should enforce rate limits on rapid requests', async () => {
            const requests = Array.from({ length: 110 }, () => apiClient.graphql(`
          query Me {
            me {
              id
            }
          }
        `));
            const responses = await Promise.all(requests);
            const rateLimited = responses.filter((r) => r.errors?.some((e) => e.message.includes('rate limit')));
            // Should have some rate-limited responses after exceeding 100/min
            (0, globals_1.expect)(rateLimited.length).toBeGreaterThan(0);
        });
    });
    // ==========================================================================
    // WebSocket/Subscription Tests
    // ==========================================================================
    (0, globals_1.describe)('Real-time Subscriptions', () => {
        (0, globals_1.it)('should receive entity updates via subscription', async () => {
            // Note: WebSocket subscription testing would require a WebSocket client
            // This is a placeholder for the test structure
            (0, globals_1.expect)(true).toBe(true);
        });
    });
});
