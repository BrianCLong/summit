/**
 * @fileoverview Case Governance Domain Types
 *
 * Core domain model for Case Spaces management including:
 * - Case entities with sensitivity/jurisdiction classification
 * - Case membership with role-based access
 * - Case bindings to graph entities, evidence, tasks, and watchlists
 * - Authority/Warrant bindings for legal basis tracking
 *
 * Stack Detection Summary:
 * - TypeScript/Node.js backend
 * - Existing auth: AuthService with RBAC (ADMIN, ANALYST, VIEWER)
 * - Existing policy: PolicyEnforcer, PolicyService
 * - Existing audit: AuditAccessLogRepo with hash-chaining
 * - Existing cases: CaseRepo, CaseService (basic CRUD)
 * - This module mounted at: server/src/cases/domain
 *
 * @module cases/domain/CaseTypes
 */

// ============================================================================
// Core Enumerations
// ============================================================================

/**
 * Case lifecycle status
 */
export type CaseStatus = 'OPEN' | 'SUSPENDED' | 'CLOSED' | 'ARCHIVED';

/**
 * Case roles for membership-based access control
 * - ANALYST: Can view case, add entities/evidence, create tasks
 * - LEAD: Can manage case details, add/remove members, close case
 * - OMBUDSMAN: Oversight role - can view case and audit logs for compliance
 * - ADMIN: Full administrative access to case
 */
export type CaseRole = 'ANALYST' | 'LEAD' | 'OMBUDSMAN' | 'ADMIN';

/**
 * Data sensitivity classification levels
 * Used for ABAC clearance checks
 */
export type SensitivityLevel =
  | 'PUBLIC'
  | 'INTERNAL'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP_SECRET';

/**
 * Legal basis categories for data processing
 */
export type LegalBasis =
  | 'NATIONAL_SECURITY'
  | 'LAW_ENFORCEMENT'
  | 'AML'
  | 'CTF'
  | 'FRAUD_PREVENTION'
  | 'REGULATORY_COMPLIANCE'
  | 'COURT_ORDER'
  | 'CONSENT'
  | 'LEGITIMATE_INTEREST'
  | 'PUBLIC_INTEREST';

/**
 * Authority/warrant types for legal authorization
 */
export type AuthorityType =
  | 'WARRANT'
  | 'SUBPOENA'
  | 'COURT_ORDER'
  | 'LEGAL_OPINION'
  | 'POLICY_OVERRIDE'
  | 'CONSENT';

/**
 * Case audit action types
 */
export type CaseAuditAction =
  | 'CASE_CREATED'
  | 'CASE_VIEWED'
  | 'CASE_UPDATED'
  | 'CASE_STATUS_CHANGED'
  | 'CASE_CLOSED'
  | 'CASE_MEMBER_ADDED'
  | 'CASE_MEMBER_REMOVED'
  | 'CASE_MEMBER_ROLE_CHANGED'
  | 'CASE_ENTITY_LINKED'
  | 'CASE_ENTITY_UNLINKED'
  | 'CASE_EVIDENCE_LINKED'
  | 'CASE_EVIDENCE_UNLINKED'
  | 'CASE_TASK_CREATED'
  | 'CASE_TASK_UPDATED'
  | 'CASE_TASK_COMPLETED'
  | 'CASE_WATCHLIST_CREATED'
  | 'CASE_WATCHLIST_UPDATED'
  | 'CASE_AUTHORITY_BOUND'
  | 'CASE_AUTHORITY_UNBOUND'
  | 'CASE_AUDIT_ACCESSED'
  | 'CASE_EXPORTED';

/**
 * Case operations for policy evaluation
 */
