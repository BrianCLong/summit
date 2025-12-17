/**
 * DLP Type Definitions
 * @package dlp-core
 */

// =============================================================================
// DATA CLASSIFICATION
// =============================================================================

export type DataClassification =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'RESTRICTED'
  | 'TOP_SECRET';

export type DataCategory =
  | 'PII'
  | 'PCI'
  | 'PHI'
  | 'TRADE_SECRET'
  | 'FINANCIAL'
  | 'REGULATED'
  | 'INTERNAL';

export interface ClassificationLabel {
  level: DataClassification;
  categories: DataCategory[];
  handling: {
    encryption: 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
    retentionDays: number;
    deletionPolicy: 'SOFT' | 'HARD' | 'CRYPTO_SHRED';
  };
  jurisdictions: string[];
  compliance: string[];
}

// =============================================================================
// DETECTION
// =============================================================================

export type DetectedDataType =
  | 'SSN'
  | 'CREDIT_CARD'
  | 'BANK_ACCOUNT'
  | 'EMAIL'
  | 'PHONE'
  | 'DATE_OF_BIRTH'
  | 'ADDRESS'
  | 'IP_ADDRESS'
  | 'PASSPORT'
  | 'DRIVER_LICENSE'
  | 'API_KEY'
  | 'PASSWORD'
  | 'PHI'
  | 'BIOMETRIC'
  | 'FINANCIAL_DATA'
  | 'TRADE_SECRET'
  | 'CUSTOM';

export interface PatternConfig {
  name: string;
  type: DetectedDataType;
  regex: string;
  confidence: number;
  validation?: string;
  contextBoost?: string[];
  falsePositiveFilters?: string[];
}

export interface DetectedPattern {
  type: DetectedDataType;
  pattern: string;
  confidence: number;
  location: {
    start: number;
    end: number;
    line?: number;
    column?: number;
  };
  context?: string;
  matchedValue: string;
  redactedValue?: string;
}

export interface DetectionContext {
  contentType: string;
  filename?: string;
  purpose?: string;
  actor?: ActorContext;
}

export interface DetectionResult {
  hasDetections: boolean;
  detections: DetectedPattern[];
  riskScore: number;
  classification: DataClassification;
  categories: DataCategory[];
  processingTime: number;
}

// =============================================================================
// CONTENT SCANNING
// =============================================================================

export interface ContentScanRequest {
  content: string | Buffer;
  contentType: string;
  metadata?: Record<string, unknown>;
  context: DetectionContext;
  options?: ScanOptions;
}

export interface ScanOptions {
  deepScan?: boolean;
  mlClassification?: boolean;
  fingerprinting?: boolean;
  maxDetections?: number;
  timeout?: number;
}

export type ScanAction =
  | 'ALLOW'
  | 'BLOCK'
  | 'REDACT'
  | 'WARN'
  | 'REQUIRE_JUSTIFICATION'
  | 'REQUIRE_APPROVAL'
  | 'QUARANTINE';

export interface ContentScanResult {
  allowed: boolean;
  action: ScanAction;
  detection: DetectionResult;
  violations: PolicyViolation[];
  obligations: Obligation[];
  auditEventId: string;
  processingTime: number;
}

export interface PolicyViolation {
  type: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'HIGH' | 'CRITICAL';
  policyId?: string;
  ruleId?: string;
  remediation?: string;
}

export interface Obligation {
  type: string;
  config?: Record<string, unknown>;
  message?: string;
  timeout?: number;
}

// =============================================================================
// BARRIERS
// =============================================================================

export type BarrierType =
  | 'TENANT_ISOLATION'
  | 'BUSINESS_UNIT'
  | 'ROLE_BASED'
  | 'ENVIRONMENT'
  | 'JURISDICTION';

export interface BarrierContext {
  tenantId: string;
  businessUnit?: string;
  environment: string;
  jurisdiction?: string;
}

export interface ActorContext {
  id: string;
  tenantId: string;
  businessUnit?: string;
  roles: string[];
  clearance?: string;
  stepUpVerified?: boolean;
  stepUpLevel?: number;
  stepUpTimestamp?: number;
}

