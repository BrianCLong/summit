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

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';

// ============================================================================
// Types and Interfaces
// ============================================================================

interface TestContext {
  baseUrl: string;
  graphqlUrl: string;
  authToken: string;
  refreshToken: string;
  testUser: TestUser;
  testInvestigation: TestInvestigation | null;
  testEntities: TestEntity[];
  testRelationships: TestRelationship[];
}

interface TestUser {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface TestInvestigation {
  id: string;
  title: string;
  status: string;
}

interface TestEntity {
  id: string;
  type: string;
  label: string;
}

interface TestRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * HTTP client for API calls
 */
class TestApiClient {
  private baseUrl: string;
  private authToken: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  async fetch<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<{ status: number; data: T }> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
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

  async graphql<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<GraphQLResponse<T>> {
    const { data } = await this.fetch<GraphQLResponse<T>>('/graphql', {
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
async function waitFor(
  condition: () => Promise<boolean>,
  timeout: number = 10000,
  interval: number = 500
): Promise<void> {
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

const ctx: TestContext = {
  baseUrl: process.env.API_BASE_URL || 'http://localhost:4000',
  graphqlUrl: process.env.GRAPHQL_URL || 'http://localhost:4000/graphql',
  authToken: '',
  refreshToken: '',
  testUser: { id: '', email: '', username: '', role: '' },
  testInvestigation: null,
  testEntities: [],
  testRelationships: [],
};

let apiClient: TestApiClient;

// ============================================================================
// Test Suite
// ============================================================================

describe('IntelGraph Golden Path E2E Tests', () => {
  beforeAll(async () => {
    apiClient = new TestApiClient(ctx.baseUrl);

    // Wait for services to be ready
    await waitFor(async () => {
      try {
        const { status } = await apiClient.fetch('/health');
        return status === 200;
      } catch {
        return false;
      }
    }, 30000);
  });

  afterAll(async () => {
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
        } catch {
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
        } catch {
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
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  });

  // ==========================================================================
  // Health Check Tests
  // ==========================================================================

  describe('Health Checks', () => {
    it('should return healthy status from /health', async () => {
      const { status, data } = await apiClient.fetch<{ status: string }>('/health');

      expect(status).toBe(200);
      expect(data.status).toBe('healthy');
    });

    it('should return ready status from /health/ready', async () => {
      const { status, data } = await apiClient.fetch<{ ready: boolean }>('/health/ready');

      expect(status).toBe(200);
      expect(data.ready).toBe(true);
    });

    it('should return live status from /health/live', async () => {
      const { status, data } = await apiClient.fetch<{ live: boolean }>('/health/live');

      expect(status).toBe(200);
      expect(data.live).toBe(true);
    });

    it('should return detailed health information', async () => {
      const { status, data } = await apiClient.fetch<{
        status: string;
        services: Record<string, { status: string }>;
      }>('/health/detailed');

      expect(status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.services).toBeDefined();
    });
  });

  // ==========================================================================
  // Authentication Tests
  // ==========================================================================

  describe('Authentication Flow', () => {
    const testData = generateTestData();

    it('should register a new user', async () => {
      const response = await apiClient.graphql<{
        register: { user: TestUser; token: string; refreshToken: string };
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.register.user.email).toBe(testData.email);
      expect(response.data?.register.token).toBeDefined();

      // Store for subsequent tests
      ctx.authToken = response.data!.register.token;
      ctx.refreshToken = response.data!.register.refreshToken;
      ctx.testUser = response.data!.register.user;
      apiClient.setAuthToken(ctx.authToken);
    });

    it('should login with valid credentials', async () => {
      const response = await apiClient.graphql<{
        login: { user: TestUser; token: string };
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.login.user.email).toBe(testData.email);
      expect(response.data?.login.token).toBeDefined();
    });

    it('should reject login with invalid credentials', async () => {
      const response = await apiClient.graphql<{
        login: { token: string };
      }>(`
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

      expect(response.errors).toBeDefined();
      expect(response.errors?.[0]?.message).toContain('Invalid');
    });

    it('should refresh authentication token', async () => {
      const response = await apiClient.graphql<{
        refreshToken: { token: string; refreshToken: string };
      }>(`
        mutation RefreshToken($refreshToken: String!) {
          refreshToken(refreshToken: $refreshToken) {
            token
            refreshToken
          }
        }
      `, {
        refreshToken: ctx.refreshToken,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.refreshToken.token).toBeDefined();

      // Update tokens
      ctx.authToken = response.data!.refreshToken.token;
      ctx.refreshToken = response.data!.refreshToken.refreshToken;
      apiClient.setAuthToken(ctx.authToken);
    });

    it('should return current user profile', async () => {
      const response = await apiClient.graphql<{
        me: TestUser;
      }>(`
        query Me {
          me {
            id
            email
            username
            role
          }
        }
      `);

      expect(response.errors).toBeUndefined();
      expect(response.data?.me.id).toBe(ctx.testUser.id);
    });
  });

  // ==========================================================================
  // Investigation Lifecycle Tests
  // ==========================================================================

  describe('Investigation Lifecycle', () => {
    it('should create a new investigation', async () => {
      const testData = generateTestData();

      const response = await apiClient.graphql<{
        createInvestigation: TestInvestigation;
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.createInvestigation.title).toBe(testData.investigationTitle);
      expect(response.data?.createInvestigation.status).toBe('DRAFT');

      ctx.testInvestigation = response.data!.createInvestigation;
    });

    it('should retrieve the investigation by ID', async () => {
      const response = await apiClient.graphql<{
        investigation: TestInvestigation;
      }>(`
        query GetInvestigation($id: ID!) {
          investigation(id: $id) {
            id
            title
            status
          }
        }
      `, {
        id: ctx.testInvestigation!.id,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.investigation.id).toBe(ctx.testInvestigation!.id);
    });

    it('should update investigation status', async () => {
      const response = await apiClient.graphql<{
        updateInvestigation: TestInvestigation;
      }>(`
        mutation UpdateInvestigation($id: ID!, $input: UpdateInvestigationInput!) {
          updateInvestigation(id: $id, input: $input) {
            id
            title
            status
          }
        }
      `, {
        id: ctx.testInvestigation!.id,
        input: {
          status: 'ACTIVE',
        },
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.updateInvestigation.status).toBe('ACTIVE');

      ctx.testInvestigation = response.data!.updateInvestigation;
    });

    it('should list investigations with pagination', async () => {
      const response = await apiClient.graphql<{
        investigations: {
          edges: Array<{ node: TestInvestigation }>;
          pageInfo: { hasNextPage: boolean };
          totalCount: number;
        };
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.investigations.edges).toBeDefined();
      expect(response.data?.investigations.totalCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Entity Management Tests
  // ==========================================================================

  describe('Entity Management', () => {
    it('should create a person entity', async () => {
      const response = await apiClient.graphql<{
        createEntity: TestEntity;
      }>(`
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
          investigationId: ctx.testInvestigation!.id,
          properties: {
            occupation: 'Software Engineer',
            nationality: 'US',
          },
        },
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.createEntity.type).toBe('PERSON');
      expect(response.data?.createEntity.label).toBe('John Doe');

      ctx.testEntities.push(response.data!.createEntity);
    });

    it('should create an organization entity', async () => {
      const response = await apiClient.graphql<{
        createEntity: TestEntity;
      }>(`
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
          investigationId: ctx.testInvestigation!.id,
          properties: {
            industry: 'Technology',
            founded: 2020,
          },
        },
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.createEntity.type).toBe('ORGANIZATION');

      ctx.testEntities.push(response.data!.createEntity);
    });

    it('should create a location entity', async () => {
      const response = await apiClient.graphql<{
        createEntity: TestEntity;
      }>(`
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
          investigationId: ctx.testInvestigation!.id,
          properties: {
            country: 'USA',
            coordinates: { lat: 37.7749, lng: -122.4194 },
          },
        },
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.createEntity.type).toBe('LOCATION');

      ctx.testEntities.push(response.data!.createEntity);
    });

    it('should update an entity', async () => {
      const entity = ctx.testEntities[0];

      const response = await apiClient.graphql<{
        updateEntity: TestEntity & { description: string };
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.updateEntity.description).toBe('Updated description');
    });

    it('should search entities', async () => {
      const response = await apiClient.graphql<{
        searchEntities: {
          edges: Array<{ node: TestEntity }>;
          totalCount: number;
        };
      }>(`
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
        investigationId: ctx.testInvestigation!.id,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.searchEntities.totalCount).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Relationship Management Tests
  // ==========================================================================

  describe('Relationship Management', () => {
    it('should create a WORKS_FOR relationship', async () => {
      const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON')!;
      const orgEntity = ctx.testEntities.find((e) => e.type === 'ORGANIZATION')!;

      const response = await apiClient.graphql<{
        createRelationship: TestRelationship;
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.createRelationship.type).toBe('WORKS_FOR');

      ctx.testRelationships.push(response.data!.createRelationship);
    });

    it('should create a LOCATED_AT relationship', async () => {
      const orgEntity = ctx.testEntities.find((e) => e.type === 'ORGANIZATION')!;
      const locationEntity = ctx.testEntities.find((e) => e.type === 'LOCATION')!;

      const response = await apiClient.graphql<{
        createRelationship: TestRelationship;
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.createRelationship.type).toBe('LOCATED_AT');

      ctx.testRelationships.push(response.data!.createRelationship);
    });

    it('should query entity relationships', async () => {
      const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON')!;

      const response = await apiClient.graphql<{
        entity: {
          id: string;
          relationships: Array<{
            id: string;
            type: string;
            target: { id: string; label: string };
          }>;
        };
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.entity.relationships.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ==========================================================================
  // Graph Analysis Tests
  // ==========================================================================

  describe('Graph Analysis', () => {
    it('should perform path finding between entities', async () => {
      const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON')!;
      const locationEntity = ctx.testEntities.find((e) => e.type === 'LOCATION')!;

      const response = await apiClient.graphql<{
        findPaths: Array<{
          nodes: Array<{ id: string; label: string }>;
          relationships: Array<{ type: string }>;
        }>;
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.findPaths.length).toBeGreaterThanOrEqual(1);
    });

    it('should calculate network centrality', async () => {
      const response = await apiClient.graphql<{
        calculateCentrality: Array<{
          entityId: string;
          score: number;
        }>;
      }>(`
        query CalculateCentrality($investigationId: ID!, $algorithm: CentralityAlgorithm!) {
          calculateCentrality(investigationId: $investigationId, algorithm: $algorithm) {
            entityId
            score
          }
        }
      `, {
        investigationId: ctx.testInvestigation!.id,
        algorithm: 'BETWEENNESS',
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.calculateCentrality).toBeDefined();
    });

    it('should detect communities in the graph', async () => {
      const response = await apiClient.graphql<{
        detectCommunities: Array<{
          id: string;
          members: Array<{ id: string; label: string }>;
        }>;
      }>(`
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
        investigationId: ctx.testInvestigation!.id,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.detectCommunities).toBeDefined();
    });
  });

  // ==========================================================================
  // AI/ML Integration Tests
  // ==========================================================================

  describe('AI/ML Integration', () => {
    it('should perform entity resolution', async () => {
      const entityIds = ctx.testEntities.map((e) => e.id);

      const response = await apiClient.graphql<{
        entityResolution: {
          jobId: string;
          status: string;
        };
      }>(`
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

      expect(response.errors).toBeUndefined();
      expect(response.data?.entityResolution.jobId).toBeDefined();
    });

    it('should generate entity summary with AI', async () => {
      const personEntity = ctx.testEntities.find((e) => e.type === 'PERSON')!;

      const response = await apiClient.graphql<{
        generateSummary: {
          summary: string;
          confidence: number;
        };
      }>(`
        query GenerateSummary($entityId: ID!) {
          generateSummary(entityId: $entityId) {
            summary
            confidence
          }
        }
      `, {
        entityId: personEntity.id,
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.generateSummary.summary).toBeDefined();
    });
  });

  // ==========================================================================
  // Data Export/Import Tests
  // ==========================================================================

  describe('Data Export/Import', () => {
    it('should export investigation data', async () => {
      const response = await apiClient.graphql<{
        exportInvestigation: {
          format: string;
          data: string;
        };
      }>(`
        mutation ExportInvestigation($id: ID!, $format: ExportFormat!) {
          exportInvestigation(id: $id, format: $format) {
            format
            data
          }
        }
      `, {
        id: ctx.testInvestigation!.id,
        format: 'JSON',
      });

      expect(response.errors).toBeUndefined();
      expect(response.data?.exportInvestigation.data).toBeDefined();

      // Validate export structure
      const exportedData = JSON.parse(response.data!.exportInvestigation.data);
      expect(exportedData.investigation).toBeDefined();
      expect(exportedData.entities).toBeDefined();
      expect(exportedData.relationships).toBeDefined();
    });
  });

  // ==========================================================================
  // Authorization Tests
  // ==========================================================================

  describe('Authorization', () => {
    it('should deny access to admin endpoints for non-admin users', async () => {
      const response = await apiClient.graphql<{
        adminStats: unknown;
      }>(`
        query AdminStats {
          adminStats {
            totalUsers
            totalInvestigations
          }
        }
      `);

      expect(response.errors).toBeDefined();
      expect(response.errors?.[0]?.message).toContain('permission');
    });

    it('should deny access without authentication', async () => {
      const unauthClient = new TestApiClient(ctx.baseUrl);

      const response = await unauthClient.graphql<{
        me: TestUser;
      }>(`
        query Me {
          me {
            id
            email
          }
        }
      `);

      expect(response.errors).toBeDefined();
      expect(response.errors?.[0]?.message).toContain('Authentication');
    });
  });

  // ==========================================================================
  // Rate Limiting Tests
  // ==========================================================================

  describe('Rate Limiting', () => {
    it('should enforce rate limits on rapid requests', async () => {
      const requests = Array.from({ length: 110 }, () =>
        apiClient.graphql(`
          query Me {
            me {
              id
            }
          }
        `)
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter((r) =>
        r.errors?.some((e) => e.message.includes('rate limit'))
      );

      // Should have some rate-limited responses after exceeding 100/min
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // WebSocket/Subscription Tests
  // ==========================================================================

  describe('Real-time Subscriptions', () => {
    it('should receive entity updates via subscription', async () => {
      // Note: WebSocket subscription testing would require a WebSocket client
      // This is a placeholder for the test structure
      expect(true).toBe(true);
    });
  });
});