export type CaseOperation =
  | 'CREATE_CASE'
  | 'VIEW_CASE'
  | 'UPDATE_CASE'
  | 'CLOSE_CASE'
  | 'ARCHIVE_CASE'
  | 'ADD_MEMBER'
  | 'REMOVE_MEMBER'
  | 'CHANGE_MEMBER_ROLE'
  | 'LINK_ENTITY'
  | 'UNLINK_ENTITY'
  | 'LINK_EVIDENCE'
  | 'UNLINK_EVIDENCE'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'CREATE_WATCHLIST'
  | 'UPDATE_WATCHLIST'
  | 'BIND_AUTHORITY'
  | 'VIEW_AUDIT_LOG'
  | 'VERIFY_AUDIT_INTEGRITY'
  | 'EXPORT_CASE';

// ============================================================================
// Core Domain Entities
// ============================================================================

/**
 * Case entity - Central object for grouping graph/data + access control
 */
export interface Case {
  /** Unique case identifier (UUID) */
  caseId: string;

  /** Tenant isolation identifier */
  tenantId: string;

  /** Human-readable case title */
  title: string;

  /** Optional case description */
  description?: string;

  /** Current case status */
  status: CaseStatus;

  /** Case owner user ID */
  ownerId: string;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** ISO 8601 last update timestamp */
  updatedAt: string;

  /** ISO 8601 closure timestamp (if closed) */
  closedAt?: string;

  /** User who closed the case */
  closedBy?: string;

  // === Classification & Access Control ===

  /** Data sensitivity level for ABAC clearance checks */
  sensitivity: SensitivityLevel;

  /** Applicable jurisdictions (e.g., ["US", "EU"]) */
  jurisdictions: string[];

  /** Legal basis for the case (e.g., ["NATIONAL_SECURITY", "AML"]) */
  legalBasis: LegalBasis[];

  /** Compartment/compartmentalization identifier */
  compartment?: string;

  /** Policy labels for fine-grained access control */
  policyLabels: string[];

  /** Searchable tags (e.g., ["CTI", "HVT", "FRAUD"]) */
  tags: string[];

  // === Authority Requirements ===

  /** Whether this case requires active authority for sensitive operations */
  requiresAuthority: boolean;

  /** Required authority types for evidence linking */
  requiredAuthorityTypes?: AuthorityType[];

  // === Metadata ===

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Case membership record - Links users to cases with specific roles
 */
export interface CaseMember {
  /** Unique membership identifier */
  membershipId: string;

  /** Case this membership belongs to */
  caseId: string;

  /** User ID of the member */
  userId: string;

  /** Role within the case */
  role: CaseRole;

  /** ISO 8601 timestamp when member was added */
  addedAt: string;

  /** User ID who added this member */
  addedBy: string;

  /** ISO 8601 timestamp when role was last changed */
  roleChangedAt?: string;

  /** User ID who changed the role */
  roleChangedBy?: string;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Case entity link - Connects graph entities to cases
 */
export interface CaseEntityLink {
  /** Unique link identifier */
  linkId: string;

  /** Case this entity is linked to */
  caseId: string;

  /** Graph entity/node identifier */
  entityId: string;

  /** Type of entity (e.g., "Person", "Organization") */
  entityType?: string;

  /** ISO 8601 timestamp when linked */
  linkedAt: string;

  /** User ID who created the link */
  linkedBy: string;

  /** Reason for linking this entity */
  linkReason?: string;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Case evidence link - Connects evidence/documents to cases
 */
export interface CaseEvidenceLink {
  /** Unique link identifier */
  linkId: string;

  /** Case this evidence is linked to */
  caseId: string;

  /** Evidence/document identifier */
  evidenceId: string;

  /** Evidence type (e.g., "document", "image", "recording") */
  evidenceType?: string;

  /** ISO 8601 timestamp when linked */
  linkedAt: string;

  /** User ID who created the link */
  linkedBy: string;

  /** Authority/warrant ID authorizing evidence access (if required) */
  authorityId?: string;

  /** Reason for linking this evidence */
  linkReason?: string;

