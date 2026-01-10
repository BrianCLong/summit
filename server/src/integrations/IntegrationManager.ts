// @ts-nocheck
/**
 * Integration Manager
 *
 * Manages integration lifecycle, connections, and action execution
 * with governance-aware approval workflows.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration), PI1.1 (Audit)
 *
 * @module integrations/IntegrationManager
 */

import { v4 as uuidv4 } from 'uuid';
import {
  Integration,
  IntegrationManifest,
  IntegrationAction,
  IntegrationContext,
  IntegrationConnector,
  ActionResult,
  ActionStatus,
  ConnectionHealth,
  ApprovalRequest,
  IntegrationAuditEntry,
} from './types/Integration.js';
import { Principal } from '../types/identity.js';
import type {
  DataEnvelope,
  GovernanceVerdict,
} from '../types/data-envelope.js';
import {
  GovernanceResult,
  DataClassification,
  createDataEnvelope,
} from '../types/data-envelope.js';
import logger from '../utils/logger.js';

// ============================================================================
// Helper Functions
// ============================================================================

function createVerdict(result: GovernanceResult, reason?: string): GovernanceVerdict {
  return {
    verdictId: `verdict-${uuidv4()}`,
    policyId: 'integration-policy',
    result,
    decidedAt: new Date(),
    reason,
    evaluator: 'IntegrationManager',
  };
}

// ============================================================================
// Types
// ============================================================================

interface ExecuteOptions {
  skipApproval?: boolean;
  simulation?: boolean;
  correlationId?: string;
}

// ============================================================================
// Integration Manager Implementation
// ============================================================================

export class IntegrationManager {
  private integrations: Map<string, Integration> = new Map();
  private connectors: Map<string, IntegrationConnector> = new Map();
  private manifests: Map<string, IntegrationManifest> = new Map();
  private pendingActions: Map<string, IntegrationAction> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private auditLog: IntegrationAuditEntry[] = [];

  constructor() {
    // Register built-in connectors
    this.registerBuiltInConnectors();
  }

  private registerBuiltInConnectors(): void {
    // Connectors will be registered here
    logger.info('Integration manager initialized');
  }

  // --------------------------------------------------------------------------
  // Manifest Registration
  // --------------------------------------------------------------------------

  registerConnector(connector: IntegrationConnector): void {
    this.manifests.set(connector.manifest.id, connector.manifest);
    this.connectors.set(connector.manifest.id, connector);
    logger.info({ manifestId: connector.manifest.id }, 'Connector registered');
  }

  getAvailableIntegrations(): DataEnvelope<IntegrationManifest[]> {
    const manifests = Array.from(this.manifests.values());
    return createDataEnvelope(manifests, {
      source: 'IntegrationManager',
      governanceVerdict: createVerdict(GovernanceResult.ALLOW, 'Integration manifests listed'),
      classification: DataClassification.INTERNAL,
    });
  }

  // --------------------------------------------------------------------------
  // Integration Setup
  // --------------------------------------------------------------------------

  async setupIntegration(
    manifestId: string,
    name: string,
    config: Record<string, unknown>,
    tenantId: string,
    principal: Principal
  ): Promise<DataEnvelope<Integration>> {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) {
      throw new Error(`Integration manifest not found: ${manifestId}`);
    }

    const connector = this.connectors.get(manifestId);
    if (!connector) {
      throw new Error(`Connector not found: ${manifestId}`);
    }

    // Validate configuration
    if (connector.validateConfig) {
      const validation = await connector.validateConfig(config);
      if (!validation.valid) {
        throw new Error(`Invalid configuration: ${validation.errors?.join(', ')}`);
      }
    }

    // Check if approval is required for high-risk integrations
    const requiresApproval = manifest.riskLevel === 'high' || manifest.riskLevel === 'critical';

    const integration: Integration = {
      id: uuidv4(),
      manifestId,
      tenantId,
      name,
      status: requiresApproval ? 'pending_approval' : 'configured',
      config,
      connectionHealth: 'unknown',
      approvalRequired: requiresApproval,
      createdAt: new Date().toISOString(),
      createdBy: principal.id,
      updatedAt: new Date().toISOString(),
    };

    // Create approval request if needed
    if (requiresApproval) {
      await this.createApprovalRequest(
        'integration_setup',
        integration.id,
        'integration',
        tenantId,
        principal.id,
        {
          level: manifest.riskLevel as 'low' | 'medium' | 'high' | 'critical',
          factors: [
            {
              name: 'Integration Risk Level',
              impact: manifest.riskLevel === 'critical' ? 'high' : 'medium',
              description: `This is a ${manifest.riskLevel}-risk integration`,
            },
          ],
          score: manifest.riskLevel === 'critical' ? 90 : 70,
        }
      );
    }

    this.integrations.set(integration.id, integration);

