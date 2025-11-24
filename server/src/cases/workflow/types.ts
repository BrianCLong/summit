/**
 * Case Workflow Engine - Type Definitions
 * Complete type definitions for case workflow, tasks, SLAs, and approvals
 */

// ==================== CASE ENUMS ====================

export type CasePriority = 'low' | 'medium' | 'high' | 'critical';

export type CaseStatus = 'open' | 'active' | 'closed' | 'archived';

// ==================== TASK ENUMS ====================

export type TaskType =
  | 'standard'
  | 'approval'
  | 'review'
  | 'data_collection'
  | 'analysis';

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'cancelled';

// ==================== SLA ENUMS ====================

export type SLAType =
  | 'case_completion'
  | 'stage_completion'
  | 'task_completion'
  | 'first_response';

export type SLAStatus = 'active' | 'met' | 'breached' | 'at_risk' | 'cancelled';

// ==================== APPROVAL ENUMS ====================

export type ApprovalType = '4-eyes' | 'n-eyes' | 'role-based' | 'authority-based';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type ApprovalDecision = 'approve' | 'reject' | 'abstain';

// ==================== ROLE ====================

export interface CaseRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseRoleInput {
  name: string;
  description?: string;
  permissions: string[];
  isSystemRole?: boolean;
}

// ==================== PARTICIPANT ====================

export interface CaseParticipant {
  id: string;
  caseId: string;
  userId: string;
  roleId: string;
  assignedAt: Date;
  assignedBy?: string;
  removedAt?: Date;
  removedBy?: string;
  isActive: boolean;
  metadata: Record<string, any>;
  // Joined fields (not in DB)
  role?: CaseRole;
}

export interface CaseParticipantInput {
  caseId: string;
  userId: string;
  roleId: string;
  assignedBy?: string;
  metadata?: Record<string, any>;
}

// ==================== STAGE ====================

