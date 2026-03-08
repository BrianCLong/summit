"use strict";
/**
 * Safety Scenario Tests
 * AGENT-10: Automated safety scenarios to verify agent safety controls
 */
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const pg_1 = require("pg");
const AgentService_1 = require("../AgentService");
const AgentGateway_1 = require("../AgentGateway");
const PolicyEnforcer_1 = require("../PolicyEnforcer");
const QuotaManager_1 = require("../QuotaManager");
const ApprovalService_1 = require("../ApprovalService");
const ObservabilityService_1 = require("../ObservabilityService");
// Test database connection
const testPool = new pg_1.Pool({
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5432'),
    database: process.env.TEST_DB_NAME || 'summit_test',
    user: process.env.TEST_DB_USER || 'summit',
    password: process.env.TEST_DB_PASSWORD || 'summit',
});
// Test configuration
const testConfig = {
    forceSimulationMode: false,
    defaultOperationMode: 'ENFORCED',
    allowModeOverride: true,
    globalRateLimitPerHour: 10,
    globalRateLimitPerDay: 100,
    autoApproveBelow: 'low',
    requireApprovalAbove: 'medium',
    defaultApprovalExpiryMinutes: 60,
    defaultApprovalAssignees: ['admin-user-1'],
    enableDetailedLogging: true,
    enableMetrics: true,
    enableTracing: true,
    enableSafetyChecks: true,
    enableCrossTenantBlocking: true,
    enableQuotaEnforcement: true,
};
let agentService;
let gateway;
let testAgent;
let testApiKey;
(0, globals_1.beforeAll)(async () => {
    // Initialize services
    agentService = new AgentService_1.AgentService(testPool);
    const policyEnforcer = new PolicyEnforcer_1.PolicyEnforcer('http://localhost:8181', true); // Dry-run mode for tests
    const quotaManager = new QuotaManager_1.QuotaManager(testPool);
    const approvalService = new ApprovalService_1.ApprovalService(testPool);
    const observability = new ObservabilityService_1.ObservabilityService(true, true);
    gateway = new AgentGateway_1.AgentGateway(testPool, agentService, policyEnforcer, quotaManager, approvalService, observability, testConfig);
    // Create test agent
    const agent = await agentService.createAgent({
        name: 'safety-test-agent',
        description: 'Agent for safety scenario testing',
        agentType: 'internal',
        tenantScopes: ['tenant-1'],
        projectScopes: [],
        capabilities: ['read:data', 'write:data'],
        restrictions: {
            maxRiskLevel: 'medium',
            requireApproval: ['high', 'critical'],
            maxDailyRuns: 10,
        },
    });
    const credential = await agentService.createCredential(agent.id);
    testAgent = agent;
    testApiKey = credential.apiKey;
});
(0, globals_1.afterAll)(async () => {
    // Cleanup
    if (testAgent) {
        await agentService.deleteAgent(testAgent.id);
    }
    await testPool.end();
});
(0, globals_1.describe)('AGENT-10: Safety Scenario Tests', () => {
    // =========================================================================
    // Scenario 1: Cross-Tenant Access Blocking
    // =========================================================================
    (0, globals_1.describe)('Scenario 1: Cross-Tenant Access', () => {
        (0, globals_1.it)('should block agent from accessing different tenant', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-2', // Different tenant!
                action: {
                    type: 'read',
                    target: 'entities',
                },
            };
            const response = await gateway.executeRequest(request, testApiKey);
            (0, globals_1.expect)(response.success).toBe(false);
            (0, globals_1.expect)(response.error?.code).toBe('SCOPE_VIOLATION');
            (0, globals_1.expect)(response.error?.message).toContain('does not have access to tenant');
        });
        (0, globals_1.it)('should allow agent to access its scoped tenant', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1', // Correct tenant
                action: {
                    type: 'read',
                    target: 'entities',
                },
            };
            const response = await gateway.executeRequest(request, testApiKey);
            // Should succeed (or at least not fail on scope violation)
            if (!response.success) {
                (0, globals_1.expect)(response.error?.code).not.toBe('SCOPE_VIOLATION');
            }
        });
    });
    // =========================================================================
    // Scenario 2: Rate Limiting
    // =========================================================================
    (0, globals_1.describe)('Scenario 2: Rate Limiting', () => {
        (0, globals_1.it)('should enforce daily run quota', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'read',
                    target: 'test',
                },
            };
            // Execute requests up to the limit
            const promises = [];
            for (let i = 0; i < 15; i++) {
                // Exceeds daily limit of 10
                promises.push(gateway.executeRequest(request, testApiKey));
            }
            const results = await Promise.allSettled(promises);
            // Some should succeed, some should fail with quota exceeded
            const failures = results.filter(r => r.status === 'fulfilled' &&
                !r.value.success &&
                r.value.error?.code === 'QUOTA_EXCEEDED');
            (0, globals_1.expect)(failures.length).toBeGreaterThan(0);
        }, 30000); // Increased timeout
        (0, globals_1.it)('should provide quota status', async () => {
            const quotas = await new QuotaManager_1.QuotaManager(testPool).getQuotaStatus(testAgent.id);
            (0, globals_1.expect)(quotas).toBeInstanceOf(Array);
            (0, globals_1.expect)(quotas.length).toBeGreaterThan(0);
            const dailyRunsQuota = quotas.find(q => q.quotaType === 'daily_runs');
            (0, globals_1.expect)(dailyRunsQuota).toBeDefined();
            (0, globals_1.expect)(dailyRunsQuota?.limit).toBe(10);
        });
    });
    // =========================================================================
    // Scenario 3: High-Risk Action Blocking
    // =========================================================================
    (0, globals_1.describe)('Scenario 3: High-Risk Actions', () => {
        (0, globals_1.it)('should require approval for high-risk actions', async () => {
            // Create an agent with delete capability
            const highRiskAgent = await agentService.createAgent({
                name: 'high-risk-test-agent',
                description: 'Agent for high-risk testing',
                agentType: 'internal',
                tenantScopes: ['tenant-1'],
                capabilities: ['delete:data'],
                restrictions: {
                    maxRiskLevel: 'high',
                    requireApproval: ['high', 'critical'],
                },
            });
            const cred = await agentService.createCredential(highRiskAgent.id);
            const request = {
                agentId: highRiskAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'delete',
                    target: 'important-data',
                },
            };
            const response = await gateway.executeRequest(request, cred.apiKey);
            // Should create approval request
            (0, globals_1.expect)(response.success).toBe(false);
            (0, globals_1.expect)(response.approval).toBeDefined();
            (0, globals_1.expect)(response.approval?.status).toBe('pending');
            // Cleanup
            await agentService.deleteAgent(highRiskAgent.id);
        });
        (0, globals_1.it)('should block critical actions from uncertified agents', async () => {
            const uncertifiedAgent = await agentService.createAgent({
                name: 'uncertified-test-agent',
                description: 'Uncertified agent',
                agentType: 'external',
                tenantScopes: ['tenant-1'],
                capabilities: ['user:impersonate'],
                restrictions: {
                    maxRiskLevel: 'critical',
                    requireApproval: ['critical'],
                },
            });
            const cred = await agentService.createCredential(uncertifiedAgent.id);
            const request = {
                agentId: uncertifiedAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'user:impersonate',
                    target: 'admin-user',
                },
            };
            const response = await gateway.executeRequest(request, cred.apiKey);
            (0, globals_1.expect)(response.success).toBe(false);
            (0, globals_1.expect)(response.error?.code).toBe('POLICY_DENIED');
            // Cleanup
            await agentService.deleteAgent(uncertifiedAgent.id);
        });
    });
    // =========================================================================
    // Scenario 4: Operation Mode Safety
    // =========================================================================
    (0, globals_1.describe)('Scenario 4: Operation Modes', () => {
        (0, globals_1.it)('should prevent execution in SIMULATION mode', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                operationMode: 'SIMULATION',
                action: {
                    type: 'write',
                    target: 'data',
                    payload: { value: 'test' },
                },
            };
            const response = await gateway.executeRequest(request, testApiKey);
            (0, globals_1.expect)(response.success).toBe(true);
            (0, globals_1.expect)(response.operationMode).toBe('SIMULATION');
            (0, globals_1.expect)(response.action.executed).toBe(false);
            (0, globals_1.expect)(response.result).toHaveProperty('message');
            (0, globals_1.expect)(response.result.message).toContain('Would execute');
        });
        (0, globals_1.it)('should enforce mode based on config', async () => {
            // Create gateway with forced SIMULATION
            const simConfig = { ...testConfig, forceSimulationMode: true };
            const simGateway = new AgentGateway_1.AgentGateway(testPool, agentService, new PolicyEnforcer_1.PolicyEnforcer('http://localhost:8181', true), new QuotaManager_1.QuotaManager(testPool), new ApprovalService_1.ApprovalService(testPool), new ObservabilityService_1.ObservabilityService(true, true), simConfig);
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                operationMode: 'ENFORCED', // Try to override
                action: {
                    type: 'write',
                    target: 'data',
                },
            };
            const response = await simGateway.executeRequest(request, testApiKey);
            // Should force SIMULATION mode
            (0, globals_1.expect)(response.operationMode).toBe('SIMULATION');
        });
    });
    // =========================================================================
    // Scenario 5: Missing Capability
    // =========================================================================
    (0, globals_1.describe)('Scenario 5: Capability Enforcement', () => {
        (0, globals_1.it)('should block actions requiring missing capabilities', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'delete', // Agent doesn't have delete:data capability
                    target: 'data',
                },
            };
            const response = await gateway.executeRequest(request, testApiKey);
            (0, globals_1.expect)(response.success).toBe(false);
            // Should fail on capability check or risk level
        });
        (0, globals_1.it)('should allow actions with proper capabilities', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'read', // Agent has read:data capability
                    target: 'data',
                },
            };
            const response = await gateway.executeRequest(request, testApiKey);
            // Should not fail on capability
            if (!response.success) {
                (0, globals_1.expect)(response.error?.message).not.toContain('capability');
            }
        });
    });
    // =========================================================================
    // Scenario 6: Authentication Failures
    // =========================================================================
    (0, globals_1.describe)('Scenario 6: Authentication', () => {
        (0, globals_1.it)('should reject invalid API keys', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'read',
                    target: 'data',
                },
            };
            const invalidKey = 'agt_invalid_key_12345';
            await (0, globals_1.expect)(gateway.executeRequest(request, invalidKey)).rejects.toThrow();
        });
        (0, globals_1.it)('should reject requests from suspended agents', async () => {
            // Suspend the agent
            await agentService.updateAgent(testAgent.id, { status: 'suspended' });
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'read',
                    target: 'data',
                },
            };
            await (0, globals_1.expect)(gateway.executeRequest(request, testApiKey)).rejects.toThrow('not active');
            // Restore agent status
            await agentService.updateAgent(testAgent.id, { status: 'active' });
        });
    });
    // =========================================================================
    // Scenario 7: Audit Logging
    // =========================================================================
    (0, globals_1.describe)('Scenario 7: Audit Trail', () => {
        (0, globals_1.it)('should log all agent actions', async () => {
            const request = {
                agentId: testAgent.id,
                tenantId: 'tenant-1',
                action: {
                    type: 'read',
                    target: 'audit-test',
                },
            };
            await gateway.executeRequest(request, testApiKey);
            // Check audit log
            const logs = await testPool.query('SELECT * FROM agent_audit_log WHERE agent_id = $1 ORDER BY timestamp DESC LIMIT 5', [testAgent.id]);
            (0, globals_1.expect)(logs.rows.length).toBeGreaterThan(0);
        });
    });
});
