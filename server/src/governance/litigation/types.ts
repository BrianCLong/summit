import { LegalHold } from '../retention/types.js';

export interface MatterIntakeForm {
  matterNumber: string;
  title: string;
  description: string;
  triggeringAuthority: 'gc' | 'deputy_gc' | 'ciso' | 'head_of_people';
  custodians: string[];
  systems: string[];
  datasets: string[];
  exposureAssessment: string;
  privilegeStatus: 'privileged' | 'non-privileged';
  proposedScope: string;
  nextSteps: string[];
  timeline?: Array<{
    occurredAt: Date;
    description: string;
  }>;
}

export interface CustodyEvent {
  artifactId: string;
  eventType: 'ingested' | 'transferred' | 'verified' | 'exported';
  actor: string;
  channel: string;
  occurredAt: Date;
  notes?: string;
  checksum?: string;
}

export interface EvidenceArtifact {
  id: string;
  holdId?: string;
  datasetId?: string;
  system: string;
  location: string;
  hash: string;
  receivedAt: Date;
  custodian?: string;
  notes?: string;
  tags?: string[];
  custodyTrail: CustodyEvent[];
}

export interface EvidenceRegistryOptions {
  pool?: { query: (sql: string, params?: unknown[]) => Promise<unknown> };
}

export interface ExportScope {
  datasetId: string;
  holdId: string;
  filters?: Record<string, string | number | boolean>;
  description?: string;
}

export interface ExportManifest {
  manifestId: string;
  holdId: string;
  datasetId: string;
  createdAt: Date;
  recordCount: number;
  payloadPath: string;
  checksum: string;
  scope: ExportScope;
  verifier: 'sha256';
}

export interface ExportJobResult {
  manifest: ExportManifest;
  custodyEvent: CustodyEvent;
  evidenceArtifact: EvidenceArtifact;
}

export type LitigationHoldRecord = LegalHold & {
  id: string;
  matterNumber: string;
  issuedAt: Date;
  issuedBy: string;
  datasets: string[];
  deadlineAcknowledgement: Date;
  deadlinePreservation: Date;
  acknowledgements: Array<{
    custodianId: string;
    acknowledgedAt: Date;
    channel: 'email' | 'sms' | 'in-app';
    acknowledgementHash: string;
  }>;
};

