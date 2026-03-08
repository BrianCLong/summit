"use strict";
/**
 * Test Data Factories
 *
 * Provides factory functions for creating test data with sensible defaults.
 * Use these to create consistent test fixtures across all test suites.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityBuilder = exports.userBuilder = exports.TestEntityBuilder = exports.TestUserBuilder = exports.createTestInvestigationWithData = exports.createTestGraph = exports.createTestEntities = exports.createTestUsers = exports.createTestAuditEntry = exports.createTestSession = exports.createTestInvestigation = exports.createTestRelationship = exports.createTestOrganization = exports.createTestPerson = exports.createTestEntity = exports.createTestViewer = exports.createTestAdmin = exports.createTestUser = exports.generateDate = exports.generateString = exports.generateEmail = exports.generateId = void 0;
const crypto = __importStar(require("crypto"));
// ============================================================================
// Helper Functions
// ============================================================================
let idCounter = 0;
/**
 * Generate a unique ID for test data
 */
const generateId = (prefix = 'test') => {
    idCounter++;
    return `${prefix}-${Date.now()}-${idCounter}-${crypto.randomBytes(4).toString('hex')}`;
};
exports.generateId = generateId;
/**
 * Generate a random email
 */
const generateEmail = (prefix = 'user') => {
    return `${prefix}-${crypto.randomBytes(4).toString('hex')}@test.example.com`;
};
exports.generateEmail = generateEmail;
/**
 * Generate a random string
 */
const generateString = (length = 10) => {
    return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
};
exports.generateString = generateString;
/**
 * Generate a random date within range
 */
const generateDate = (start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), end = new Date()) => {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return new Date(startTime + Math.random() * (endTime - startTime));
};
exports.generateDate = generateDate;
// ============================================================================
// Factory Functions
// ============================================================================
/**
 * Create a test user with sensible defaults
 */
