/**
 * Safety Scenario Tests
 * AGENT-10: Automated safety scenarios to verify agent safety controls
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { Pool } from 'pg';
import { AgentService } from '../AgentService';
import { AgentGateway } from '../AgentGateway';
import { PolicyEnforcer } from '../PolicyEnforcer';
import { QuotaManager } from '../QuotaManager';
import { ApprovalService } from '../ApprovalService';
import { ObservabilityService } from '../ObservabilityService';
import type { AgentRequest, GatewayConfig } from '../types';

// Test database connection
const testPool = new Pool({
  host: process.env.TEST_DB_HOST || 'localhost',
  port: parseInt(process.env.TEST_DB_PORT || '5432'),
  database: process.env.TEST_DB_NAME || 'summit_test',
  user: process.env.TEST_DB_USER || 'summit',
  password: process.env.TEST_DB_PASSWORD || 'summit',
});

// Test configuration
const testConfig: GatewayConfig = {
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

let agentService: AgentService;
let gateway: AgentGateway;
let testAgent: any;
let testApiKey: string;

beforeAll(async () => {
  // Initialize services
  agentService = new AgentService(testPool);
  const policyEnforcer = new PolicyEnforcer('http://localhost:8181', true); // Dry-run mode for tests
  const quotaManager = new QuotaManager(testPool);
  const approvalService = new ApprovalService(testPool);
  const observability = new ObservabilityService(true, true);

  gateway = new AgentGateway(
    testPool,
    agentService,
    policyEnforcer,
    quotaManager,
    approvalService,
    observability,
    testConfig
  );

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
  testApiKey = credential.apiKey!;
});

afterAll(async () => {
  // Cleanup
  if (testAgent) {
    await agentService.deleteAgent(testAgent.id);
  }
  await testPool.end();
});

describe('AGENT-10: Safety Scenario Tests', () => {
  // =========================================================================
  // Scenario 1: Cross-Tenant Access Blocking
  // =========================================================================
  describe('Scenario 1: Cross-Tenant Access', () => {
    it('should block agent from accessing different tenant', async () => {
      const request: AgentRequest = {
        agentId: testAgent.id,
        tenantId: 'tenant-2', // Different tenant!
        action: {
          type: 'read',
          target: 'entities',
        },
      };

      const response = await gateway.executeRequest(request, testApiKey);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('SCOPE_VIOLATION');
      expect(response.error?.message).toContain('does not have access to tenant');
    });

    it('should allow agent to access its scoped tenant', async () => {
      const request: AgentRequest = {
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
        expect(response.error?.code).not.toBe('SCOPE_VIOLATION');
      }
    });
  });

  // =========================================================================
  // Scenario 2: Rate Limiting
  // =========================================================================
  describe('Scenario 2: Rate Limiting', () => {
    it('should enforce daily run quota', async () => {
      const request: AgentRequest = {
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
      const failures = results.filter(r =>
        r.status === 'fulfilled' &&
        !r.value.success &&
        r.value.error?.code === 'QUOTA_EXCEEDED'
      );

      expect(failures.length).toBeGreaterThan(0);
    }, 30000); // Increased timeout

    it('should provide quota status', async () => {
      const quotas = await new QuotaManager(testPool).getQuotaStatus(testAgent.id);

      expect(quotas).toBeInstanceOf(Array);
      expect(quotas.length).toBeGreaterThan(0);

      const dailyRunsQuota = quotas.find(q => q.quotaType === 'daily_runs');
      expect(dailyRunsQuota).toBeDefined();
      expect(dailyRunsQuota?.limit).toBe(10);
    });
  });

  // =========================================================================
  // Scenario 3: High-Risk Action Blocking
  // =========================================================================
  describe('Scenario 3: High-Risk Actions', () => {
    it('should require approval for high-risk actions', async () => {
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

      const request: AgentRequest = {
        agentId: highRiskAgent.id,
        tenantId: 'tenant-1',
        action: {
          type: 'delete',
          target: 'important-data',
        },
      };

      const response = await gateway.executeRequest(request, cred.apiKey!);

      // Should create approval request
      expect(response.success).toBe(false);
      expect(response.approval).toBeDefined();
      expect(response.approval?.status).toBe('pending');

      // Cleanup
      await agentService.deleteAgent(highRiskAgent.id);
    });

    it('should block critical actions from uncertified agents', async () => {
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

      const request: AgentRequest = {
        agentId: uncertifiedAgent.id,
        tenantId: 'tenant-1',
        action: {
          type: 'user:impersonate',
          target: 'admin-user',
        },
      };

      const response = await gateway.executeRequest(request, cred.apiKey!);

      expect(response.success).toBe(false);
      expect(response.error?.code).toBe('POLICY_DENIED');

      // Cleanup
      await agentService.deleteAgent(uncertifiedAgent.id);
    });
  });

  // =========================================================================
  // Scenario 4: Operation Mode Safety
  // =========================================================================
  describe('Scenario 4: Operation Modes', () => {
    it('should prevent execution in SIMULATION mode', async () => {
      const request: AgentRequest = {
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

      expect(response.success).toBe(true);
      expect(response.operationMode).toBe('SIMULATION');
      expect(response.action.executed).toBe(false);
      expect(response.result).toHaveProperty('message');
      expect((response.result as any).message).toContain('Would execute');
    });

    it('should enforce mode based on config', async () => {
      // Create gateway with forced SIMULATION
      const simConfig = { ...testConfig, forceSimulationMode: true };
      const simGateway = new AgentGateway(
        testPool,
        agentService,
        new PolicyEnforcer('http://localhost:8181', true),
        new QuotaManager(testPool),
        new ApprovalService(testPool),
        new ObservabilityService(true, true),
        simConfig
      );

      const request: AgentRequest = {
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
      expect(response.operationMode).toBe('SIMULATION');
    });
  });

  // =========================================================================
  // Scenario 5: Missing Capability
  // =========================================================================
  describe('Scenario 5: Capability Enforcement', () => {
    it('should block actions requiring missing capabilities', async () => {
      const request: AgentRequest = {
        agentId: testAgent.id,
        tenantId: 'tenant-1',
        action: {
          type: 'delete', // Agent doesn't have delete:data capability
          target: 'data',
        },
      };

      const response = await gateway.executeRequest(request, testApiKey);

      expect(response.success).toBe(false);
      // Should fail on capability check or risk level
    });

    it('should allow actions with proper capabilities', async () => {
      const request: AgentRequest = {
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
        expect(response.error?.message).not.toContain('capability');
      }
    });
  });

  // =========================================================================
  // Scenario 6: Authentication Failures
  // =========================================================================
  describe('Scenario 6: Authentication', () => {
    it('should reject invalid API keys', async () => {
      const request: AgentRequest = {
        agentId: testAgent.id,
        tenantId: 'tenant-1',
        action: {
          type: 'read',
          target: 'data',
        },
      };

      const invalidKey = 'agt_invalid_key_12345';

      await expect(
        gateway.executeRequest(request, invalidKey)
      ).rejects.toThrow();
    });

    it('should reject requests from suspended agents', async () => {
      // Suspend the agent
      await agentService.updateAgent(testAgent.id, { status: 'suspended' });

      const request: AgentRequest = {
        agentId: testAgent.id,
        tenantId: 'tenant-1',
        action: {
          type: 'read',
          target: 'data',
        },
      };

      await expect(
        gateway.executeRequest(request, testApiKey)
      ).rejects.toThrow('not active');

      // Restore agent status
      await agentService.updateAgent(testAgent.id, { status: 'active' });
    });
  });

  // =========================================================================
  // Scenario 7: Audit Logging
  // =========================================================================
  describe('Scenario 7: Audit Trail', () => {
    it('should log all agent actions', async () => {
      const request: AgentRequest = {
        agentId: testAgent.id,
        tenantId: 'tenant-1',
        action: {
          type: 'read',
          target: 'audit-test',
        },
      };

      await gateway.executeRequest(request, testApiKey);

      // Check audit log
      const logs = await testPool.query(
        'SELECT * FROM agent_audit_log WHERE agent_id = $1 ORDER BY timestamp DESC LIMIT 5',
        [testAgent.id]
      );

      expect(logs.rows.length).toBeGreaterThan(0);
    });
  });
});
