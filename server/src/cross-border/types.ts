/**
 * Cross-Border AI/Virtual Assistant Interoperability Types
 *
 * Inspired by Estonia's Bürokratt initiative for seamless cross-border
 * government virtual assistant collaboration.
 */

/**
 * Partner nation status in the interoperability network
 */
export type PartnerStatus = 'active' | 'pending' | 'suspended' | 'inactive';

/**
 * Handover state during cross-border session transfer
 */
export type HandoverState =
  | 'initiated'
  | 'context_transfer'
  | 'awaiting_acceptance'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'rolled_back';

/**
 * Security classification for cross-border data sharing
 */
export type DataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'top_secret';

/**
 * Partner nation endpoint configuration
 */
export interface PartnerNation {
  id: string;
  code: string; // ISO 3166-1 alpha-2 (e.g., 'EE', 'FI', 'LV')
  name: string;
  region: string; // Geographic region (e.g., 'EU', 'NATO', 'Five Eyes')
  status: PartnerStatus;
  endpoint: PartnerEndpoint;
  capabilities: AssistantCapabilities;
  languages: string[]; // ISO 639-1 codes
  trustLevel: TrustLevel;
  dataAgreements: DataSharingAgreement[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Partner assistant endpoint configuration
 */
export interface PartnerEndpoint {
  baseUrl: string;
  wsUrl?: string;
  protocol: 'mcp' | 'openai' | 'rest' | 'grpc';
  version: string;
  healthCheckPath: string;
  authMethod: 'mtls' | 'jwt' | 'api_key' | 'oauth2';
  publicKey?: string;
  certificateFingerprint?: string;
}

/**
 * Trust level for partner nations
 */
export interface TrustLevel {
  level: 1 | 2 | 3 | 4 | 5; // 5 = highest trust
  maxDataClassification: DataClassification;
  allowedOperations: string[];
  requiresApproval: boolean;
  auditRequired: boolean;
}

/**
 * Capabilities exposed by a partner assistant
 */
export interface AssistantCapabilities {
  domains: string[]; // e.g., 'tax', 'immigration', 'healthcare', 'business'
  operations: string[]; // e.g., 'query', 'submit', 'verify', 'translate'
  maxContextSize: number;
  supportsStreaming: boolean;
  supportsMultimodal: boolean;
  responseTimeMs: number;
}

/**
 * Data sharing agreement between nations
 */
export interface DataSharingAgreement {
  id: string;
  name: string;
  type: 'bilateral' | 'multilateral' | 'framework';
  scope: DataClassification[];
  domains: string[];
  expiresAt?: Date;
  restrictions: string[];
}

/**
 * Cross-border session for tracking handovers
 */
export interface CrossBorderSession {
  id: string;
  originNation: string;
  targetNation: string;
  state: HandoverState;
  context: SessionContext;
  handoverChain: HandoverRecord[];
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

/**
 * Session context transferred during handover
 */
export interface SessionContext {
  conversationId: string;
  userId?: string;
  agentId?: string;
  language: string;
  targetLanguage?: string;
  intent: string;
  entities: ContextEntity[];
  summary: string;
  metadata: Record<string, unknown>;
  dataClassification: DataClassification;
  retentionPolicy: RetentionPolicy;
}

/**
 * Entity extracted from conversation context
 */
export interface ContextEntity {
  type: string;
  value: string;
  confidence: number;
  redacted: boolean;
}

/**
 * Record of a single handover in the chain
 */
export interface HandoverRecord {
  id: string;
  fromNation: string;
  toNation: string;
  timestamp: Date;
  reason: string;
  status: 'success' | 'failed' | 'timeout';
  durationMs: number;
  contextHash: string;
}

/**
 * Data retention policy for cross-border sessions
 */
export interface RetentionPolicy {
  maxDurationHours: number;
  deleteOnCompletion: boolean;
  auditRetentionDays: number;
  allowedRegions: string[];
}

/**
 * Handover request from one assistant to another
 */
export interface HandoverRequest {
  sessionId: string;
  sourceNation: string;
  targetNation: string;
  context: SessionContext;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  timeoutMs: number;
  callbackUrl?: string;
}

/**
 * Response to a handover request
 */
export interface HandoverResponse {
  sessionId: string;
  accepted: boolean;
  targetSessionId?: string;
  estimatedWaitMs?: number;
  rejectionReason?: string;
  capabilities?: AssistantCapabilities;
}

/**
 * Message format for cross-border communication
 */
export interface CrossBorderMessage {
  id: string;
  sessionId: string;
  type: 'user' | 'assistant' | 'system' | 'handover';
  content: string;
  language: string;
  translations?: Record<string, string>;
  timestamp: Date;
  metadata: MessageMetadata;
}

/**
 * Metadata attached to cross-border messages
 */
export interface MessageMetadata {
  sourceNation: string;
  confidence?: number;
  processingTimeMs?: number;
  modelVersion?: string;
  encrypted: boolean;
}

/**
 * Health status of a partner endpoint
 */
export interface PartnerHealth {
  partnerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latencyMs: number;
  lastChecked: Date;
  errorRate: number;
  uptime: number;
}

/**
 * Audit log entry for cross-border operations
 */
export interface CrossBorderAuditEntry {
  id: string;
  timestamp: Date;
  operation: string;
  sessionId?: string;
  sourceNation: string;
  targetNation: string;
  userId?: string;
  dataClassification: DataClassification;
  success: boolean;
  details: Record<string, unknown>;
}
