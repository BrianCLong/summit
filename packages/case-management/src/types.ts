/**
 * Case Management Type Definitions
 */

export interface Investigation {
  id: string;
  caseNumber: string;
  title: string;
  description: string;
  classification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  status: 'draft' | 'active' | 'suspended' | 'closed' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';

  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;

  // Team
  leadInvestigator: string;
  analysts: string[];
  reviewers: string[];

  // Scope
  entities: string[]; // Entity IDs
  relationships: string[]; // Relationship IDs
  events: InvestigationEvent[];

  // Evidence
  evidence: Evidence[];

  // Analysis
  findings: Finding[];
  hypotheses: Hypothesis[];

  // Workflow
  workflow?: WorkflowInstance;

  // Reporting
  reports: Report[];

  // Audit
  auditLog: AuditEntry[];

  // Collaboration
  tags: string[];
  notes: Note[];

  // Metadata
  metadata?: Record<string, any>;
}

export interface InvestigationEvent {
  id: string;
  type: 'created' | 'updated' | 'status_changed' | 'evidence_added' | 'finding_added' | 'escalated';
  timestamp: Date;
  userId: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface Evidence {
  id: string;
  investigationId: string;
  type: 'document' | 'image' | 'video' | 'audio' | 'log' | 'network_capture' | 'artifact' | 'other';
  name: string;
  description?: string;

  // Storage
  fileUrl?: string;
  fileSize?: number;
  mimeType?: string;

  // Forensics
  hash?: {
    md5?: string;
    sha1?: string;
    sha256?: string;
  };

  // Chain of Custody
  chainOfCustody: ChainOfCustodyEntry[];

  // Classification
  classification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
  tags: string[];

  // Provenance
  source: string;
  collectedAt: Date;
  collectedBy: string;

  // Analysis
  analyzed: boolean;
  analysisResults?: any;

  // Metadata
  metadata?: Record<string, any>;
}

export interface ChainOfCustodyEntry {
  id: string;
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'stored' | 'accessed' | 'modified' | 'deleted';
  userId: string;
  userName: string;
  location?: string;
  notes?: string;
  signature?: string; // Cryptographic signature
}

export interface Finding {
  id: string;
  investigationId: string;
  title: string;
  description: string;
  type: 'observation' | 'correlation' | 'attribution' | 'tactic' | 'technique' | 'indicator';

  // Confidence
  confidence: 'low' | 'medium' | 'high' | 'confirmed';

  // Supporting evidence
  evidenceIds: string[];
  entityIds: string[];

  // Classification
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';

  // Attribution
  attributedTo?: string[];

  // Timeline
  discoveredAt: Date;
  discoveredBy: string;

  // Review
  reviewStatus: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewedAt?: Date;
  reviewNotes?: string;

  // Metadata
  tags: string[];
  metadata?: Record<string, any>;
}

export interface Hypothesis {
  id: string;
  investigationId: string;
  statement: string;
  description: string;

  // Evidence
  supportingEvidence: string[]; // Evidence IDs
  contradictingEvidence: string[]; // Evidence IDs

  // Analysis
  confidence: number; // 0-1
  status: 'proposed' | 'testing' | 'confirmed' | 'refuted';

  // Collaboration
  proposedBy: string;
  proposedAt: Date;

  // Review
  reviewedBy?: string[];

  // Metadata
  metadata?: Record<string, any>;
}

export interface WorkflowInstance {
  id: string;
  investigationId: string;
  workflowType: string; // e.g., 'standard-investigation', 'threat-hunt', 'incident-response'

  // State
  currentStage: string;
  stages: WorkflowStage[];

  // Timing
  startedAt: Date;
  expectedCompletionAt?: Date;
  completedAt?: Date;

  // Status
  status: 'active' | 'paused' | 'completed' | 'cancelled';

  // Metadata
  metadata?: Record<string, any>;
}

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';

  // Tasks
  tasks: WorkflowTask[];

  // Requirements
  requiredApprovals?: string[]; // User IDs or roles

  // Timing
  startedAt?: Date;
  completedAt?: Date;
  dueDate?: Date;

  // Metadata
  metadata?: Record<string, any>;
}

export interface WorkflowTask {
  id: string;
  title: string;
  description?: string;
  type: 'manual' | 'automated' | 'review' | 'approval';

  // Assignment
  assignedTo?: string;
  assignedAt?: Date;

  // Status
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';

  // Completion
  completedAt?: Date;
  completedBy?: string;
  result?: any;

  // Metadata
  metadata?: Record<string, any>;
}

export interface Report {
  id: string;
  investigationId: string;
  type: 'preliminary' | 'progress' | 'final' | 'executive' | 'technical';
  title: string;

  // Content
  content: string; // Markdown or HTML
  sections: ReportSection[];

  // Generation
  generatedAt: Date;
  generatedBy: string;

  // Review
  reviewStatus: 'draft' | 'review' | 'approved' | 'published';
  reviewedBy?: string[];

  // Distribution
  distributionList: string[];
  classification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';

  // Export
  exports: ReportExport[];

  // Metadata
  version: number;
  metadata?: Record<string, any>;
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  order: number;
  type: 'executive_summary' | 'findings' | 'analysis' | 'recommendations' | 'timeline' | 'appendix' | 'custom';
}

export interface ReportExport {
  id: string;
  format: 'pdf' | 'docx' | 'pptx' | 'html' | 'markdown';
  url: string;
  generatedAt: Date;
  fileSize: number;
}

export interface AuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resourceType: 'investigation' | 'evidence' | 'finding' | 'report' | 'workflow';
  resourceId: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

export interface Note {
  id: string;
  investigationId: string;
  content: string;
  type: 'general' | 'analysis' | 'todo' | 'question' | 'answer';

  // Author
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;

  // Thread
  parentNoteId?: string;
  replies: Note[];

  // Visibility
  isPrivate: boolean;
  sharedWith?: string[];

  // Metadata
  tags: string[];
  attachments?: string[];
  metadata?: Record<string, any>;
}

export interface CaseManagementPermissions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canAssign: boolean;
  canApprove: boolean;
  canExport: boolean;
  canViewAudit: boolean;
  maxClassification: 'UNCLASSIFIED' | 'CONFIDENTIAL' | 'SECRET' | 'TOP_SECRET';
}

export interface CaseFilter {
  status?: Investigation['status'][];
  priority?: Investigation['priority'][];
  classification?: Investigation['classification'][];
  assignedTo?: string[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  searchQuery?: string;
}

export interface CaseMetrics {
  total: number;
  active: number;
  closed: number;
  criticalPriority: number;
  averageResolutionTime: number; // milliseconds
  byStatus: Record<Investigation['status'], number>;
  byPriority: Record<Investigation['priority'], number>;
  byClassification: Record<Investigation['classification'], number>;
}