export interface CaseStage {
  id: string;
  caseType: string;
  name: string;
  description?: string;
  orderIndex: number;
  isInitial: boolean;
  isTerminal: boolean;
  requiredRoleId?: string;
  slaHours?: number;
  allowedTransitions: string[];
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface CaseStageInput {
  caseType: string;
  name: string;
  description?: string;
  orderIndex: number;
  isInitial?: boolean;
  isTerminal?: boolean;
  requiredRoleId?: string;
  slaHours?: number;
  allowedTransitions?: string[];
  metadata?: Record<string, any>;
}

// ==================== STATE HISTORY ====================

export interface CaseStateHistory {
  id: string;
  caseId: string;
  fromStage?: string;
  toStage: string;
  fromStatus?: CaseStatus;
  toStatus: CaseStatus;
  transitionedBy: string;
  transitionedAt: Date;
  reason: string;
  legalBasis?: string;
  metadata: Record<string, any>;
}

export interface CaseStateHistoryInput {
  caseId: string;
  fromStage?: string;
  toStage: string;
  fromStatus?: CaseStatus;
  toStatus: CaseStatus;
  transitionedBy: string;
  reason: string;
  legalBasis?: string;
  metadata?: Record<string, any>;
}

// ==================== TASK ====================

export interface CaseTask {
  id: string;
  caseId: string;
  title: string;
  description?: string;
  taskType: TaskType;
  status: TaskStatus;
  priority: CasePriority;
  assignedTo?: string;
  assignedBy?: string;
  assignedAt?: Date;
  dueDate?: Date;
  completedAt?: Date;
  completedBy?: string;
  requiredRoleId?: string;
  dependsOnTaskIds: string[];
  resultData: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  // Joined fields (not in DB)
  requiredRole?: CaseRole;
  case?: any; // Avoid circular dependency, use minimal Case type if needed
}

export interface CaseTaskInput {
  caseId: string;
  title: string;
  description?: string;
  taskType?: TaskType;
  priority?: CasePriority;
  assignedTo?: string;
  assignedBy?: string;
  dueDate?: Date;
  requiredRoleId?: string;
  dependsOnTaskIds?: string[];
  metadata?: Record<string, any>;
  createdBy: string;
}

export interface CaseTaskUpdateInput {
  id: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: CasePriority;
  assignedTo?: string;
  assignedBy?: string;
  dueDate?: Date;
  dependsOnTaskIds?: string[];
  resultData?: Record<string, any>;
  metadata?: Record<string, any>;
}

// ==================== SLA ====================

export interface CaseSLA {
  id: string;
  caseId: string;
  slaType: SLAType;
  targetEntityId?: string;
  targetHours: number;
  dueAt: Date;
  status: SLAStatus;
  breachedAt?: Date;
  completedAt?: Date;
  atRiskThresholdHours: number;
  escalationSent: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CaseSLAInput {
  caseId: string;
  slaType: SLAType;
  targetEntityId?: string;
  targetHours: number;
  atRiskThresholdHours?: number;
  metadata?: Record<string, any>;
}

// ==================== APPROVAL ====================

export interface CaseApproval {
  id: string;
  caseId: string;
  taskId?: string;
  approvalType: ApprovalType;
  requiredApprovers: number;
  requiredRoleId?: string;
  status: ApprovalStatus;
  requestedBy: string;
  requestedAt: Date;
  completedAt?: Date;
  reason: string;
  decisionReason?: string;
  metadata: Record<string, any>;
  // Joined fields (not in DB)
  votes?: CaseApprovalVote[];
  requiredRole?: CaseRole;
}

export interface CaseApprovalInput {
  caseId: string;
  taskId?: string;
  approvalType: ApprovalType;
  requiredApprovers?: number;
  requiredRoleId?: string;
  requestedBy: string;
  reason: string;
  metadata?: Record<string, any>;
}

export interface CaseApprovalVote {
  id: string;
  approvalId: string;
  approverUserId: string;
  decision: ApprovalDecision;
  reason?: string;
  votedAt: Date;
  metadata: Record<string, any>;
}

export interface CaseApprovalVoteInput {
  approvalId: string;
  approverUserId: string;
  decision: ApprovalDecision;
  reason?: string;
  metadata?: Record<string, any>;
}

// ==================== GRAPH REFERENCE ====================

export interface CaseGraphReference {
  id: string;
  caseId: string;
  graphEntityId: string;
  entityType?: string;
  entityLabel?: string;
  relationshipType?: string;
  addedBy: string;
  addedAt: Date;
  removedAt?: Date;
  removedBy?: string;
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface CaseGraphReferenceInput {
  caseId: string;
  graphEntityId: string;
  entityType?: string;
  entityLabel?: string;
  relationshipType?: string;
  addedBy: string;
  metadata?: Record<string, any>;
}

// ==================== WORKFLOW TRANSITION ====================

export interface WorkflowTransitionGuard {
  type: 'role' | 'authority' | 'data' | 'approval';
  config: Record<string, any>;
}

export interface WorkflowTransition {
  fromStage: string;
  toStage: string;
  guards?: WorkflowTransitionGuard[];
}

export interface WorkflowTransitionRequest {
  caseId: string;
  toStage: string;
  userId: string;
  reason: string;
  legalBasis?: string;
  metadata?: Record<string, any>;
}

export interface WorkflowTransitionResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
  newStage?: string;
  newStatus?: CaseStatus;
}

// ==================== CASE WITH WORKFLOW ====================

export interface CaseWithWorkflow {
  // Base case fields
  id: string;
  tenantId: string;
  title: string;
  description?: string;
  status: CaseStatus;
  compartment?: string;
  policyLabels: string[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  closedAt?: Date;
  closedBy?: string;

  // Workflow fields
  priority: CasePriority;
  currentStage?: string;
  jurisdiction?: string;
  authorityReference?: string;
  warrantId?: string;
  caseType: string;
  dueDate?: Date;
  tags: string[];

  // Joined/computed fields
  participants?: CaseParticipant[];
  tasks?: CaseTask[];
  slas?: CaseSLA[];
  approvals?: CaseApproval[];
  graphReferences?: CaseGraphReference[];
  stageHistory?: CaseStateHistory[];
  currentStageInfo?: CaseStage;
}

// ==================== QUERIES & FILTERS ====================

export interface CaseListFilters {
  tenantId: string;
  status?: CaseStatus | CaseStatus[];
  priority?: CasePriority | CasePriority[];
  caseType?: string;
  currentStage?: string;
  assignedTo?: string; // Filter by participant user ID
  roleId?: string; // Filter by participant role
  hasSLABreach?: boolean;
  hasPendingApproval?: boolean;
  tags?: string[];
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'dueDate';
  sortOrder?: 'asc' | 'desc';
}

export interface TaskListFilters {
  caseId?: string;
  assignedTo?: string;
  status?: TaskStatus | TaskStatus[];
  taskType?: TaskType;
  priority?: CasePriority;
  isOverdue?: boolean;
  requiredRoleId?: string;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'dueDate' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface ApprovalListFilters {
  caseId?: string;
  userId?: string; // Pending approvals for this user
  status?: ApprovalStatus;
  approvalType?: ApprovalType;
  limit?: number;
  offset?: number;
}

// ==================== EVENTS ====================

export type CaseEventType =
  | 'case.created'
  | 'case.updated'
  | 'case.closed'
  | 'case.stage_changed'
  | 'case.participant_added'
  | 'case.participant_removed'
  | 'task.created'
  | 'task.assigned'
  | 'task.completed'
  | 'task.overdue'
  | 'sla.breached'
  | 'sla.at_risk'
  | 'sla.met'
  | 'approval.requested'
  | 'approval.approved'
  | 'approval.rejected';

export interface CaseEvent {
  type: CaseEventType;
  caseId: string;
  tenantId: string;
  userId?: string;
  timestamp: Date;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

// ==================== SUMMARY & STATS ====================

export interface CaseSLASummary {
  totalSlas: number;
  activeSlas: number;
  metSlas: number;
  breachedSlas: number;
  atRiskSlas: number;
}

export interface CaseWorkloadSummary {
  userId: string;
  tenantId: string;
  totalTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  overdueTasks: number;
  activeCaseCount: number;
}

export interface OverdueTask {
  taskId: string;
  title: string;
  assignedTo?: string;
  dueDate: Date;
  daysOverdue: number;
}

export interface PendingApproval {
  approvalId: string;
  caseId: string;
  caseTitle: string;
  approvalType: ApprovalType;
  reason: string;
  requestedAt: Date;
  requiredApprovers: number;
  currentApprovals: number;
}