  /** Chain of custody reference */
  custodyChainId?: string;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Case task - Work items associated with a case
 */
export interface CaseTask {
  /** Unique task identifier */
  taskId: string;

  /** Case this task belongs to */
  caseId: string;

  /** Task title */
  title: string;

  /** Task description */
  description?: string;

  /** Task status */
  status: 'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED';

  /** Priority level */
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  /** Assigned user ID */
  assigneeId?: string;

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** User ID who created the task */
  createdBy: string;

  /** ISO 8601 last update timestamp */
  updatedAt: string;

  /** ISO 8601 due date (optional) */
  dueAt?: string;

  /** ISO 8601 completion timestamp */
  completedAt?: string;

  /** User ID who completed the task */
  completedBy?: string;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Case watchlist - Monitored entities within a case
 */
export interface CaseWatchlist {
  /** Unique watchlist identifier */
  watchlistId: string;

  /** Case this watchlist belongs to */
  caseId: string;

  /** Watchlist name */
  name: string;

  /** Watchlist description */
  description?: string;

  /** Entity IDs being watched */
  entityIds: string[];

  /** Alert threshold configuration */
  alertThresholds?: {
    activityCount?: number;
    riskScore?: number;
    timeWindowHours?: number;
  };

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** User ID who created the watchlist */
  createdBy: string;

  /** ISO 8601 last update timestamp */
  updatedAt: string;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

/**
 * Authority/Warrant binding - Legal authorization for case operations
 */
export interface CaseAuthority {
  /** Unique authority identifier */
  authorityId: string;

  /** Authority type */
  type: AuthorityType;

  /** Authority reference number (e.g., warrant number) */
  referenceNumber: string;

  /** Issuing authority/court */
  issuedBy: string;

  /** Jurisdiction of authority */
  jurisdiction: string;

  /** ISO 8601 issue date */
  issuedAt: string;

  /** ISO 8601 expiry date (optional) */
  expiresAt?: string;

  /** Description of authority scope */
  scopeDescription: string;

  /** Scope constraints */
  scopeConstraints: {
    /** Allowed resource types */
    resourceTypes?: string[];
    /** Allowed operations */
    allowedOperations?: string[];
    /** Allowed purposes */
    purposes?: string[];
    /** Maximum sensitivity level */
    maxSensitivity?: SensitivityLevel;
  };

  /** Case this authority is bound to */
  caseId?: string;

  /** Status of the authority */
  status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'SUPERSEDED';

  /** ISO 8601 creation timestamp */
  createdAt: string;

  /** User ID who created the record */
  createdBy: string;

  /** Additional metadata */
  metadata: Record<string, unknown>;
}

// ============================================================================
// User Context & Policy
// ============================================================================

/**
 * User context for RBAC + ABAC policy decisions
 */
export interface UserContext {
  /** User identifier */
  userId: string;

  /** Tenant identifier */
  tenantId: string;

  /** Global system roles (e.g., ["ADMIN", "ANALYST"]) */
  roles: string[];

  /** User clearances for sensitivity levels (e.g., ["INTERNAL", "CONFIDENTIAL"]) */
  clearances: SensitivityLevel[];

  /** User jurisdictions where they can operate (e.g., ["US", "EU"]) */
  jurisdictions: string[];

  /** User purposes for data access (e.g., ["CTI_ANALYSIS", "AML_INVESTIGATION"]) */
  purposes: string[];

  /** Need-to-know tags for compartmentalized access */
  needToKnowTags: string[];

  /** Session context */
  session?: {
    sessionId: string;
    ipAddress?: string;
    userAgent?: string;
  };
}

/**
 * Input for case policy evaluation
 */
export interface CasePolicyInput {
  /** User context with attributes */
  user: UserContext;

  /** Case data (if operation involves a specific case) */
  caseData?: Case;

  /** User's membership record in the case (if applicable) */
  memberRecord?: CaseMember | null;

  /** Operation being performed */
  operation: CaseOperation;

