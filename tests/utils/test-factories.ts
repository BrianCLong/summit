/**
 * Test Data Factories
 *
 * Provides factory functions for creating test data with sensible defaults.
 * Use these to create consistent test fixtures across all test suites.
 */

import * as crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface TestUser {
  id: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'ANALYST' | 'VIEWER';
  department?: string;
  clearanceLevel?: string;
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
}

export interface TestEntity {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
  labels: string[];
  investigationId?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TestRelationship {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties?: Record<string, unknown>;
  investigationId?: string;
  createdAt: Date;
}

export interface TestInvestigation {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  ownerId: string;
  teamMembers?: string[];
  classification?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface TestSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  createdAt: Date;
  ip?: string;
  userAgent?: string;
}

export interface TestAuditEntry {
  id: string;
  action: string;
  actorId: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
  timestamp: Date;
}

// ============================================================================
// Helper Functions
// ============================================================================

let idCounter = 0;

/**
 * Generate a unique ID for test data
 */
export const generateId = (prefix: string = 'test'): string => {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}-${crypto.randomBytes(4).toString('hex')}`;
};

/**
 * Generate a random email
 */
export const generateEmail = (prefix: string = 'user'): string => {
  return `${prefix}-${crypto.randomBytes(4).toString('hex')}@test.example.com`;
};

/**
 * Generate a random string
 */
export const generateString = (length: number = 10): string => {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};

/**
 * Generate a random date within range
 */
export const generateDate = (
  start: Date = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end: Date = new Date()
): Date => {
  const startTime = start.getTime();
  const endTime = end.getTime();
  return new Date(startTime + Math.random() * (endTime - startTime));
};

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test user with sensible defaults
 */
export const createTestUser = (overrides: Partial<TestUser> = {}): TestUser => {
  const id = generateId('user');
  return {
    id,
    email: generateEmail(),
    username: `user_${generateString(8)}`,
    firstName: 'Test',
    lastName: 'User',
    role: 'ANALYST',
    department: 'Intelligence',
    clearanceLevel: 'SECRET',
    isActive: true,
    createdAt: new Date(),
    ...overrides,
  };
};

/**
 * Create an admin user
 */
export const createTestAdmin = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({
    role: 'ADMIN',
    clearanceLevel: 'TOP_SECRET',
    ...overrides,
  });
};

/**
 * Create a viewer user
 */
export const createTestViewer = (overrides: Partial<TestUser> = {}): TestUser => {
  return createTestUser({
    role: 'VIEWER',
    clearanceLevel: 'CONFIDENTIAL',
    ...overrides,
  });
};

/**
 * Create a test entity with sensible defaults
 */
export const createTestEntity = (overrides: Partial<TestEntity> = {}): TestEntity => {
  const type = overrides.type || 'Person';
  return {
    id: generateId('entity'),
    type,
    name: `Test ${type}`,
    properties: {
      source: 'test',
      confidence: 0.9,
    },
    labels: [type],
    createdAt: new Date(),
    ...overrides,
  };
};

/**
 * Create a Person entity
 */
export const createTestPerson = (overrides: Partial<TestEntity> = {}): TestEntity => {
  return createTestEntity({
    type: 'Person',
    name: `Person ${generateString(6)}`,
    properties: {
      firstName: 'John',
      lastName: 'Doe',
      occupation: 'Unknown',
      ...overrides.properties,
    },
    labels: ['Person', 'Entity'],
    ...overrides,
  });
};

/**
 * Create an Organization entity
 */
export const createTestOrganization = (overrides: Partial<TestEntity> = {}): TestEntity => {
  return createTestEntity({
    type: 'Organization',
    name: `Org ${generateString(6)}`,
    properties: {
      industry: 'Technology',
      country: 'US',
      ...overrides.properties,
    },
    labels: ['Organization', 'Entity'],
    ...overrides,
  });
};

/**
 * Create a test relationship
 */
export const createTestRelationship = (overrides: Partial<TestRelationship> = {}): TestRelationship => {
  return {
    id: generateId('rel'),
    type: 'RELATED_TO',
    sourceId: generateId('entity'),
    targetId: generateId('entity'),
    properties: {},
    createdAt: new Date(),
    ...overrides,
  };
};

/**
 * Create a test investigation
 */
export const createTestInvestigation = (overrides: Partial<TestInvestigation> = {}): TestInvestigation => {
  return {
    id: generateId('inv'),
    title: `Investigation ${generateString(8)}`,
    description: 'Test investigation description',
    status: 'ACTIVE',
    ownerId: generateId('user'),
    teamMembers: [],
    classification: 'CONFIDENTIAL',
    createdAt: new Date(),
    ...overrides,
  };
};

/**
 * Create a test session
 */
export const createTestSession = (overrides: Partial<TestSession> = {}): TestSession => {
  return {
    id: generateId('session'),
    userId: generateId('user'),
    token: `token_${crypto.randomBytes(32).toString('hex')}`,
    refreshToken: `refresh_${crypto.randomBytes(32).toString('hex')}`,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    ip: '127.0.0.1',
    userAgent: 'test-agent',
    ...overrides,
  };
};

/**
 * Create a test audit entry
 */
export const createTestAuditEntry = (overrides: Partial<TestAuditEntry> = {}): TestAuditEntry => {
  return {
    id: generateId('audit'),
    action: 'TEST_ACTION',
    actorId: generateId('user'),
    resourceType: 'entity',
    resourceId: generateId('entity'),
    timestamp: new Date(),
    ...overrides,
  };
};

// ============================================================================
// Batch Factories
// ============================================================================

/**
 * Create multiple test users
 */
export const createTestUsers = (count: number, overrides: Partial<TestUser> = {}): TestUser[] => {
  return Array.from({ length: count }, () => createTestUser(overrides));
};

/**
 * Create multiple test entities
 */
export const createTestEntities = (count: number, overrides: Partial<TestEntity> = {}): TestEntity[] => {
  return Array.from({ length: count }, () => createTestEntity(overrides));
};

/**
 * Create a connected graph of entities and relationships
 */
export const createTestGraph = (nodeCount: number = 5): {
  entities: TestEntity[];
  relationships: TestRelationship[];
} => {
  const entities = createTestEntities(nodeCount);

  const relationships: TestRelationship[] = [];

  // Create a connected graph (simple chain)
  for (let i = 0; i < entities.length - 1; i++) {
    relationships.push(
      createTestRelationship({
        sourceId: entities[i].id,
        targetId: entities[i + 1].id,
        type: 'CONNECTED_TO',
      })
    );
  }

  // Add some cross-connections
  if (entities.length >= 3) {
    relationships.push(
      createTestRelationship({
        sourceId: entities[0].id,
        targetId: entities[entities.length - 1].id,
        type: 'RELATED_TO',
      })
    );
  }

  return { entities, relationships };
};

/**
 * Create a complete investigation with entities and relationships
 */
export const createTestInvestigationWithData = (): {
  investigation: TestInvestigation;
  owner: TestUser;
  entities: TestEntity[];
  relationships: TestRelationship[];
} => {
  const owner = createTestUser({ role: 'ANALYST' });
  const investigation = createTestInvestigation({ ownerId: owner.id });

  const alice = createTestPerson({
    name: 'Alice Chen',
    investigationId: investigation.id,
    createdBy: owner.id,
  });

  const bob = createTestPerson({
    name: 'Bob Martinez',
    investigationId: investigation.id,
    createdBy: owner.id,
  });

  const techcorp = createTestOrganization({
    name: 'TechCorp',
    investigationId: investigation.id,
    createdBy: owner.id,
  });

  const entities = [alice, bob, techcorp];

  const relationships = [
    createTestRelationship({
      type: 'EMPLOYED_BY',
      sourceId: alice.id,
      targetId: techcorp.id,
      investigationId: investigation.id,
    }),
    createTestRelationship({
      type: 'EMPLOYED_BY',
      sourceId: bob.id,
      targetId: techcorp.id,
      investigationId: investigation.id,
    }),
    createTestRelationship({
      type: 'WORKS_WITH',
      sourceId: alice.id,
      targetId: bob.id,
      investigationId: investigation.id,
    }),
  ];

  return { investigation, owner, entities, relationships };
};

// ============================================================================
// Mock Data Builders (Fluent API)
// ============================================================================

/**
 * Fluent builder for test users
 */
export class TestUserBuilder {
  private user: Partial<TestUser> = {};

  withId(id: string): this {
    this.user.id = id;
    return this;
  }

  withEmail(email: string): this {
    this.user.email = email;
    return this;
  }

  withRole(role: TestUser['role']): this {
    this.user.role = role;
    return this;
  }

  withDepartment(department: string): this {
    this.user.department = department;
    return this;
  }

  withClearance(level: string): this {
    this.user.clearanceLevel = level;
    return this;
  }

  inactive(): this {
    this.user.isActive = false;
    return this;
  }

  build(): TestUser {
    return createTestUser(this.user);
  }
}

/**
 * Fluent builder for test entities
 */
export class TestEntityBuilder {
  private entity: Partial<TestEntity> = {};

  withId(id: string): this {
    this.entity.id = id;
    return this;
  }

  withType(type: string): this {
    this.entity.type = type;
    return this;
  }

  withName(name: string): this {
    this.entity.name = name;
    return this;
  }

  withProperties(properties: Record<string, unknown>): this {
    this.entity.properties = properties;
    return this;
  }

  withLabels(labels: string[]): this {
    this.entity.labels = labels;
    return this;
  }

  inInvestigation(investigationId: string): this {
    this.entity.investigationId = investigationId;
    return this;
  }

  build(): TestEntity {
    return createTestEntity(this.entity);
  }
}

// Factory access
export const userBuilder = () => new TestUserBuilder();
export const entityBuilder = () => new TestEntityBuilder();

// ============================================================================
// Exports
// ============================================================================

export default {
  generateId,
  generateEmail,
  generateString,
  generateDate,
  createTestUser,
  createTestAdmin,
  createTestViewer,
  createTestEntity,
  createTestPerson,
  createTestOrganization,
  createTestRelationship,
  createTestInvestigation,
  createTestSession,
  createTestAuditEntry,
  createTestUsers,
  createTestEntities,
  createTestGraph,
  createTestInvestigationWithData,
  userBuilder,
  entityBuilder,
};