const createTestUser = (overrides = {}) => {
    const id = (0, exports.generateId)('user');
    return {
        id,
        email: (0, exports.generateEmail)(),
        username: `user_${(0, exports.generateString)(8)}`,
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
exports.createTestUser = createTestUser;
/**
 * Create an admin user
 */
const createTestAdmin = (overrides = {}) => {
    return (0, exports.createTestUser)({
        role: 'ADMIN',
        clearanceLevel: 'TOP_SECRET',
        ...overrides,
    });
};
exports.createTestAdmin = createTestAdmin;
/**
 * Create a viewer user
 */
const createTestViewer = (overrides = {}) => {
    return (0, exports.createTestUser)({
        role: 'VIEWER',
        clearanceLevel: 'CONFIDENTIAL',
        ...overrides,
    });
};
exports.createTestViewer = createTestViewer;
/**
 * Create a test entity with sensible defaults
 */
const createTestEntity = (overrides = {}) => {
    const type = overrides.type || 'Person';
    return {
        id: (0, exports.generateId)('entity'),
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
exports.createTestEntity = createTestEntity;
/**
 * Create a Person entity
 */
const createTestPerson = (overrides = {}) => {
    return (0, exports.createTestEntity)({
        type: 'Person',
        name: `Person ${(0, exports.generateString)(6)}`,
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
exports.createTestPerson = createTestPerson;
/**
 * Create an Organization entity
 */
const createTestOrganization = (overrides = {}) => {
    return (0, exports.createTestEntity)({
        type: 'Organization',
        name: `Org ${(0, exports.generateString)(6)}`,
        properties: {
            industry: 'Technology',
            country: 'US',
            ...overrides.properties,
        },
        labels: ['Organization', 'Entity'],
        ...overrides,
    });
};
exports.createTestOrganization = createTestOrganization;
/**
 * Create a test relationship
 */
const createTestRelationship = (overrides = {}) => {
    return {
        id: (0, exports.generateId)('rel'),
        type: 'RELATED_TO',
        sourceId: (0, exports.generateId)('entity'),
        targetId: (0, exports.generateId)('entity'),
        properties: {},
        createdAt: new Date(),
        ...overrides,
    };
};
exports.createTestRelationship = createTestRelationship;
/**
 * Create a test investigation
 */
const createTestInvestigation = (overrides = {}) => {
    return {
        id: (0, exports.generateId)('inv'),
        title: `Investigation ${(0, exports.generateString)(8)}`,
        description: 'Test investigation description',
        status: 'ACTIVE',
        ownerId: (0, exports.generateId)('user'),
        teamMembers: [],
        classification: 'CONFIDENTIAL',
        createdAt: new Date(),
        ...overrides,
    };
};
exports.createTestInvestigation = createTestInvestigation;
/**
 * Create a test session
 */
const createTestSession = (overrides = {}) => {
    return {
        id: (0, exports.generateId)('session'),
        userId: (0, exports.generateId)('user'),
        token: `token_${crypto.randomBytes(32).toString('hex')}`,
        refreshToken: `refresh_${crypto.randomBytes(32).toString('hex')}`,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        ip: '127.0.0.1',
        userAgent: 'test-agent',
        ...overrides,
    };
};
exports.createTestSession = createTestSession;
/**
 * Create a test audit entry
 */
const createTestAuditEntry = (overrides = {}) => {
    return {
        id: (0, exports.generateId)('audit'),
        action: 'TEST_ACTION',
        actorId: (0, exports.generateId)('user'),
        resourceType: 'entity',
        resourceId: (0, exports.generateId)('entity'),
        timestamp: new Date(),
        ...overrides,
    };
};
exports.createTestAuditEntry = createTestAuditEntry;
// ============================================================================
// Batch Factories
// ============================================================================
/**
 * Create multiple test users
 */
const createTestUsers = (count, overrides = {}) => {
    return Array.from({ length: count }, () => (0, exports.createTestUser)(overrides));
};
exports.createTestUsers = createTestUsers;
/**
 * Create multiple test entities
 */
const createTestEntities = (count, overrides = {}) => {
    return Array.from({ length: count }, () => (0, exports.createTestEntity)(overrides));
};
exports.createTestEntities = createTestEntities;
/**
 * Create a connected graph of entities and relationships
 */
const createTestGraph = (nodeCount = 5) => {
    const entities = (0, exports.createTestEntities)(nodeCount);
    const relationships = [];
    // Create a connected graph (simple chain)
    for (let i = 0; i < entities.length - 1; i++) {
        relationships.push((0, exports.createTestRelationship)({
            sourceId: entities[i].id,
            targetId: entities[i + 1].id,
            type: 'CONNECTED_TO',
        }));
    }
    // Add some cross-connections
    if (entities.length >= 3) {
        relationships.push((0, exports.createTestRelationship)({
            sourceId: entities[0].id,
            targetId: entities[entities.length - 1].id,
            type: 'RELATED_TO',
        }));
    }
    return { entities, relationships };
};
exports.createTestGraph = createTestGraph;
/**
 * Create a complete investigation with entities and relationships
 */
const createTestInvestigationWithData = () => {
    const owner = (0, exports.createTestUser)({ role: 'ANALYST' });
    const investigation = (0, exports.createTestInvestigation)({ ownerId: owner.id });
    const alice = (0, exports.createTestPerson)({
        name: 'Alice Chen',
        investigationId: investigation.id,
        createdBy: owner.id,
    });
    const bob = (0, exports.createTestPerson)({
        name: 'Bob Martinez',
        investigationId: investigation.id,
        createdBy: owner.id,
    });
    const techcorp = (0, exports.createTestOrganization)({
        name: 'TechCorp',
        investigationId: investigation.id,
        createdBy: owner.id,
    });
    const entities = [alice, bob, techcorp];
    const relationships = [
        (0, exports.createTestRelationship)({
            type: 'EMPLOYED_BY',
            sourceId: alice.id,
            targetId: techcorp.id,
            investigationId: investigation.id,
        }),
        (0, exports.createTestRelationship)({
            type: 'EMPLOYED_BY',
            sourceId: bob.id,
            targetId: techcorp.id,
            investigationId: investigation.id,
        }),
        (0, exports.createTestRelationship)({
            type: 'WORKS_WITH',
            sourceId: alice.id,
            targetId: bob.id,
            investigationId: investigation.id,
        }),
    ];
    return { investigation, owner, entities, relationships };
};
exports.createTestInvestigationWithData = createTestInvestigationWithData;
// ============================================================================
// Mock Data Builders (Fluent API)
// ============================================================================
/**
 * Fluent builder for test users
 */
class TestUserBuilder {
    user = {};
    withId(id) {
        this.user.id = id;
        return this;
    }
    withEmail(email) {
        this.user.email = email;
        return this;
    }
    withRole(role) {
        this.user.role = role;
        return this;
    }
    withDepartment(department) {
        this.user.department = department;
        return this;
    }
    withClearance(level) {
        this.user.clearanceLevel = level;
        return this;
    }
    inactive() {
        this.user.isActive = false;
        return this;
    }
    build() {
        return (0, exports.createTestUser)(this.user);
    }
}
exports.TestUserBuilder = TestUserBuilder;
/**
 * Fluent builder for test entities
 */
class TestEntityBuilder {
    entity = {};
    withId(id) {
        this.entity.id = id;
        return this;
    }
    withType(type) {
        this.entity.type = type;
        return this;
    }
    withName(name) {
        this.entity.name = name;
        return this;
    }
    withProperties(properties) {
        this.entity.properties = properties;
        return this;
    }
    withLabels(labels) {
        this.entity.labels = labels;
        return this;
    }
    inInvestigation(investigationId) {
        this.entity.investigationId = investigationId;
        return this;
    }
    build() {
        return (0, exports.createTestEntity)(this.entity);
    }
}
exports.TestEntityBuilder = TestEntityBuilder;
// Factory access
const userBuilder = () => new TestUserBuilder();
exports.userBuilder = userBuilder;
const entityBuilder = () => new TestEntityBuilder();
exports.entityBuilder = entityBuilder;
// ============================================================================
// Exports
// ============================================================================
exports.default = {
    generateId: exports.generateId,
    generateEmail: exports.generateEmail,
    generateString: exports.generateString,
    generateDate: exports.generateDate,
    createTestUser: exports.createTestUser,
    createTestAdmin: exports.createTestAdmin,
    createTestViewer: exports.createTestViewer,
    createTestEntity: exports.createTestEntity,
    createTestPerson: exports.createTestPerson,
    createTestOrganization: exports.createTestOrganization,
    createTestRelationship: exports.createTestRelationship,
    createTestInvestigation: exports.createTestInvestigation,
    createTestSession: exports.createTestSession,
    createTestAuditEntry: exports.createTestAuditEntry,
    createTestUsers: exports.createTestUsers,
    createTestEntities: exports.createTestEntities,
    createTestGraph: exports.createTestGraph,
    createTestInvestigationWithData: exports.createTestInvestigationWithData,
    userBuilder: exports.userBuilder,
    entityBuilder: exports.entityBuilder,
};