  /** Additional context (e.g., target entity, evidence) */
  operationContext?: {
    targetUserId?: string;
    targetRole?: CaseRole;
    entityId?: string;
    evidenceId?: string;
    sensitivity?: SensitivityLevel;
    authorityId?: string;
  };
}

/**
 * Policy decision result
 */
export interface CasePolicyDecision {
  /** Whether the operation is allowed */
  allow: boolean;

  /** Human-readable reason for the decision */
  reason: string;

  /** Specific denial reasons for debugging/audit */
  denialReasons?: string[];

  /** Required clearances that were missing */
  requiredClearances?: SensitivityLevel[];

  /** Required roles that were missing */
  requiredRoles?: CaseRole[];

  /** Authority requirements (if applicable) */
  authorityRequired?: boolean;

  /** Audit this decision */
  auditRequired: boolean;
}

// ============================================================================
// Audit Records
// ============================================================================

/**
 * Immutable hash-chained audit record for case operations
 */
export interface CaseAuditRecord {
  /** Unique audit record identifier */
  auditId: string;

  /** Case this audit record belongs to */
  caseId: string;

  /** Tenant identifier */
  tenantId: string;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** User who performed the action */
  actorId: string;

  /** Action type */
  action: CaseAuditAction;

  /** Resource type affected */
  resourceType?: string;

  /** Resource identifier affected */
  resourceId?: string;

  /** Operation details (before/after state) */
  details?: {
    fieldChanged?: string;
    from?: unknown;
    to?: unknown;
    [key: string]: unknown;
  };

  /** Reason for access (required for view operations) */
  reasonForAccess?: string;

  /** Legal basis for the operation */
  legalBasis?: LegalBasis;

  /** Authority/warrant ID if applicable */
  authorityId?: string;

  /** Policy decision that authorized this action */
  policyDecision?: {
    allow: boolean;
    reason: string;
  };

  /** Session context */
  sessionContext?: {
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
    correlationId?: string;
  };

  /** Hash of previous record in chain (for this case) */
  prevHash?: string;

  /** SHA-256 hash of this record's content + prevHash */
  hash: string;
}

/**
 * Result of audit chain verification
 */
export interface AuditChainVerificationResult {
  /** Whether the chain is valid */
  ok: boolean;

  /** Total records checked */
  totalRecords: number;

  /** Valid records count */
  validRecords: number;

  /** Invalid records count */
  invalidRecords: number;

  /** ID of first broken record (if any) */
  brokenAt?: string;

