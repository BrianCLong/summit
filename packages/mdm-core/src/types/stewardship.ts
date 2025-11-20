/**
 * Data Stewardship Workflow Types
 */

export interface StewardshipWorkflow {
  id: string;
  name: string;
  description: string;
  workflowType: WorkflowType;
  domain: string;
  stages: WorkflowStage[];
  currentStage: string;
  status: WorkflowStatus;
  priority: Priority;
  assignedTo: string;
  createdBy: string;
  createdAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  metadata: WorkflowMetadata;
}

export type WorkflowType =
  | 'data_certification'
  | 'issue_resolution'
  | 'change_request'
  | 'quality_review'
  | 'merge_approval'
  | 'split_approval'
  | 'enrichment_approval'
  | 'custom';

export type WorkflowStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'approved'
  | 'rejected'
  | 'on_hold'
  | 'cancelled'
  | 'completed';

export type Priority = 'critical' | 'high' | 'medium' | 'low';

export interface WorkflowStage {
  id: string;
  name: string;
  stageType: StageType;
  order: number;
  assignedRoles: string[];
  assignedUsers: string[];
  requiredApprovals: number;
  actualApprovals: number;
  status: StageStatus;
  dueDate?: Date;
  completedAt?: Date;
  actions: StageAction[];
  conditions: StageCondition[];
}

export type StageType =
  | 'review'
  | 'approval'
  | 'validation'
  | 'enrichment'
  | 'notification'
  | 'escalation'
  | 'custom';

export type StageStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'skipped'
  | 'failed';

export interface StageAction {
  id: string;
  actionType: ActionType;
  performedBy: string;
  performedAt: Date;
  decision?: Decision;
  comments?: string;
  attachments?: Attachment[];
}

export type ActionType =
  | 'approve'
  | 'reject'
  | 'request_changes'
  | 'delegate'
  | 'escalate'
  | 'comment'
  | 'custom';

export type Decision = 'approved' | 'rejected' | 'changes_requested' | 'deferred';

export interface Attachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date;
  url: string;
}

export interface StageCondition {
  id: string;
  conditionType: 'quality_threshold' | 'approval_count' | 'time_based' | 'custom';
  expression: string;
  required: boolean;
}

export interface WorkflowMetadata {
  recordId?: string;
  issueId?: string;
  changeRequestId?: string;
  relatedWorkflows: string[];
  tags: string[];
  customFields: Record<string, unknown>;
}

export interface ChangeRequest {
  id: string;
  domain: string;
  recordId: string;
  changeType: ChangeType;
  requestedBy: string;
  requestedAt: Date;
  status: ChangeRequestStatus;
  priority: Priority;
  changes: ProposedChange[];
  justification: string;
  impact: ImpactAssessment;
  approvals: Approval[];
  workflowId: string;
}

export type ChangeType =
  | 'create'
  | 'update'
  | 'delete'
  | 'merge'
  | 'split'
  | 'link'
  | 'unlink'
  | 'certify'
  | 'deprecate';

export type ChangeRequestStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'implemented'
  | 'cancelled';

export interface ProposedChange {
  fieldName: string;
  currentValue: unknown;
  proposedValue: unknown;
  reason: string;
  source?: string;
  confidence?: number;
}

export interface ImpactAssessment {
  affectedRecords: number;
  affectedDomains: string[];
  qualityImpact: QualityImpact;
  downstreamImpact: DownstreamImpact[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  mitigationSteps: string[];
}

export interface QualityImpact {
  currentScore: number;
  projectedScore: number;
  affectedDimensions: string[];
}

export interface DownstreamImpact {
  system: string;
  impactType: 'data' | 'process' | 'integration';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface Approval {
  approverId: string;
  approverName: string;
  approverRole: string;
  decision: Decision;
  timestamp: Date;
  comments?: string;
  conditions?: string[];
}

export interface DataCertification {
  id: string;
  recordId: string;
  domain: string;
  certificationLevel: CertificationLevel;
  certifiedBy: string;
  certifiedAt: Date;
  validUntil?: Date;
  criteria: CertificationCriteria[];
  qualityScore: number;
  notes?: string;
  revoked: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}

export type CertificationLevel =
  | 'bronze'
  | 'silver'
  | 'gold'
  | 'platinum';

export interface CertificationCriteria {
  criteriaId: string;
  name: string;
  required: boolean;
  met: boolean;
  value?: unknown;
  threshold?: unknown;
}

export interface EscalationRule {
  id: string;
  workflowType: WorkflowType;
  conditions: EscalationCondition[];
  escalateTo: string[];
  notificationTemplate: string;
  active: boolean;
}

export interface EscalationCondition {
  type: 'time_based' | 'stage_based' | 'priority_based' | 'custom';
  value: unknown;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
}

export interface PerformanceMetrics {
  stewardId: string;
  period: string;
  workflowsCompleted: number;
  averageCompletionTime: number;
  issuesResolved: number;
  certificationsIssued: number;
  qualityImprovement: number;
  slaCompliance: number;
}
