/**
 * Unified Audit Log Types
 * Common schema for aggregating audit events from CompanyOS, Switchboard, and Summit
 */

import { z } from 'zod';

// Source systems
export const AuditSourceSchema = z.enum(['companyos', 'switchboard', 'summit', 'prov-ledger', 'auditlake']);
export type AuditSource = z.infer<typeof AuditSourceSchema>;

// Severity levels
export const AuditSeveritySchema = z.enum(['debug', 'info', 'warn', 'error', 'critical']);
export type AuditSeverity = z.infer<typeof AuditSeveritySchema>;

// Action categories
export const AuditCategorySchema = z.enum([
  'authentication',
  'authorization',
  'data_access',
  'data_modification',
  'system_event',
  'security_event',
  'compliance_event',
  'user_action',
  'admin_action',
  'integration_event',
  'ai_action',
]);
export type AuditCategory = z.infer<typeof AuditCategorySchema>;

// Compliance frameworks
export const ComplianceFrameworkSchema = z.enum([
  'SOC2',
  'GDPR',
  'HIPAA',
  'SOX',
  'NIST',
  'ISO27001',
  'CCPA',
  'PCI_DSS',
  'FedRAMP',
]);
export type ComplianceFramework = z.infer<typeof ComplianceFrameworkSchema>;

// Outcome status
export const AuditOutcomeSchema = z.enum(['success', 'failure', 'partial', 'pending', 'blocked']);
export type AuditOutcome = z.infer<typeof AuditOutcomeSchema>;

// Unified Audit Event schema
export const UnifiedAuditEventSchema = z.object({
  // Core identification
  id: z.string().uuid(),
  source: AuditSourceSchema,
  sourceEventId: z.string().optional(), // Original event ID from source system

  // Timing
  timestamp: z.date(),
  receivedAt: z.date().optional(),
  processedAt: z.date().optional(),

  // Classification
  eventType: z.string(),
  category: AuditCategorySchema,
  severity: AuditSeveritySchema,

  // Context
  tenantId: z.string(),
  correlationId: z.string().uuid().optional(),
  sessionId: z.string().optional(),
  requestId: z.string().optional(),
  traceId: z.string().optional(),
  spanId: z.string().optional(),

  // Actor
  actor: z.object({
    id: z.string(),
    type: z.enum(['user', 'service', 'system', 'api_key', 'anonymous']),
    email: z.string().email().optional(),
    name: z.string().optional(),
    roles: z.array(z.string()).optional(),
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
    impersonatedBy: z.string().optional(),
  }),

  // Resource
  resource: z.object({
    type: z.string(),
    id: z.string(),
    name: z.string().optional(),
    path: z.string().optional(),
  }).optional(),

  // Action details
  action: z.string(),
  outcome: AuditOutcomeSchema,
  message: z.string().optional(),

  // State changes
  changes: z.object({
    before: z.record(z.unknown()).optional(),
    after: z.record(z.unknown()).optional(),
    diff: z.array(z.object({
      field: z.string(),
      oldValue: z.unknown(),
      newValue: z.unknown(),
    })).optional(),
  }).optional(),

  // Compliance
  compliance: z.object({
    relevant: z.boolean(),
    frameworks: z.array(ComplianceFrameworkSchema).optional(),
    dataClassification: z.enum(['public', 'internal', 'confidential', 'restricted', 'top_secret']).optional(),
    retentionDays: z.number().int().optional(),
    legalHold: z.boolean().optional(),
  }).optional(),

  // Integrity
  integrity: z.object({
    hash: z.string(),
    previousHash: z.string().optional(),
    signature: z.string().optional(),
    algorithm: z.string().optional(),
  }).optional(),

  // Error details
  error: z.object({
    code: z.string(),
    message: z.string(),
    stack: z.string().optional(),
  }).optional(),

  // Additional metadata
  metadata: z.record(z.unknown()).optional(),
  tags: z.array(z.string()).optional(),
});

export type UnifiedAuditEvent = z.infer<typeof UnifiedAuditEventSchema>;

// Query interface
export const AuditQuerySchema = z.object({
  // Filters
  sources: z.array(AuditSourceSchema).optional(),
  categories: z.array(AuditCategorySchema).optional(),
  severities: z.array(AuditSeveritySchema).optional(),
  eventTypes: z.array(z.string()).optional(),
  tenantIds: z.array(z.string()).optional(),
  actorIds: z.array(z.string()).optional(),
  resourceTypes: z.array(z.string()).optional(),
  resourceIds: z.array(z.string()).optional(),
  outcomes: z.array(AuditOutcomeSchema).optional(),
  correlationId: z.string().uuid().optional(),

  // Time range
  startTime: z.date().optional(),
  endTime: z.date().optional(),

  // Full-text search
  searchText: z.string().optional(),

  // Compliance
  complianceRelevant: z.boolean().optional(),
  frameworks: z.array(ComplianceFrameworkSchema).optional(),

  // Pagination
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  cursor: z.string().optional(),

  // Sorting
  sortBy: z.enum(['timestamp', 'severity', 'category', 'source']).default('timestamp'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type AuditQuery = z.infer<typeof AuditQuerySchema>;

// Query result
export interface AuditQueryResult {
  events: UnifiedAuditEvent[];
  total: number;
  hasMore: boolean;
  nextCursor?: string;
}

// Aggregation types
export interface AuditAggregation {
  bySource: Record<AuditSource, number>;
  byCategory: Record<AuditCategory, number>;
  bySeverity: Record<AuditSeverity, number>;
  byOutcome: Record<AuditOutcome, number>;
  byHour: { hour: string; count: number }[];
  topActors: { actorId: string; count: number }[];
  topResources: { resourceType: string; resourceId: string; count: number }[];
}

// Compliance report
export interface ComplianceReport {
  framework: ComplianceFramework;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    totalEvents: number;
    criticalEvents: number;
    violations: number;
    complianceScore: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
  };
  violations: {
    eventId: string;
    type: string;
    severity: AuditSeverity;
    description: string;
    remediation?: string;
  }[];
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    category: string;
    description: string;
    implementationEffort: string;
  }[];
  generatedAt: Date;
}

// Forensic analysis
export interface ForensicAnalysis {
  correlationId: string;
  timeline: {
    timestamp: Date;
    eventId: string;
    source: AuditSource;
    action: string;
    actor: string;
    outcome: AuditOutcome;
  }[];
  actorAnalysis: {
    actorId: string;
    actionsCount: number;
    riskScore: number;
    suspiciousActions: string[];
    ipAddresses: string[];
    userAgents: string[];
  };
  resourceAnalysis: {
    resourceType: string;
    resourceId: string;
    accessCount: number;
    modificationCount: number;
    lastAccessed: Date;
  }[];
  anomalies: {
    type: string;
    severity: AuditSeverity;
    confidence: number;
    description: string;
    eventIds: string[];
  }[];
  summary: {
    eventCount: number;
    timeSpanMs: number;
    uniqueActors: number;
    uniqueResources: number;
    anomalyCount: number;
    overallRiskScore: number;
  };
}

// Integrity verification result
export interface IntegrityVerification {
  verified: boolean;
  totalRecords: number;
  verifiedRecords: number;
  brokenChainAt?: string;
  errors: { eventId: string; error: string }[];
  verifiedAt: Date;
}