    // Log audit entry
    this.logAudit({
      integrationId: integration.id,
      tenantId,
      action: 'setup',
      actorId: principal.id,
      success: true,
      governanceVerdict: requiresApproval ? 'REVIEW_REQUIRED' : 'ALLOW',
    });

    return createDataEnvelope(integration, {
      source: 'IntegrationManager',
      actor: principal.id,
      governanceVerdict: createVerdict(
        requiresApproval ? GovernanceResult.REVIEW_REQUIRED : GovernanceResult.ALLOW,
        requiresApproval ? 'Integration requires approval' : 'Integration setup allowed'
      ),
      classification: DataClassification.CONFIDENTIAL,
    });
  }

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  async connect(
    integrationId: string,
    principal: Principal
  ): Promise<DataEnvelope<Integration>> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    if (integration.status === 'pending_approval') {
      throw new Error('Integration is pending approval');
    }

    const connector = this.connectors.get(integration.manifestId);
    if (!connector) {
      throw new Error(`Connector not found: ${integration.manifestId}`);
    }

    const context = this.buildContext(integration, principal);

    try {
      await connector.initialize(context);
      const testResult = await connector.testConnection(context);

      integration.status = testResult.connected ? 'connected' : 'error';
      integration.connectionHealth = testResult.connected ? 'healthy' : 'unhealthy';
      integration.lastHealthCheck = new Date().toISOString();
      integration.errorMessage = testResult.connected ? undefined : testResult.message;
      integration.updatedAt = new Date().toISOString();
      integration.updatedBy = principal.id;

      this.logAudit({
        integrationId,
        tenantId: integration.tenantId,
        action: 'connect',
        actorId: principal.id,
        success: testResult.connected,
        governanceVerdict: 'ALLOW',
      });

      return {
        data: integration,
        provenance: {
          sources: [{ id: 'integration-manager', type: 'system' }],
          confidence: 1.0,
        },
        governance: {
          verdict: GovernanceResult.ALLOW,
          evaluatedPolicies: [],
          enforcedAt: new Date().toISOString(),
        },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      integration.status = 'error';
      integration.connectionHealth = 'unhealthy';
      integration.errorMessage = error.message;

      this.logAudit({
        integrationId,
        tenantId: integration.tenantId,
        action: 'connect',
        actorId: principal.id,
        success: false,
        governanceVerdict: 'ALLOW',
      });

      throw error;
    }
  }

  async disconnect(
    integrationId: string,
    principal: Principal
  ): Promise<DataEnvelope<Integration>> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    const connector = this.connectors.get(integration.manifestId);
    if (connector?.cleanup) {
      const context = this.buildContext(integration, principal);
      await connector.cleanup(context);
    }

    integration.status = 'disconnected';
    integration.connectionHealth = 'unknown';
    integration.updatedAt = new Date().toISOString();
    integration.updatedBy = principal.id;

    this.logAudit({
      integrationId,
      tenantId: integration.tenantId,
      action: 'disconnect',
      actorId: principal.id,
      success: true,
      governanceVerdict: 'ALLOW',
    });

    return {
      data: integration,
      provenance: {
        sources: [{ id: 'integration-manager', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: GovernanceResult.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // --------------------------------------------------------------------------
  // Action Execution
  // --------------------------------------------------------------------------

  async executeAction(
    integrationId: string,
    capability: string,
    params: Record<string, unknown>,
    principal: Principal,
    options: ExecuteOptions = {}
  ): Promise<DataEnvelope<ActionResult>> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    if (integration.status !== 'connected') {
      throw new Error(`Integration is not connected: ${integration.status}`);
    }

    const manifest = this.manifests.get(integration.manifestId);
    const capabilityDef = manifest?.capabilities.find((c) => c.id === capability);

    if (!capabilityDef) {
      throw new Error(`Capability not found: ${capability}`);
    }

    const correlationId = options.correlationId || uuidv4();

    // Check if approval is required
    const requiresApproval =
      !options.skipApproval &&
      (capabilityDef.requiresApproval ||
        capabilityDef.dataClassification === 'restricted' ||
        capabilityDef.dataClassification === 'confidential');

    const action: IntegrationAction = {
      id: uuidv4(),
      integrationId,
      capability,
      direction: capabilityDef.direction === 'bidirectional' ? 'outbound' : capabilityDef.direction,
      payload: params,
      status: requiresApproval ? 'pending_approval' : 'pending',
      retryCount: 0,
      createdBy: principal.id,
      correlationId,
    };

    if (options.simulation) {
      return {
        data: {
          success: true,
          data: { simulation: true, message: 'Action would be executed' },
        },
        provenance: {
          sources: [{ id: 'integration-manager', type: 'system' }],
          confidence: 1.0,
        },
        governance: {
          verdict: requiresApproval ? GovernanceResult.REVIEW_REQUIRED : GovernanceResult.ALLOW,
          evaluatedPolicies: [],
          enforcedAt: new Date().toISOString(),
        },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      };
    }

    if (requiresApproval) {
      this.pendingActions.set(action.id, action);
      await this.createApprovalRequest(
        'integration_action',
        action.id,
        'action',
        integration.tenantId,
        principal.id,
        {
          level: capabilityDef.dataClassification === 'restricted' ? 'high' : 'medium',
          factors: [
            {
              name: 'Data Classification',
              impact: capabilityDef.dataClassification === 'restricted' ? 'high' : 'medium',
              description: `This action involves ${capabilityDef.dataClassification} data`,
            },
          ],
          score: capabilityDef.dataClassification === 'restricted' ? 80 : 60,
        }
      );

      return {
        data: {
          success: false,
          data: { pendingApproval: true, actionId: action.id },
        },
        provenance: {
          sources: [{ id: 'integration-manager', type: 'system' }],
          confidence: 1.0,
        },
        governance: {
          verdict: GovernanceResult.REVIEW_REQUIRED,
          evaluatedPolicies: [],
          enforcedAt: new Date().toISOString(),
        },
        meta: {
          generatedAt: new Date().toISOString(),
        },
      };
    }

    // Execute immediately
    return this.executeActionInternal(action, integration, principal);
  }

  private async executeActionInternal(
    action: IntegrationAction,
    integration: Integration,
    principal: Principal
  ): Promise<DataEnvelope<ActionResult>> {
    const connector = this.connectors.get(integration.manifestId);
    if (!connector) {
      throw new Error(`Connector not found: ${integration.manifestId}`);
    }

    const context = this.buildContext(integration, principal, action.correlationId);
    const startTime = Date.now();

    try {
      action.status = 'executing';
      action.executedAt = new Date().toISOString();

      const result = await connector.executeAction(action.capability, action.payload, context);

      action.status = result.success ? 'completed' : 'failed';
      action.result = result;
      action.completedAt = new Date().toISOString();

      this.logAudit({
        integrationId: integration.id,
        tenantId: integration.tenantId,
        action: `execute:${action.capability}`,
        actorId: principal.id,
        success: result.success,
        duration: Date.now() - startTime,
        governanceVerdict: 'ALLOW',
        correlationId: action.correlationId,
        request: {
          method: 'POST',
          capability: action.capability,
          params: action.payload,
        },
        response: {
          status: result.success ? 200 : 500,
          data: result.data,
          error: result.error,
        },
      });

      return {
        data: result,
        provenance: {
          sources: [
            { id: integration.id, type: 'integration' },
            { id: integration.manifestId, type: 'connector' },
          ],
          confidence: 1.0,
        },
        governance: {
          verdict: GovernanceResult.ALLOW,
          evaluatedPolicies: [],
          enforcedAt: new Date().toISOString(),
        },
        meta: {
          generatedAt: new Date().toISOString(),
          correlationId: action.correlationId,
        },
      };
    } catch (error: any) {
      action.status = 'failed';
      action.result = { success: false, error: error.message };

      this.logAudit({
        integrationId: integration.id,
        tenantId: integration.tenantId,
        action: `execute:${action.capability}`,
        actorId: principal.id,
        success: false,
        duration: Date.now() - startTime,
        governanceVerdict: 'ALLOW',
        correlationId: action.correlationId,
      });

      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // Approval Workflow
  // --------------------------------------------------------------------------

  private async createApprovalRequest(
    type: ApprovalRequest['type'],
    resourceId: string,
    resourceType: string,
    tenantId: string,
    requestedBy: string,
    riskAssessment: ApprovalRequest['riskAssessment']
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: uuidv4(),
      type,
      resourceId,
      resourceType,
      tenantId,
      requestedBy,
      requestedAt: new Date().toISOString(),
      riskAssessment,
      status: 'pending',
      approvers: [],
      requiredApprovals: riskAssessment.level === 'critical' ? 2 : 1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    this.approvalRequests.set(request.id, request);
    logger.info({ requestId: request.id, type }, 'Approval request created');

    return request;
  }

  async approveRequest(
    requestId: string,
    principal: Principal,
    comment?: string
  ): Promise<DataEnvelope<ApprovalRequest>> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    request.approvers.push({
      userId: principal.id,
      decision: 'approved',
      comment,
      decidedAt: new Date().toISOString(),
    });

    const approvalCount = request.approvers.filter((a) => a.decision === 'approved').length;
    if (approvalCount >= request.requiredApprovals) {
      request.status = 'approved';

      // Process the approved resource
      if (request.type === 'integration_setup') {
        const integration = this.integrations.get(request.resourceId);
        if (integration) {
          integration.status = 'configured';
          integration.approvedBy = principal.id;
          integration.approvedAt = new Date().toISOString();
        }
      } else if (request.type === 'integration_action') {
        const action = this.pendingActions.get(request.resourceId);
        if (action) {
          action.status = 'approved';
          action.approvalId = requestId;
          // Execute the action
          const integration = this.integrations.get(action.integrationId);
          if (integration) {
            await this.executeActionInternal(action, integration, principal);
          }
        }
      }
    }

    return {
      data: request,
      provenance: {
        sources: [{ id: 'approval-workflow', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: GovernanceResult.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async rejectRequest(
    requestId: string,
    principal: Principal,
    comment?: string
  ): Promise<DataEnvelope<ApprovalRequest>> {
    const request = this.approvalRequests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Request is already ${request.status}`);
    }

    request.approvers.push({
      userId: principal.id,
      decision: 'rejected',
      comment,
      decidedAt: new Date().toISOString(),
    });

    request.status = 'rejected';

    // Update related resources
    if (request.type === 'integration_action') {
      const action = this.pendingActions.get(request.resourceId);
      if (action) {
        action.status = 'rejected';
      }
    }

    return {
      data: request,
      provenance: {
        sources: [{ id: 'approval-workflow', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: GovernanceResult.DENY,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  getPendingApprovals(tenantId: string): DataEnvelope<ApprovalRequest[]> {
    const requests = Array.from(this.approvalRequests.values()).filter(
      (r: any) => r.tenantId === tenantId && r.status === 'pending'
    );

    return {
      data: requests,
      provenance: {
        sources: [{ id: 'approval-workflow', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: GovernanceVerdict.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // --------------------------------------------------------------------------
  // Query Methods
  // --------------------------------------------------------------------------

  getIntegrations(
    tenantId: string,
    filters?: { status?: string; category?: string }
  ): DataEnvelope<Integration[]> {
    let integrations = Array.from(this.integrations.values()).filter(
      (i) => i.tenantId === tenantId
    );

    if (filters?.status) {
      integrations = integrations.filter((i) => i.status === filters.status);
    }

    if (filters?.category) {
      integrations = integrations.filter((i) => {
        const manifest = this.manifests.get(i.manifestId);
        return manifest?.category === filters.category;
      });
    }

    return {
      data: integrations,
      provenance: {
        sources: [{ id: 'integration-manager', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: GovernanceResult.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  getIntegration(integrationId: string): DataEnvelope<Integration | null> {
    const integration = this.integrations.get(integrationId) || null;

    return {
      data: integration,
      provenance: {
        sources: [{ id: 'integration-manager', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: GovernanceVerdict.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // --------------------------------------------------------------------------
  // Audit & Monitoring
  // --------------------------------------------------------------------------

  private logAudit(entry: Partial<IntegrationAuditEntry>): void {
    const fullEntry: IntegrationAuditEntry = {
      id: uuidv4(),
      integrationId: entry.integrationId!,
      tenantId: entry.tenantId!,
      action: entry.action!,
      actorId: entry.actorId!,
      timestamp: new Date().toISOString(),
      success: entry.success ?? true,
      duration: entry.duration ?? 0,
      governanceVerdict: entry.governanceVerdict!,
      correlationId: entry.correlationId || uuidv4(),
      request: entry.request,
      response: entry.response,
      metadata: entry.metadata,
    };

    this.auditLog.push(fullEntry);
    logger.info({ auditEntry: fullEntry }, 'Integration audit log');
  }

  getAuditLog(
    tenantId: string,
    filters?: { integrationId?: string; from?: string; to?: string }
  ): DataEnvelope<IntegrationAuditEntry[]> {
    let entries = this.auditLog.filter((e) => e.tenantId === tenantId);

    if (filters?.integrationId) {
      entries = entries.filter((e) => e.integrationId === filters.integrationId);
    }

    if (filters?.from) {
      entries = entries.filter((e) => e.timestamp >= filters.from!);
    }

    if (filters?.to) {
      entries = entries.filter((e) => e.timestamp <= filters.to!);
    }

    return {
      data: entries.slice(-100), // Last 100 entries
      provenance: {
        sources: [{ id: 'integration-audit', type: 'system' }],
        confidence: 1.0,
      },
      governance: {
        verdict: GovernanceResult.ALLOW,
        evaluatedPolicies: [],
        enforcedAt: new Date().toISOString(),
      },
      meta: {
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private buildContext(
    integration: Integration,
    principal: Principal,
    correlationId?: string
  ): IntegrationContext {
    const manifest = this.manifests.get(integration.manifestId);
    return {
      integrationId: integration.id,
      tenantId: integration.tenantId,
      principal,
      correlationId: correlationId || uuidv4(),
      config: integration.config,
      capabilities: manifest?.capabilities.map((c) => c.id) || [],
    };
  }
}

// Export singleton
export const integrationManager = new IntegrationManager();
export default IntegrationManager;
