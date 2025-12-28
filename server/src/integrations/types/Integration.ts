/**
 * Integration Types
 *
 * Type definitions for the integration framework.
 *
 * SOC 2 Controls: CC6.1 (Access Control), CC7.2 (Configuration), PI1.1 (Audit)
 *
 * @module integrations/types/Integration
 */

import { Principal } from '../../types/identity.js';

// ============================================================================
// Integration Status
// ============================================================================

export type IntegrationStatus =
  | 'available'
  | 'configured'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'pending_approval';

export type ConnectionHealth = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// Integration Categories
// ============================================================================

export type IntegrationCategory =
  | 'communication'
  | 'project_management'
  | 'source_control'
  | 'monitoring'
  | 'security'
  | 'cloud'
  | 'data'
  | 'custom';

// ============================================================================
// Integration Manifest
// ============================================================================

export interface IntegrationManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  category: IntegrationCategory;
  icon?: string;
  vendor?: string;
  docsUrl?: string;
  capabilities: IntegrationCapability[];
  configSchema: ConfigSchema;
  authType: AuthType;
  requiredScopes?: string[];
  webhookSupport?: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface IntegrationCapability {
  id: string;
  name: string;
  description: string;
  direction: 'inbound' | 'outbound' | 'bidirectional';
  requiresApproval?: boolean;
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface ConfigSchema {
  type: 'object';
  properties: Record<string, ConfigProperty>;
  required?: string[];
}

export interface ConfigProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  default?: unknown;
  enum?: unknown[];
  secret?: boolean;
  format?: 'url' | 'email' | 'uri';
}

export type AuthType = 'oauth2' | 'api_key' | 'basic' | 'token' | 'none';

// ============================================================================
// Integration Instance
// ============================================================================

export interface Integration {
  id: string;
  manifestId: string;
  tenantId: string;
  name: string;
  status: IntegrationStatus;
  config: Record<string, unknown>;
  credentials?: EncryptedCredentials;
  connectionHealth: ConnectionHealth;
  lastHealthCheck?: string;
  lastSync?: string;
  errorMessage?: string;
  approvalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface EncryptedCredentials {
  encryptedData: string;
  keyId: string;
  algorithm: string;
}

// ============================================================================
// Integration Actions
// ============================================================================

export interface IntegrationAction {
  id: string;
  integrationId: string;
  capability: string;
  direction: 'inbound' | 'outbound';
  payload: Record<string, unknown>;
  status: ActionStatus;
  approvalId?: string;
  result?: ActionResult;
  retryCount: number;
  scheduledAt?: string;
  executedAt?: string;
  completedAt?: string;
  createdBy: string;
  correlationId: string;
}

export type ActionStatus =
  | 'pending'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'executing'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface ActionResult {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Approval Workflow
// ============================================================================

export interface ApprovalRequest {
  id: string;
  type: 'integration_setup' | 'integration_action' | 'data_export';
  resourceId: string;
  resourceType: string;
  tenantId: string;
  requestedBy: string;
  requestedAt: string;
  reason?: string;
  riskAssessment: RiskAssessment;
  status: ApprovalStatus;
  approvers: ApproverResponse[];
  requiredApprovals: number;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'expired'
  | 'cancelled';

export interface ApproverResponse {
  userId: string;
  decision?: 'approved' | 'rejected';
  comment?: string;
  decidedAt?: string;
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  score: number;
  recommendations?: string[];
}

export interface RiskFactor {
  name: string;
  impact: 'low' | 'medium' | 'high';
  description: string;
}

// ============================================================================
// Webhook Types
// ============================================================================

export interface WebhookConfig {
  id: string;
  integrationId: string;
  tenantId: string;
  direction: 'inbound' | 'outbound';
  url?: string;
  secret: string;
  events: string[];
  headers?: Record<string, string>;
  retryPolicy: RetryPolicy;
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: unknown;
  status: 'pending' | 'delivered' | 'failed';
  attempts: number;
  lastAttempt?: string;
  response?: WebhookResponse;
  createdAt: string;
}

export interface WebhookResponse {
  statusCode: number;
  body?: string;
  headers?: Record<string, string>;
  latencyMs: number;
}

// ============================================================================
// Integration Context
// ============================================================================

export interface IntegrationContext {
  integrationId: string;
  tenantId: string;
  principal: Principal;
  correlationId: string;
  config: Record<string, unknown>;
  capabilities: string[];
}

// ============================================================================
// Integration Interface
// ============================================================================

export interface IntegrationConnector {
  manifest: IntegrationManifest;

  initialize(context: IntegrationContext): Promise<void>;

  testConnection(context: IntegrationContext): Promise<ConnectionTestResult>;

  executeAction(
    action: string,
    params: Record<string, unknown>,
    context: IntegrationContext
  ): Promise<ActionResult>;

  handleWebhook?(
    event: string,
    payload: unknown,
    context: IntegrationContext
  ): Promise<void>;

  validateConfig?(config: Record<string, unknown>): Promise<ValidationResult>;

  cleanup?(context: IntegrationContext): Promise<void>;
}

export interface ConnectionTestResult {
  connected: boolean;
  latencyMs: number;
  message?: string;
  capabilities?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors?: string[];
}

// ============================================================================
// Audit Types
// ============================================================================

export interface IntegrationAuditEntry {
  id: string;
  integrationId: string;
  tenantId: string;
  action: string;
  actorId: string;
  timestamp: string;
  success: boolean;
  duration: number;
  request?: {
    method: string;
    capability: string;
    params?: Record<string, unknown>;
  };
  response?: {
    status: number;
    data?: unknown;
    error?: string;
  };
  governanceVerdict: string;
  approvalId?: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
}