  /** Details of integrity issues */
  issues?: Array<{
    auditId: string;
    issue: 'HASH_MISMATCH' | 'CHAIN_BROKEN' | 'MISSING_PREV_HASH';
    expected?: string;
    actual?: string;
  }>;
}

// ============================================================================
// Input Types for Service Operations
// ============================================================================

/**
 * Input for creating a new case
 */
export interface CreateCaseInput {
  title: string;
  description?: string;
  sensitivity?: SensitivityLevel;
  jurisdictions?: string[];
  legalBasis?: LegalBasis[];
  compartment?: string;
  policyLabels?: string[];
  tags?: string[];
  requiresAuthority?: boolean;
  requiredAuthorityTypes?: AuthorityType[];
  metadata?: Record<string, unknown>;
}

/**
 * Input for updating a case
 */
export interface UpdateCaseInput {
  title?: string;
  description?: string;
  sensitivity?: SensitivityLevel;
  jurisdictions?: string[];
  legalBasis?: LegalBasis[];
  compartment?: string;
  policyLabels?: string[];
  tags?: string[];
  requiresAuthority?: boolean;
  requiredAuthorityTypes?: AuthorityType[];
  metadata?: Record<string, unknown>;
}

/**
 * Input for adding a case member
 */
export interface AddCaseMemberInput {
  userId: string;
  role: CaseRole;
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a case task
 */
export interface CreateCaseTaskInput {
  title: string;
  description?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigneeId?: string;
  dueAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Input for creating a case watchlist
 */
export interface CreateCaseWatchlistInput {
  name: string;
  description?: string;
  entityIds?: string[];
  alertThresholds?: {
    activityCount?: number;
    riskScore?: number;
    timeWindowHours?: number;
  };
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Repository Interfaces
// ============================================================================

/**
 * Case repository interface
 */
export interface ICaseRepository {
  create(input: CreateCaseInput, ownerId: string, tenantId: string): Promise<Case>;
  update(caseId: string, input: UpdateCaseInput): Promise<Case | null>;
  getById(caseId: string, tenantId: string): Promise<Case | null>;
  listByUser(userId: string, tenantId: string): Promise<Case[]>;
  listByTenant(tenantId: string, filters?: CaseListFilters): Promise<Case[]>;
  changeStatus(caseId: string, status: CaseStatus, userId: string): Promise<Case | null>;
  delete(caseId: string): Promise<boolean>;
}

/**
 * Filters for listing cases
 */
export interface CaseListFilters {
  status?: CaseStatus | CaseStatus[];
  sensitivity?: SensitivityLevel | SensitivityLevel[];
  jurisdictions?: string[];
  legalBasis?: LegalBasis[];
  tags?: string[];
  policyLabels?: string[];
  compartment?: string;
  ownerId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Case member repository interface
 */
export interface ICaseMemberRepository {
  add(caseId: string, input: AddCaseMemberInput, addedBy: string): Promise<CaseMember>;
  remove(caseId: string, userId: string): Promise<boolean>;
  changeRole(caseId: string, userId: string, newRole: CaseRole, changedBy: string): Promise<CaseMember | null>;
  get(caseId: string, userId: string): Promise<CaseMember | null>;
  listByCase(caseId: string): Promise<CaseMember[]>;
  listByUser(userId: string, tenantId: string): Promise<CaseMember[]>;
}

/**
 * Case audit log repository interface
 */
export interface ICaseAuditLogRepository {
  append(record: Omit<CaseAuditRecord, 'auditId' | 'hash'>): Promise<CaseAuditRecord>;
  listByCase(caseId: string, limit?: number, offset?: number): Promise<CaseAuditRecord[]>;
  listByActor(actorId: string, tenantId: string, limit?: number, offset?: number): Promise<CaseAuditRecord[]>;
  getLastHash(caseId: string): Promise<string | undefined>;
  verifyChain(caseId: string): Promise<AuditChainVerificationResult>;
}

/**
 * Case authority repository interface
 */
export interface ICaseAuthorityRepository {
  create(authority: Omit<CaseAuthority, 'authorityId' | 'createdAt'>): Promise<CaseAuthority>;
  getById(authorityId: string): Promise<CaseAuthority | null>;
  bindToCase(authorityId: string, caseId: string): Promise<void>;
  unbindFromCase(authorityId: string, caseId: string): Promise<void>;
  getActiveForCase(caseId: string): Promise<CaseAuthority[]>;
  validateForOperation(
    authorityId: string,
    operation: CaseOperation,
    context: { resourceType?: string; sensitivity?: SensitivityLevel; purpose?: string }
  ): Promise<{ valid: boolean; reason?: string }>;
}

// ============================================================================
// Policy Engine Interface
// ============================================================================

/**
 * Case policy engine interface
 */
export interface ICasePolicyEngine {
  /**
   * Evaluate a case operation against RBAC + ABAC rules
   */
  evaluate(input: CasePolicyInput): Promise<CasePolicyDecision>;

  /**
   * Check if user has sufficient clearance for a sensitivity level
   */
  checkClearance(user: UserContext, requiredSensitivity: SensitivityLevel): boolean;

  /**
   * Check jurisdiction alignment
   */
  checkJurisdiction(userJurisdictions: string[], resourceJurisdictions: string[]): boolean;
}
