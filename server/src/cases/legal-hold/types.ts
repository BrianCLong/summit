import { KeyObject } from 'crypto';

export type LegalHoldStatus = 'DRAFT' | 'ACTIVE' | 'RELEASED' | 'FAILED';

export type CustodianStatus =
  | 'pending_notification'
  | 'notified'
  | 'acknowledged'
  | 'escalated'
  | 'released';

export interface LegalHoldCustodian {
  id: string;
  name: string;
  email: string;
  department?: string;
  managerId?: string;
  location?: string;
  status?: CustodianStatus;
  notifiedAt?: Date | null;
  acknowledgedAt?: Date | null;
  releasedAt?: Date | null;
}

export interface PreservationDataScope {
  connectors: string[];
  dataSets: string[];
  searchTerms?: string[];
  additionalFilters?: Record<string, string | number | boolean>;
  retentionOverrideDays?: number;
}

export interface LifecyclePolicyLink {
  policyId: string;
  policyName: string;
  retentionDays: number;
  suspensionApplied: boolean;
  notes?: string;
}

export interface LegalHoldInitiationInput {
  caseId: string;
  holdName: string;
  reason: string;
  issuedBy: {
    id: string;
    name: string;
    role: string;
    email?: string;
  };
  custodians: LegalHoldCustodian[];
  scope: PreservationDataScope;
  notificationTemplateId?: string;
  additionalMetadata?: Record<string, any>;
  lifecyclePolicyOverrides?: LifecyclePolicyLink[];
  eDiscovery?: {
    enabled: boolean;
    exportFormats?: string[];
    searchProfiles?: string[];
    matterId?: string;
  };
}

export interface PreservationHoldInput {
  holdId: string;
  caseId: string;
  holdName: string;
  custodians: LegalHoldCustodian[];
  scope: PreservationDataScope;
  issuedBy: LegalHoldInitiationInput['issuedBy'];
  metadata?: Record<string, any>;
}

export interface PreservationHoldResult {
  connectorId: string;
  referenceId: string;
  status: 'applied' | 'pending' | 'failed';
  location?: string;
  error?: string;
  policyOverrides?: LifecyclePolicyLink[];
  verificationRequired?: boolean;
}

export interface PreservationVerificationResult {
  connectorId: string;
  referenceId: string;
  verified: boolean;
  details?: string;
  checkedAt: Date;
}

export interface EDiscoveryCollectionRequest {
  holdId: string;
  caseId: string;
  matterId?: string;
  searchTerms?: string[];
  exportFormat?: string;
}

export interface EDiscoveryCollectionResult {
  connectorId: string;
  exportPath: string;
  format: string;
  itemCount: number;
  generatedAt: Date;
}

export interface ComplianceCheckpoint {
  checkId: string;
  description: string;
  status: 'pass' | 'fail' | 'warning';
  details?: string;
  timestamp: Date;
}

export interface LegalHoldRecord {
  holdId: string;
  caseId: string;
  holdName: string;
  status: LegalHoldStatus;
  reason: string;
  issuedBy: LegalHoldInitiationInput['issuedBy'];
  scope: PreservationDataScope;
  custodians: LegalHoldCustodian[];
  connectors: PreservationHoldResult[];
  lifecyclePolicies: LifecyclePolicyLink[];
  compliance: ComplianceCheckpoint[];
  notifications: LegalHoldNotificationRecord[];
  createdAt: Date;
  updatedAt: Date;
  eDiscovery?: {
    enabled: boolean;
    latestCollections?: EDiscoveryCollectionResult[];
    matterId?: string;
    exportFormats?: string[];
  };
  metadata?: Record<string, any>;
}

export interface LegalHoldNotificationRecord {
  notificationId: string;
  templateId?: string;
  recipients: string[];
  channel: string;
  status: 'queued' | 'sent' | 'failed';
  dispatchedAt: Date;
  error?: string;
}

export interface AuditTrailEntry {
  holdId: string;
  caseId: string;
  actorId: string;
  actorRole?: string;
  action: string;
  details?: Record<string, any>;
  createdAt: Date;
}

export interface PreservationConnector {
  id: string;
  displayName: string;
  supportsVerification: boolean;
  supportsExport: boolean;
  applyHold(input: PreservationHoldInput): Promise<PreservationHoldResult>;
  verifyHold(
    holdId: string,
    caseId: string,
    scope: PreservationDataScope,
  ): Promise<PreservationVerificationResult>;
  collectPreservedData?(
    request: EDiscoveryCollectionRequest,
  ): Promise<EDiscoveryCollectionResult>;
  releaseHold?(holdId: string, caseId: string): Promise<void>;
}

export interface LegalHoldRepository {
  create(record: LegalHoldRecord): Promise<void>;
  update(holdId: string, update: Partial<LegalHoldRecord>): Promise<void>;
  getById(holdId: string): Promise<LegalHoldRecord | undefined>;
  recordCustodianStatus(
    holdId: string,
    custodianId: string,
    status: CustodianStatus,
    metadata?: Partial<LegalHoldCustodian>,
  ): Promise<void>;
  recordConnectorAction(
    holdId: string,
    result: PreservationHoldResult,
  ): Promise<void>;
  recordVerification(
    holdId: string,
    verification: PreservationVerificationResult,
  ): Promise<void>;
  recordCompliance(
    holdId: string,
    checkpoint: ComplianceCheckpoint,
  ): Promise<void>;
  recordNotification(
    holdId: string,
    notification: LegalHoldNotificationRecord,
  ): Promise<void>;
  appendAudit(entry: AuditTrailEntry): Promise<void>;
  listAudit(holdId: string): Promise<AuditTrailEntry[]>;
}

export interface LegalHoldNotificationDispatcher {
  sendNotification(payload: {
    templateId?: string;
    recipients: LegalHoldCustodian[];
    channel?: string;
    data: Record<string, any>;
    priority?: string;
    metadata?: Record<string, any>;
  }): Promise<{ id: string; status: 'queued' | 'sent' | 'failed' }>;
}

export interface ChainOfCustodyAdapter {
  appendEvent(event: {
    caseId: string;
    actorId: string;
    action: string;
    payload?: Record<string, any>;
  }): Promise<string | null>;
  verify(caseId: string): Promise<boolean>;
  getSigningKeys?():
    | { privateKey: KeyObject; publicKey: KeyObject }
    | undefined;
}

export interface LegalHoldOrchestratorOptions {
  repository: LegalHoldRepository;
  connectors: PreservationConnector[];
  notificationDispatcher?: LegalHoldNotificationDispatcher;
  chainOfCustody?: ChainOfCustodyAdapter;
  lifecyclePolicies?: LifecyclePolicyLink[];
  auditWriter?: (entry: AuditTrailEntry) => Promise<void>;
}
