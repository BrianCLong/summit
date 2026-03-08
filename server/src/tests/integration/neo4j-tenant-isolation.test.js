"use strict";
/**
 * Neo4j Tenant Isolation Integration Tests
 *
 * Validates that:
 * 1. TenantNeo4jSession enforces tenant context
 * 2. Queries without tenant_id are rejected
 * 3. Cross-tenant reads are prevented
 * 4. Tenant-scoped queries return only tenant data
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const neo4j_driver_1 = __importDefault(require("neo4j-driver"));
const tenant_session_wrapper_js_1 = require("../../neo4j/tenant-session-wrapper.js");
const tenant_context_helpers_js_1 = require("../helpers/tenant-context-helpers.js");
const tenant_context_js_1 = require("../../security/tenant-context.js");
(0, globals_1.describe)('Neo4j Tenant Isolation', () => {
    let driver;
    let tenantAContext;
    let tenantBContext;
    (0, globals_1.beforeAll)(async () => {
        // Connect to Neo4j
        driver = neo4j_driver_1.default.driver(process.env.NEO4J_URI || 'bolt://localhost:7687', neo4j_driver_1.default.auth.basic(process.env.NEO4J_USER || 'neo4j', process.env.NEO4J_PASSWORD || 'password'));
        // Create tenant contexts
        [tenantAContext, tenantBContext] = (0, tenant_context_helpers_js_1.createMultiTenantContexts)([
            tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A,
            tenant_context_helpers_js_1.TEST_TENANTS.TENANT_B,
        ]);
    });
    (0, globals_1.afterAll)(async () => {
        await driver.close();
    });
    (0, globals_1.beforeEach)(async () => {
        // Clean test data before each test
        const cleanSession = driver.session();
        try {
            await cleanSession.run(`
        MATCH (n:TestEntity)
        WHERE n.tenant_id IN ['${tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A}', '${tenant_context_helpers_js_1.TEST_TENANTS.TENANT_B}']
        DETACH DELETE n
      `);
        }
        finally {
            await cleanSession.close();
        }
    });
    (0, globals_1.describe)('TenantNeo4jSession - Basic Operations', () => {
        (0, globals_1.it)('should create a session with tenant context', () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            (0, globals_1.expect)(session).toBeInstanceOf(tenant_session_wrapper_js_1.TenantNeo4jSession);
            (0, globals_1.expect)(session.getTenantContext().tenantId).toBe(tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A);
        });
        (0, globals_1.it)('should reject session creation without tenant context', () => {
            (0, globals_1.expect)(() => {
                (0, tenant_session_wrapper_js_1.createTenantSession)(driver, null);
            }).toThrow(tenant_context_js_1.TenantContextError);
        });
        (0, globals_1.it)('should execute a simple query with tenant filtering', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                // Create a test node
                await session.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Test Node', createdAt: datetime()})
          RETURN n
        `);
                // Query the node
                const result = await session.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Test Node'
          RETURN n
        `);
                (0, globals_1.expect)(result.records).toHaveLength(1);
                (0, globals_1.expect)(result.records[0].get('n').properties.name).toBe('Test Node');
            }
            finally {
                await session.close();
            }
        });
        (0, globals_1.it)('should reject queries without tenant_id filtering', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                await (0, globals_1.expect)(session.run(`
            MATCH (n:TestEntity)
            RETURN n
          `)).rejects.toThrow(tenant_context_js_1.TenantContextError);
            }
            finally {
                await session.close();
            }
        });
        (0, globals_1.it)('should allow system queries without tenant filtering', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                // System queries like schema operations are allowed
                await (0, globals_1.expect)(session.run('CALL db.labels()')).resolves.not.toThrow();
            }
            finally {
                await session.close();
            }
        });
    });
    (0, globals_1.describe)('Cross-Tenant Isolation', () => {
        (0, globals_1.it)('should prevent reading data from other tenants', async () => {
            // Create data in tenant A
            const sessionA = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                await sessionA.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Tenant A Secret', value: 'confidential'})
          RETURN n
        `);
            }
            finally {
                await sessionA.close();
            }
            // Attempt to read from tenant B
            const sessionB = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantBContext);
            try {
                const result = await sessionB.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Tenant A Secret'
          RETURN n
        `);
                // Should not find any results
                (0, globals_1.expect)(result.records).toHaveLength(0);
            }
            finally {
                await sessionB.close();
            }
        });
        (0, globals_1.it)('should allow reading own tenant data', async () => {
            // Create data in tenant A
            const sessionA1 = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                await sessionA1.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Tenant A Data', value: 'public'})
          RETURN n
        `);
            }
            finally {
                await sessionA1.close();
            }
            // Read from same tenant (different session)
            const sessionA2 = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                const result = await sessionA2.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Tenant A Data'
          RETURN n
        `);
                (0, globals_1.expect)(result.records).toHaveLength(1);
                (0, globals_1.expect)(result.records[0].get('n').properties.name).toBe('Tenant A Data');
            }
            finally {
                await sessionA2.close();
            }
        });
        (0, globals_1.it)('should prevent cross-tenant updates', async () => {
            // Create data in tenant A
            const sessionA = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            let nodeId;
            try {
                const createResult = await sessionA.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Original', value: 'v1'})
          RETURN elementId(n) as id
        `);
                nodeId = createResult.records[0].get('id');
            }
            finally {
                await sessionA.close();
            }
            // Attempt to update from tenant B (should not find node)
            const sessionB = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantBContext);
            try {
                const result = await sessionB.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          SET n.value = 'hacked'
          RETURN n
        `, { nodeId });
                // Should not update any nodes
                (0, globals_1.expect)(result.records).toHaveLength(0);
            }
            finally {
                await sessionB.close();
            }
            // Verify original value unchanged
            const sessionA2 = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                const result = await sessionA2.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          RETURN n
        `, { nodeId });
                (0, globals_1.expect)(result.records).toHaveLength(1);
                (0, globals_1.expect)(result.records[0].get('n').properties.value).toBe('v1');
            }
            finally {
                await sessionA2.close();
            }
        });
        (0, globals_1.it)('should prevent cross-tenant deletes', async () => {
            // Create data in tenant A
            const sessionA = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            let nodeId;
            try {
                const createResult = await sessionA.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Protected', value: 'important'})
          RETURN elementId(n) as id
        `);
                nodeId = createResult.records[0].get('id');
            }
            finally {
                await sessionA.close();
            }
            // Attempt to delete from tenant B
            const sessionB = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantBContext);
            try {
                const result = await sessionB.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          DETACH DELETE n
        `, { nodeId });
                // Should not delete any nodes
                // Neo4j doesn't return anything for DELETE, so check via query
            }
            finally {
                await sessionB.close();
            }
            // Verify node still exists in tenant A
            const sessionA2 = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                const result = await sessionA2.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE elementId(n) = $nodeId
          RETURN n
        `, { nodeId });
                (0, globals_1.expect)(result.records).toHaveLength(1);
            }
            finally {
                await sessionA2.close();
            }
        });
    });
    (0, globals_1.describe)('Helper Functions', () => {
        (0, globals_1.it)('should execute single query with auto session management', async () => {
            const result = await (0, tenant_session_wrapper_js_1.executeTenantQuery)(driver, tenantAContext, `CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Auto Session'})
         RETURN n`);
            (0, globals_1.expect)(result.records).toHaveLength(1);
            (0, globals_1.expect)(result.tenantId).toBe(tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A);
        });
        (0, globals_1.it)('should create node with tenant_id auto-injected', async () => {
            const result = await (0, tenant_session_wrapper_js_1.createTenantNode)(driver, tenantAContext, 'TestEntity', { name: 'Auto Tenant Node', category: 'test' });
            (0, globals_1.expect)(result.records).toHaveLength(1);
            // Verify tenant_id was added
            const verifySession = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            try {
                const queryResult = await verifySession.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.properties.name = 'Auto Tenant Node'
          RETURN n
        `);
                (0, globals_1.expect)(queryResult.records).toHaveLength(1);
            }
            finally {
                await verifySession.close();
            }
        });
        (0, globals_1.it)('should find nodes scoped to tenant', async () => {
            // Create multiple nodes
            await (0, tenant_session_wrapper_js_1.executeTenantQuery)(driver, tenantAContext, `CREATE (n1:TestEntity {tenant_id: $tenantId, category: 'books', title: 'Book 1'})
         CREATE (n2:TestEntity {tenant_id: $tenantId, category: 'books', title: 'Book 2'})
         CREATE (n3:TestEntity {tenant_id: $tenantId, category: 'movies', title: 'Movie 1'})`);
            // Find by category
            const result = await (0, tenant_session_wrapper_js_1.findTenantNodes)(driver, tenantAContext, 'TestEntity', { category: 'books' });
            (0, globals_1.expect)(result.records).toHaveLength(2);
        });
    });
    (0, globals_1.describe)('Transaction Support', () => {
        (0, globals_1.it)('should support read transactions with tenant context', async () => {
            // Create test data
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            await session.run(`
        CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Transaction Test'})
      `);
            // Execute read transaction
            const result = await session.executeRead(async (tx) => {
                const queryResult = await tx.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Transaction Test'
          RETURN n
        `);
                return queryResult.records.length;
            });
            (0, globals_1.expect)(result).toBe(1);
            await session.close();
        });
        (0, globals_1.it)('should support write transactions with tenant context', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            const result = await session.executeWrite(async (tx) => {
                await tx.run(`
          CREATE (n:TestEntity {tenant_id: $tenantId, name: 'Write Transaction'})
        `);
                const queryResult = await tx.run(`
          MATCH (n:TestEntity {tenant_id: $tenantId})
          WHERE n.name = 'Write Transaction'
          RETURN n
        `);
                return queryResult.records.length;
            });
            (0, globals_1.expect)(result).toBe(1);
            await session.close();
        });
        (0, globals_1.it)('should reject transactions without tenant filtering', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            await (0, globals_1.expect)(session.executeRead(async (tx) => {
                // Missing tenant_id filter
                return tx.run('MATCH (n:TestEntity) RETURN n');
            })).rejects.toThrow(tenant_context_js_1.TenantContextError);
            await session.close();
        });
    });
    (0, globals_1.describe)('Session Statistics', () => {
        (0, globals_1.it)('should track queries executed', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            await session.run('CREATE (n:TestEntity {tenant_id: $tenantId, name: "Q1"})');
            await session.run('CREATE (n:TestEntity {tenant_id: $tenantId, name: "Q2"})');
            await session.run('MATCH (n:TestEntity {tenant_id: $tenantId}) RETURN n');
            const stats = session.getStats();
            (0, globals_1.expect)(stats.queriesExecuted).toBe(3);
            (0, globals_1.expect)(stats.tenantId).toBe(tenant_context_helpers_js_1.TEST_TENANTS.TENANT_A);
            await session.close();
        });
    });
    (0, globals_1.describe)('Query Validation Edge Cases', () => {
        (0, globals_1.it)('should accept queries with tenant_id in different formats', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            // Format 1: {tenant_id: $tenantId}
            await (0, globals_1.expect)(session.run('MATCH (n:TestEntity {tenant_id: $tenantId}) RETURN n')).resolves.not.toThrow();
            // Format 2: tenant_id: $tenantId
            await (0, globals_1.expect)(session.run('MATCH (n:TestEntity) WHERE n.tenant_id = $tenantId RETURN n')).resolves.not.toThrow();
            await session.close();
        });
        (0, globals_1.it)('should reject queries with typos in tenant_id', async () => {
            const session = (0, tenant_session_wrapper_js_1.createTenantSession)(driver, tenantAContext);
            await (0, globals_1.expect)(session.run('MATCH (n:TestEntity {tenat_id: $tenantId}) RETURN n')).rejects.toThrow(tenant_context_js_1.TenantContextError);
            await session.close();
        });
    });
});