export interface ResourceContext {
  id: string;
  type: string;
  classification: DataClassification;
  categories?: DataCategory[];
  containsPii?: boolean;
  anonymized?: boolean;
}

export interface BarrierCheckRequest {
  source: BarrierContext;
  target: BarrierContext;
  actor: ActorContext;
  resource: ResourceContext;
  operation: string;
  transfer?: {
    sccInPlace?: boolean;
    bcrApproved?: boolean;
  };
}

export interface BarrierViolation {
  type: BarrierType;
  message: string;
  severity: 'HIGH' | 'CRITICAL';
  sourceContext?: Record<string, string>;
  targetContext?: Record<string, string>;
  remediation?: string;
}

export interface BarrierCheckResult {
  allowed: boolean;
  barrierViolation: boolean;
  violations: BarrierViolation[];
  barriersChecked: BarrierType[];
  auditEventId: string;
}

// =============================================================================
// REDACTION
// =============================================================================

export type RedactionStrategy =
  | 'FULL_MASK'
  | 'PARTIAL_MASK'
  | 'GENERALIZE'
  | 'TOKENIZE'
  | 'ENCRYPT'
  | 'REMOVE';

export interface RedactionConfig {
  strategy: RedactionStrategy;
  maskChar?: string;
  preserveFormat?: boolean;
  preserveLast?: number;
  preserveFirst?: number;
  preserveDomain?: boolean;
  preserveAreaCode?: boolean;
  deterministicMask?: boolean;
  tokenPrefix?: string;
}

export interface RedactionRequest {
  content: string;
  detections: DetectedPattern[];
  configs?: Record<DetectedDataType, RedactionConfig>;
  options?: {
    preserveStructure?: boolean;
    maintainLength?: boolean;
  };
}

export interface RedactionResult {
  redactedContent: string;
  redactedFields: Array<{
    type: DetectedDataType;
    originalLocation: { start: number; end: number };
    strategy: RedactionStrategy;
  }>;
  tokenMap?: Map<string, string>; // For reversible tokenization
}

// =============================================================================
// POLICY
// =============================================================================

