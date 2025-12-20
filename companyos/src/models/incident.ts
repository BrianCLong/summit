/**
 * Incident Model
 * Represents operational incidents tracked in CompanyOS
 */

export enum IncidentSeverity {
  SEV1 = 'sev1',
  SEV2 = 'sev2',
  SEV3 = 'sev3',
  SEV4 = 'sev4',
}

export enum IncidentStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  MONITORING = 'monitoring',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export interface Incident {
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedServices?: string[];
  startedAt: Date;
  detectedAt?: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  commander?: string;
  responders?: string[];
  githubIssueUrl?: string;
  githubIssueNumber?: number;
  slackChannel?: string;
  rootCause?: string;
  impactDescription?: string;
  customerImpact: boolean;
  estimatedAffectedUsers?: number;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity: IncidentSeverity;
  affectedServices?: string[];
  commander?: string;
  responders?: string[];
  impactDescription?: string;
  customerImpact?: boolean;
  estimatedAffectedUsers?: number;
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface UpdateIncidentInput {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  affectedServices?: string[];
  commander?: string;
  responders?: string[];
  rootCause?: string;
  impactDescription?: string;
  customerImpact?: boolean;
  estimatedAffectedUsers?: number;
  metadata?: Record<string, any>;
}

export interface IncidentFilter {
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  commander?: string;
  customerImpact?: boolean;
  fromDate?: Date;
  toDate?: Date;
}
