/**
 * Business Glossary Types
 * Types for managing business terminology and data dictionaries
 */

/**
 * Glossary Term
 */
export interface GlossaryTerm {
  id: string;
  name: string;
  displayName: string;
  definition: string;
  longDescription: string | null;

  // Taxonomy
  categoryId: string | null;
  parentTermId: string | null;
  childTermIds: string[];

  // Relationships
  synonyms: string[];
  relatedTerms: string[];
  acronyms: string[];
  abbreviations: string[];

  // Metadata
  owner: string;
  stewards: string[];
  domain: string | null;
  tags: string[];

  // Business Context
  businessRules: BusinessRule[];
  examples: string[];
  usageNotes: string | null;

  // Status
  status: TermStatus;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: Date | null;

  // Versioning
  version: number;
  versionHistory: TermVersion[];

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;

  // Linked Assets
  linkedAssets: string[];
}

/**
 * Term Status
 */
export enum TermStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Approval Status
 */
export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED',
}

/**
 * Business Rule
 */
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  expression: string | null;
  type: BusinessRuleType;
  severity: RuleSeverity;
  validatedBy: string[];
}

/**
 * Business Rule Type
 */
export enum BusinessRuleType {
  VALIDATION = 'VALIDATION',
  CALCULATION = 'CALCULATION',
  CONSTRAINT = 'CONSTRAINT',
  POLICY = 'POLICY',
}

/**
 * Rule Severity
 */
export enum RuleSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Term Version
 */
export interface TermVersion {
  version: number;
  definition: string;
  changedBy: string;
  changedAt: Date;
  changeNotes: string;
}

/**
 * Glossary Category
 */
export interface GlossaryCategory {
  id: string;
  name: string;
  description: string;
  parentCategoryId: string | null;
  childCategoryIds: string[];
  termCount: number;
  icon: string | null;
  color: string | null;
  order: number;
}

/**
 * Term Link
 */
export interface TermLink {
  termId: string;
  assetId: string;
  linkedBy: string;
  linkedAt: Date;
  confidence: number;
  isAutoLinked: boolean;
}

/**
 * Approval Workflow
 */
export interface ApprovalWorkflow {
  id: string;
  termId: string;
  requestedBy: string;
  requestedAt: Date;
  approvers: string[];
  currentApprover: string | null;
  status: ApprovalStatus;
  comments: ApprovalComment[];
  completedAt: Date | null;
}

/**
 * Approval Comment
 */
export interface ApprovalComment {
  id: string;
  author: string;
  comment: string;
  action: ApprovalAction;
  createdAt: Date;
}

/**
 * Approval Action
 */
export enum ApprovalAction {
  COMMENT = 'COMMENT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  REQUEST_CHANGES = 'REQUEST_CHANGES',
}
