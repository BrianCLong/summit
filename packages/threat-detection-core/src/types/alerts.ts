/**
 * Alert and response types
 */

import { ThreatSeverity, ThreatCategory } from './events';

export enum AlertStatus {
  NEW = 'NEW',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  FALSE_POSITIVE = 'FALSE_POSITIVE',
  ESCALATED = 'ESCALATED'
}

export enum AlertChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  SLACK = 'SLACK',
  PAGERDUTY = 'PAGERDUTY',
  WEBHOOK = 'WEBHOOK',
  SIEM = 'SIEM',
  SOAR = 'SOAR'
}

export interface Alert {
  id: string;
  timestamp: Date;

  // Alert details
  title: string;
  description: string;
  severity: ThreatSeverity;
  category: ThreatCategory;

  // Source events
  eventIds: string[];
  correlationId?: string;

  // Scoring
  threatScore: number;
  confidenceScore: number;
  priorityScore: number; // Calculated from severity, impact, etc.

  // Context
  affectedEntities: string[];
  affectedUsers?: string[];
  affectedSystems?: string[];

  // Enrichment
  enrichmentData: {
    threatIntelligence?: any;
    geolocation?: any;
    assetContext?: any;
    userContext?: any;
  };

  // Status
  status: AlertStatus;
  assignedTo?: string;

  // Response
  automatedActions?: string[];
  manualActions?: string[];
  playbooks?: string[];

  // Workflow
  createdAt: Date;
  updatedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;

  // Communication
  notifiedChannels: AlertChannel[];
  notifications: {
    channel: AlertChannel;
    sentAt: Date;
    success: boolean;
    recipient?: string;
  }[];

  // Deduplication
  fingerprint: string;
  similarAlerts?: string[];
  suppressedUntil?: Date;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  // Trigger conditions
  conditions: {
    field: string;
    operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'matches';
    value: any;
  }[];

  // Time windows
  timeWindow?: number; // milliseconds
  aggregation?: 'count' | 'sum' | 'avg' | 'max' | 'min';
  threshold?: number;

  // Alert configuration
  severity: ThreatSeverity;
  category: ThreatCategory;
  channels: AlertChannel[];

  // Deduplication
  deduplicationWindow?: number; // milliseconds
  deduplicationFields?: string[];

  // Response
  automatedResponsePlaybook?: string;

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  lastTriggered?: Date;
  triggerCount: number;
  falsePositiveCount: number;
}

export interface ResponsePlaybook {
  id: string;
  name: string;
  description: string;
  category: ThreatCategory;
  severity: ThreatSeverity;

  // Execution
  steps: ResponseStep[];

  // Configuration
  automaticExecution: boolean;
  requiresApproval: boolean;
  approvers?: string[];

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  executionCount: number;
  successRate: number;
}

export interface ResponseStep {
  id: string;
  order: number;
  name: string;
  description: string;
  type: 'isolate' | 'block' | 'terminate' | 'quarantine' | 'notify' | 'investigate' | 'remediate' | 'custom';

  // Execution
  action: string; // Action identifier or script
  parameters: Record<string, any>;

  // Control flow
  continueOnFailure: boolean;
  timeout?: number; // milliseconds
  retryCount?: number;

  // Conditions
  conditions?: {
    field: string;
    operator: string;
    value: any;
  }[];
}

export interface SOARIntegration {
  id: string;
  platform: 'splunk_phantom' | 'palo_alto_cortex' | 'ibm_resilient' | 'demisto' | 'custom';
  endpoint: string;
  apiKey?: string;
  enabled: boolean;

  // Mapping
  alertMapping: Record<string, string>;
  playbookMapping: Record<string, string>;

  // Status
  lastSync?: Date;
  healthStatus: 'healthy' | 'degraded' | 'down';
}

export interface IncidentResponse {
  incidentId: string;
  alertIds: string[];

  // Status
  status: 'new' | 'investigating' | 'contained' | 'eradicating' | 'recovering' | 'closed';
  severity: ThreatSeverity;

  // Team
  responders: string[];
  leadResponder?: string;

  // Timeline
  detectedAt: Date;
  respondedAt?: Date;
  containedAt?: Date;
  resolvedAt?: Date;

  // Actions
  actionsPerformed: {
    action: string;
    performedBy: string;
    timestamp: Date;
    success: boolean;
    notes?: string;
  }[];

  // Evidence
  evidence: {
    type: 'log' | 'screenshot' | 'file' | 'network_capture' | 'memory_dump' | 'other';
    description: string;
    location: string;
    collectedAt: Date;
    collectedBy: string;
    hash?: string;
  }[];

  // Findings
  rootCause?: string;
  affectedAssets: string[];
  impactAssessment: string;
  lessonsLearned?: string;

  // Reports
  finalReport?: string;
  reportedToManagement: boolean;
  reportedToAuthorities: boolean;
}
