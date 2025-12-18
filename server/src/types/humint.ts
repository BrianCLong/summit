export enum SourceReliability {
  A = 'A', // Completely Reliable
  B = 'B', // Usually Reliable
  C = 'C', // Fairly Reliable
  D = 'D', // Not Usually Reliable
  E = 'E', // Unreliable
  F = 'F', // Reliability Cannot Be Judged
}

export enum ReportGrading {
  ONE = '1', // Confirmed by other sources
  TWO = '2', // Probably True
  THREE = '3', // Possibly True
  FOUR = '4', // Doubtful
  FIVE = '5', // Improbable
  SIX = '6', // Truth cannot be judged
}

export enum SourceStatus {
  RECRUITED = 'RECRUITED',
  PAUSED = 'PAUSED',
  TERMINATED = 'TERMINATED',
  BURNED = 'BURNED',
}

export enum ReportStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  VALIDATED = 'VALIDATED',
  DISSEMINATED = 'DISSEMINATED',
  REJECTED = 'REJECTED',
}

export enum RequirementPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface HumintSource {
  id: string;
  cryptonym: string;
  reliability: SourceReliability;
  accessLevel: string;
  status: SourceStatus;
  recruitedAt: Date;
  handlerId: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntelReport {
  id: string;
  sourceId: string;
  content: string;
  grading: ReportGrading;
  status: ReportStatus;
  disseminationList?: string[];
  createdAt: Date;
  createdBy: string;
  tenantId: string;
}

export interface DebriefSession {
  id: string;
  sourceId: string;
  date: Date;
  location: string;
  notes: string;
  officerId: string;
  tenantId: string;
  createdAt: Date;
}

export interface CollectionRequirement {
  id: string;
  description: string;
  priority: RequirementPriority;
  status: 'OPEN' | 'FULFILLED' | 'CANCELLED';
  assignedTo?: string; // Officer ID or Unit
  deadline?: Date;
  tenantId: string;
  createdAt: Date;
}
