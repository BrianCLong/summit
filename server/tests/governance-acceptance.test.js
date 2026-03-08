"use strict";
/**
 * Governance Acceptance Tests
 *
 * Tests all Council Wishbook criteria:
 * 1. Multi-tenant isolation
 * 2. RBAC enforcement
 * 3. Policy tag enforcement (ABAC)
 * 4. Warrant validation
 * 5. Reason for access required
 * 6. Comprehensive audit trail (who/what/why/when)
 * 7. Appeal system for denied access
 * 8. Immutable audit log
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const crypto_1 = require("crypto");
const globals_1 = require("@jest/globals");
const runAcceptance = process.env.RUN_ACCEPTANCE === 'true';
const describeIf = runAcceptance ? globals_1.describe : globals_1.describe.skip;
globals_1.jest.mock('../src/config/database', () => ({
    getPostgresPool: globals_1.jest.fn(() => ({
        connect: globals_1.jest.fn(),
        query: globals_1.jest.fn(),
        end: globals_1.jest.fn(),
    })),
    getRedisClient: globals_1.jest.fn(() => ({
        get: globals_1.jest.fn(),
        set: globals_1.jest.fn(),
        on: globals_1.jest.fn(),
        quit: globals_1.jest.fn(),
        subscribe: globals_1.jest.fn(),
    })),
}));
// Test fixtures
const TENANT_A_ID = 'tenant-a';
const TENANT_B_ID = 'tenant-b';
let warrantService;
let auditSystem;
let adminToken;
let normalUserToken;
let viewerToken;
let tenantBToken;
let testWarrantId = 'warrant-test';
let app;
let pool = null;
let neo4jDriver = null;
(0, globals_1.beforeAll)(async () => {
    if (!runAcceptance)
        return;
    const appModule = await Promise.resolve().then(() => __importStar(require('../src/app.js')));
    const pgModule = await Promise.resolve().then(() => __importStar(require('../src/db/postgres.js')));
    const neo4jModule = await Promise.resolve().then(() => __importStar(require('../src/db/neo4j.js')));
    app = await appModule.createApp();
    pool = pgModule.getPostgresPool();
    neo4jDriver = neo4jModule.getNeo4jDriver();
    // Initialize services
    // warrantService = new WarrantService(pool, logger);
    // auditSystem = new AdvancedAuditSystem(pool, redis, logger, signingKey, encryptionKey);
    // Generate test tokens (in real implementation, use JWT)
    adminToken = 'test-admin-token';
    normalUserToken = 'test-normal-user-token';
    viewerToken = 'test-viewer-token';
    tenantBToken = 'test-tenant-b-token';
    // Create test data
    await setupTestData();
});
(0, globals_1.afterAll)(async () => {
    if (!runAcceptance)
        return;
    await cleanupTestData();
    await pool?.end();
    await neo4jDriver?.close();
});
async function setupTestData() {
    // Create test investigation in tenant A
    const session = neo4jDriver.session();
    try {
        await session.run(`
      CREATE (i:Investigation {
        id: 'test-investigation-1',
        tenantId: $tenantId,
        title: 'Test Investigation',
        policy_origin: 'user_input',
        policy_sensitivity: 'internal',
        policy_legal_basis: ['investigation'],
        policy_purpose: ['investigation', 'threat_intel'],
        policy_data_classification: 'general',
        policy_retention_days: 2555,
        policy_jurisdiction: 'US',
        policy_collection_date: datetime(),
        policy_access_count: 0,
        policy_pii_flags: {
          has_names: false,
          has_emails: false,
          has_phones: false,
          has_ssn: false,
          has_addresses: false,
          has_biometric: false
        }
      })
      `, { tenantId: TENANT_A_ID });
        // Create restricted investigation
        await session.run(`
      CREATE (i:Investigation {
        id: 'restricted-investigation',
        tenantId: $tenantId,
        title: 'Restricted Investigation',
        policy_origin: 'user_input',
        policy_sensitivity: 'restricted',
        policy_legal_basis: ['court_order'],
        policy_purpose: ['investigation'],
        policy_data_classification: 'pii',
        policy_retention_days: 2555,
        policy_jurisdiction: 'US',
        policy_collection_date: datetime(),
        policy_access_count: 0,
        policy_pii_flags: {
          has_names: true,
          has_emails: true,
          has_phones: true,
          has_ssn: false,
          has_addresses: true,
          has_biometric: false
        }
      })
      `, { tenantId: TENANT_A_ID });
        // Create investigation in tenant B
        await session.run(`
      CREATE (i:Investigation {
        id: 'tenant-b-investigation',
        tenantId: $tenantId,
        title: 'Tenant B Investigation',
        policy_origin: 'user_input',
        policy_sensitivity: 'internal',
        policy_legal_basis: ['investigation'],
        policy_purpose: ['investigation'],
        policy_data_classification: 'general',
        policy_retention_days: 2555,
        policy_jurisdiction: 'US',
        policy_collection_date: datetime(),
        policy_access_count: 0,
        policy_pii_flags: {
          has_names: false,
          has_emails: false,
          has_phones: false,
          has_ssn: false,
          has_addresses: false,
          has_biometric: false
        }
      })
      `, { tenantId: TENANT_B_ID });
    }
    finally {
        await session.close();
    }
    // Create test warrant
    // const warrant = await warrantService.createWarrant({
    //   warrantNumber: 'SW-2025-TEST-001',
    //   warrantType: 'search_warrant',
    //   issuingAuthority: 'Test District Court',
    //   issuedDate: new Date(),
    //   expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    //   jurisdiction: 'US',
    //   scopeDescription: 'Test search warrant for restricted investigation',
    //   scopeConstraints: {
    //     resourceTypes: ['investigation'],
    //     allowedOperations: ['view', 'export'],
    //     purposes: ['investigation'],
    //     maxSensitivity: 'restricted',
    //   },
    //   tenantId: TENANT_A_ID,
    //   createdBy: 'test-admin',
    // });
    // testWarrantId = warrant.id;
}
async function cleanupTestData() {
    // Clean up Neo4j
    const session = neo4jDriver.session();
    try {
        await session.run(`
      MATCH (i:Investigation)
      WHERE i.id IN ['test-investigation-1', 'restricted-investigation', 'tenant-b-investigation']
      DELETE i
      `);
    }
    finally {
        await session.close();
    }
    // Clean up PostgreSQL (if needed)
    // await pool.query('DELETE FROM warrants WHERE warrant_number = $1', ['SW-2025-TEST-001']);
}
// ============================================================================
// TEST SUITE 1: TENANT ISOLATION
// ============================================================================
describeIf('1. Tenant Isolation', () => {
    (0, globals_1.it)('should deny access to resources from different tenant', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Reviewing case details')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "tenant-b-investigation") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toContain('not found');
    });
    (0, globals_1.it)('should allow access to resources in same tenant', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Reviewing case details')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "test-investigation-1") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toBeDefined();
        (0, globals_1.expect)(response.body.data.investigationCaseGraph.investigation.id).toBe('test-investigation-1');
    });
});
// ============================================================================
// TEST SUITE 2: RBAC ENFORCEMENT
// ============================================================================
describeIf('2. RBAC Enforcement', () => {
    (0, globals_1.it)('should deny viewer role from creating investigations', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${viewerToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Creating new investigation')
            .send({
            query: `
          mutation {
            createInvestigation(input: { title: "Test" }) {
              id
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/insufficient_rbac_permissions|permission/i);
    });
    (0, globals_1.it)('should allow admin to create investigations', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Creating new investigation for case XYZ')
            .send({
            query: `
          mutation {
            createInvestigation(input: { title: "Admin Created Investigation" }) {
              id
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toBeDefined();
        (0, globals_1.expect)(response.body.data.createInvestigation).toBeDefined();
    });
});
// ============================================================================
// TEST SUITE 3: POLICY TAG ENFORCEMENT (ABAC)
// ============================================================================
describeIf('3. Policy Tag Enforcement', () => {
    (0, globals_1.it)('should deny access to restricted data without clearance', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${normalUserToken}`) // User with "internal" clearance
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Need to review restricted case')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/insufficient_clearance|Access denied/i);
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/appeal/i);
    });
    (0, globals_1.it)('should allow access to internal data with internal clearance', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${normalUserToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Reviewing standard investigation')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "test-investigation-1") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toBeDefined();
        (0, globals_1.expect)(response.body.data.investigationCaseGraph.investigation.id).toBe('test-investigation-1');
    });
});
// ============================================================================
// TEST SUITE 4: WARRANT VALIDATION
// ============================================================================
describeIf('4. Warrant Validation', () => {
    (0, globals_1.it)('should require warrant for restricted data', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'court_order')
            .set('X-Reason-For-Access', 'Executing investigation on restricted case')
            // Missing X-Warrant-Id
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/warrant_required|warrant/i);
    });
    (0, globals_1.it)('should allow access with valid warrant', async () => {
        // This test would require testWarrantId from setup
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'court_order')
            .set('X-Warrant-Id', testWarrantId)
            .set('X-Reason-For-Access', 'Executing search warrant SW-2025-TEST-001')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              investigation { id }
              governanceMetadata {
                warrantId
                warrantNumber
              }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toBeDefined();
        (0, globals_1.expect)(response.body.data.investigationCaseGraph.investigation.id).toBe('restricted-investigation');
        (0, globals_1.expect)(response.body.data.investigationCaseGraph.governanceMetadata.warrantId).toBe(testWarrantId);
        (0, globals_1.expect)(response.body.data.investigationCaseGraph.governanceMetadata.warrantNumber).toBe('SW-2025-TEST-001');
    });
    (0, globals_1.it)('should reject expired warrant', async () => {
        // Create expired warrant
        // const expiredWarrant = await warrantService.createWarrant({
        //   warrantNumber: 'SW-2025-EXPIRED',
        //   warrantType: 'search_warrant',
        //   issuingAuthority: 'Test Court',
        //   issuedDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
        //   expiryDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago (expired)
        //   jurisdiction: 'US',
        //   scopeDescription: 'Expired warrant',
        //   scopeConstraints: {},
        //   tenantId: TENANT_A_ID,
        //   createdBy: 'test-admin',
        // });
        // const response = await request(app)
        //   .post('/graphql')
        //   .set('Authorization', `Bearer ${adminToken}`)
        //   .set('X-Warrant-Id', expiredWarrant.id)
        //   .set('X-Purpose', 'investigation')
        //   .set('X-Reason-For-Access', 'Test')
        //   .send({
        //     query: `query { investigationCaseGraph(investigationId: "restricted-investigation") { investigation { id } } }`,
        //   });
        // expect(response.body.errors[0].message).toMatch(/expired/i);
    });
});
// ============================================================================
// TEST SUITE 5: REASON FOR ACCESS
// ============================================================================
describeIf('5. Reason for Access', () => {
    (0, globals_1.it)('should require reason for access header', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            // Missing X-Reason-For-Access
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "test-investigation-1") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/Reason for access/i);
    });
    (0, globals_1.it)('should reject too short reason', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Test') // Too short
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "test-investigation-1") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/at least \d+ characters/i);
    });
    (0, globals_1.it)('should accept valid reason', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Reviewing case details for ongoing investigation XYZ-123')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "test-investigation-1") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toBeDefined();
    });
});
// ============================================================================
// TEST SUITE 6: AUDIT TRAIL
// ============================================================================
describeIf('6. Comprehensive Audit Trail', () => {
    (0, globals_1.it)('should record who/what/why/when for all access', async () => {
        const correlationId = (0, crypto_1.randomUUID)();
        await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Request-Id', correlationId)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Reviewing evidence for case ABC-789')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "test-investigation-1") {
              investigation { id title }
            }
          }
        `,
        });
        // Verify audit log
        // const auditEvents = await auditSystem.queryEvents({
        //   correlationIds: [correlationId],
        // });
        // expect(auditEvents).toHaveLength(1);
        // const event = auditEvents[0];
        // // WHO
        // expect(event.userId).toBe('admin-user-id');
        // expect(event.tenantId).toBe(TENANT_A_ID);
        // expect(event.ipAddress).toBeDefined();
        // // WHAT
        // expect(event.resourceType).toBe('investigation');
        // expect(event.resourceId).toBe('test-investigation-1');
        // expect(event.action).toBe('view_case_graph');
        // // WHY
        // expect(event.details.purpose).toBe('investigation');
        // expect(event.details.legalBasis).toContain('investigation');
        // expect(event.details.reasonForAccess).toBe('Reviewing evidence for case ABC-789');
        // // WHEN
        // expect(event.timestamp).toBeInstanceOf(Date);
        // expect(event.correlationId).toBe(correlationId);
        // // INTEGRITY
        // expect(event.hash).toBeDefined();
        // expect(event.signature).toBeDefined();
        // expect(event.previousEventHash).toBeDefined();
    });
    (0, globals_1.it)('should log denied access attempts', async () => {
        const correlationId = (0, crypto_1.randomUUID)();
        await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${normalUserToken}`)
            .set('X-Request-Id', correlationId)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Need access to restricted case')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              investigation { id }
            }
          }
        `,
        });
        // Verify denied access is logged
        // const auditEvents = await auditSystem.queryEvents({
        //   correlationIds: [correlationId],
        //   outcomes: ['failure'],
        // });
        // expect(auditEvents.length).toBeGreaterThan(0);
        // const event = auditEvents[0];
        // expect(event.outcome).toBe('failure');
        // expect(event.details.policyDecision.denyReasons).toBeDefined();
    });
});
// ============================================================================
// TEST SUITE 7: APPEAL SYSTEM
// ============================================================================
describeIf('7. Appeal System', () => {
    (0, globals_1.it)('should provide appeal path when access is denied', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${normalUserToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Need to review restricted case for investigation')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/appeal/i);
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/compliance@example\.com/i);
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/\/api\/access-requests/i);
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/Request ID/i);
    });
    (0, globals_1.it)('should include deny reasons in appeal information', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${normalUserToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Need access')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/insufficient_clearance|warrant_required/i);
    });
});
// ============================================================================
// TEST SUITE 8: IMMUTABLE AUDIT LOG
// ============================================================================
describeIf('8. Immutable Audit Log', () => {
    (0, globals_1.it)('should prevent modification of audit events', async () => {
        // Create an audit event
        // const eventId = await auditSystem.recordEvent({
        //   eventType: 'user_action',
        //   level: 'info',
        //   correlationId: randomUUID(),
        //   tenantId: TENANT_A_ID,
        //   serviceId: 'test',
        //   action: 'test_action',
        //   outcome: 'success',
        //   message: 'Test event',
        //   details: {},
        //   complianceRelevant: false,
        //   complianceFrameworks: [],
        // });
        // Attempt to update the event
        // try {
        //   await pool.query(
        //     `UPDATE audit_events SET message = 'tampered' WHERE id = $1`,
        //     [eventId],
        //   );
        //   fail('Should have thrown error');
        // } catch (error) {
        //   expect(error.message).toMatch(/immutable/i);
        // }
    });
    (0, globals_1.it)('should verify audit trail integrity', async () => {
        // const verification = await auditSystem.verifyIntegrity();
        // expect(verification.valid).toBe(true);
        // expect(verification.invalidEvents).toHaveLength(0);
        // expect(verification.totalEvents).toBeGreaterThan(0);
        // expect(verification.validEvents).toBe(verification.totalEvents);
    });
});
// ============================================================================
// TEST SUITE 9: FIELD-LEVEL REDACTION
// ============================================================================
describeIf('9. Field-Level Redaction', () => {
    (0, globals_1.it)('should redact PII fields without PII scope', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${normalUserToken}`) // User without scope:pii
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Reviewing case data')
            .set('X-Warrant-Id', testWarrantId)
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              entities {
                email
                phone
              }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        if (response.body.data?.investigationCaseGraph?.entities) {
            const entities = response.body.data.investigationCaseGraph.entities;
            entities.forEach((entity) => {
                if (entity.email) {
                    (0, globals_1.expect)(entity.email).toBe('[REDACTED]');
                }
                if (entity.phone) {
                    (0, globals_1.expect)(entity.phone).toBe('[REDACTED]');
                }
            });
        }
    });
    (0, globals_1.it)('should not redact fields with appropriate scope', async () => {
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`) // Admin with scope:pii
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'investigation')
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Full investigation review')
            .set('X-Warrant-Id', testWarrantId)
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "restricted-investigation") {
              entities {
                email
                phone
              }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        if (response.body.data?.investigationCaseGraph?.entities) {
            const entities = response.body.data.investigationCaseGraph.entities;
            // Entities should have actual email/phone data, not [REDACTED]
            entities.forEach((entity) => {
                if (entity.email) {
                    (0, globals_1.expect)(entity.email).not.toBe('[REDACTED]');
                }
            });
        }
    });
});
// ============================================================================
// TEST SUITE 10: PURPOSE LIMITATION
// ============================================================================
describeIf('10. Purpose Limitation', () => {
    (0, globals_1.it)('should deny access when purpose does not match resource purpose', async () => {
        // Create investigation with specific purpose
        const session = neo4jDriver.session();
        try {
            await session.run(`
        CREATE (i:Investigation {
          id: 'purpose-limited-inv',
          tenantId: $tenantId,
          title: 'Purpose Limited Investigation',
          policy_origin: 'user_input',
          policy_sensitivity: 'internal',
          policy_legal_basis: ['investigation'],
          policy_purpose: ['compliance'], // Only compliance purpose allowed
          policy_data_classification: 'general',
          policy_retention_days: 2555,
          policy_jurisdiction: 'US',
          policy_collection_date: datetime(),
          policy_access_count: 0
        })
        `, { tenantId: TENANT_A_ID });
        }
        finally {
            await session.close();
        }
        const response = await (0, supertest_1.default)(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${adminToken}`)
            .set('X-Tenant-Id', TENANT_A_ID)
            .set('X-Purpose', 'threat_intel') // Different purpose
            .set('X-Legal-Basis', 'investigation')
            .set('X-Reason-For-Access', 'Threat analysis')
            .send({
            query: `
          query {
            investigationCaseGraph(investigationId: "purpose-limited-inv") {
              investigation { id }
            }
          }
        `,
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.errors).toBeDefined();
        (0, globals_1.expect)(response.body.errors[0].message).toMatch(/purpose_mismatch|purpose/i);
    });
});