export interface DLPPolicy {
  id: string;
  name: string;
  version: string;
  enabled: boolean;
  priority: number;
  scope: {
    tenants?: string[];
    businessUnits?: string[];
    dataTypes?: DetectedDataType[];
    operations?: string[];
  };
  rules: DLPRule[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface DLPRule {
  id: string;
  name: string;
  description?: string;
  condition: RuleCondition;
  action: ScanAction;
  obligations?: Obligation[];
  enabled: boolean;
}

export interface RuleCondition {
  dataTypes?: DetectedDataType[];
  classifications?: DataClassification[];
  operations?: string[];
  destinations?: {
    include?: string[];
    exclude?: string[];
  };
  volume?: {
    maxRecords?: number;
    maxPiiRecords?: number;
  };
  temporal?: {
    businessHoursOnly?: boolean;
    timezone?: string;
  };
  custom?: string; // OPA policy reference
}

// =============================================================================
// EXCEPTIONS
// =============================================================================

export interface DLPException {
  id: string;
  name: string;
  scope: {
    rules: string[];
    dataTypes?: DetectedDataType[];
    resources?: Array<{ type: string; pattern: string }>;
  };
  justification: {
    purpose: string;
    description: string;
    businessImpact?: string;
  };
  approval: {
    requestedBy: string;
    requestedAt: string;
    approvals: ExceptionApproval[];
  };
  constraints: {
    validFrom: string;
    validUntil: string;
    maxUsageCount?: number;
    allowedActors?: string[];
    allowedDestinations?: string[];
    additionalControls?: string[];
  };
  status: 'PENDING' | 'APPROVED' | 'DENIED' | 'EXPIRED' | 'REVOKED';
  usageCount: number;
}

export interface ExceptionRequest {
  scope: DLPException['scope'];
  justification: DLPException['justification'];
  requestedBy: string;
  requestedDuration: {
    from: string;
    until: string;
  };
  constraints?: Partial<DLPException['constraints']>;
}

export interface ExceptionApproval {
  role: 'DATA_OWNER' | 'MANAGER' | 'COMPLIANCE' | 'SECURITY' | 'LEGAL';
  approver: string;
  approvedAt?: string;
  deniedAt?: string;
  reason?: string;
}

// =============================================================================
// AUDIT
// =============================================================================

export type DLPEventType =
  | 'INGESTION_SCAN'
  | 'EGRESS_SCAN'
  | 'TRANSFER_SCAN'
  | 'BARRIER_CHECK'
  | 'EXCEPTION_USED'
  | 'POLICY_VIOLATION'
  | 'REDACTION_APPLIED'
  | 'ADMIN_OVERRIDE';

export interface DLPAuditEvent {
  eventId: string;
  timestamp: string;
  eventType: DLPEventType;
  actor: {
    userId: string;
    tenantId: string;
    businessUnit?: string;
    roles: string[];
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
  content: {
    resourceType: string;
    resourceId: string;
    contentHash: string;
    size?: number;
    classification: DataClassification;
  };
  detection?: {
    patternsMatched: Array<{
      pattern: string;
      confidence: number;
      location?: string;
      redacted: boolean;
    }>;
    riskScore: number;
  };
  policy: {
    policyId?: string;
    policyVersion?: string;
    rules: Array<{
      ruleId: string;
      matched: boolean;
      action?: ScanAction;
    }>;
    finalDecision: ScanAction;
    exceptionApplied?: string;
  };
  outcome: {
    action: ScanAction;
    userResponse?: string;
    justification?: string;
    destination?: {
      type: string;
      target: string;
      risk?: string;
    };
  };
  auditChain: {
    previousHash: string;
    currentHash: string;
  };
}

// =============================================================================
// SERVICE INTERFACES
// =============================================================================

export interface DLPServiceConfig {
  opaEndpoint: string;
  cacheEnabled?: boolean;
  cacheTtl?: number;
  asyncThreshold?: number;
  samplingRate?: number;
  auditEnabled?: boolean;
}

export interface DLPService {
  // Content scanning
  scan(request: ContentScanRequest): Promise<ContentScanResult>;

  // Barrier checking
  checkBarrier(request: BarrierCheckRequest): Promise<BarrierCheckResult>;

  // Redaction
  redact(request: RedactionRequest): Promise<RedactionResult>;

  // Policy management
  policies: {
    list(filter?: { tenantId?: string; enabled?: boolean }): Promise<DLPPolicy[]>;
    get(id: string): Promise<DLPPolicy | null>;
    create(policy: Omit<DLPPolicy, 'id' | 'createdAt' | 'updatedAt'>): Promise<DLPPolicy>;
    update(id: string, policy: Partial<DLPPolicy>): Promise<DLPPolicy>;
    delete(id: string): Promise<void>;
    test(
      id: string,
      testCases: Array<{ input: ContentScanRequest; expected: Partial<ContentScanResult> }>
    ): Promise<{ passed: boolean; results: Array<{ passed: boolean; details: string }> }>;
  };

  // Exception management
  exceptions: {
    request(exception: ExceptionRequest): Promise<{ ticketId: string; status: string }>;
    approve(id: string, approval: ExceptionApproval): Promise<DLPException>;
    deny(id: string, reason: string): Promise<DLPException>;
    revoke(id: string, reason: string): Promise<void>;
    list(filter?: { status?: string; requestedBy?: string }): Promise<DLPException[]>;
  };

  // Audit
  audit: {
    query(filter: {
      eventType?: DLPEventType;
      actorId?: string;
      resourceId?: string;
      from?: string;
      to?: string;
      limit?: number;
      offset?: number;
    }): Promise<DLPAuditEvent[]>;
    export(
      filter: Parameters<DLPService['audit']['query']>[0],
      format: 'JSON' | 'CSV' | 'PDF'
    ): Promise<Buffer>;
  };
}
