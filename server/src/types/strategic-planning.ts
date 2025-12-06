/**
 * Strategic Planning Module - Type Definitions
 *
 * Core domain types for intelligence analysis strategic planning workflows.
 * Supports strategic plans, objectives, initiatives, milestones, and risk assessment.
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export type PlanStatus =
  | 'DRAFT'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';

export type PlanPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type TimeHorizon = 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM' | 'STRATEGIC';

export type ObjectiveStatus =
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'AT_RISK'
  | 'ON_TRACK'
  | 'COMPLETED'
  | 'BLOCKED'
  | 'DEFERRED';

export type InitiativeType =
  | 'COLLECTION'
  | 'ANALYSIS'
  | 'DISSEMINATION'
  | 'COORDINATION'
  | 'CAPABILITY_BUILDING'
  | 'TECHNOLOGY'
  | 'PARTNERSHIP'
  | 'TRAINING';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RiskCategory =
  | 'OPERATIONAL'
  | 'STRATEGIC'
  | 'RESOURCE'
  | 'SECURITY'
  | 'COMPLIANCE'
  | 'TECHNICAL'
  | 'EXTERNAL';

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'MISSED' | 'DEFERRED';

export type ResourceType = 'PERSONNEL' | 'BUDGET' | 'TECHNOLOGY' | 'INTELLIGENCE' | 'PARTNERSHIP';

export type StakeholderRole = 'OWNER' | 'SPONSOR' | 'CONTRIBUTOR' | 'REVIEWER' | 'OBSERVER';

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Strategic Plan - Top-level planning entity
 */
export interface StrategicPlan {
  id: string;
  tenantId: string;
  investigationId?: string;
  name: string;
  description: string;
  status: PlanStatus;
  priority: PlanPriority;
  timeHorizon: TimeHorizon;
  startDate: Date;
  endDate: Date;
  objectives: StrategicObjective[];
  initiatives: Initiative[];
  risks: RiskAssessment[];
  stakeholders: Stakeholder[];
  resources: ResourceAllocation[];
  kpis: KeyPerformanceIndicator[];
  assumptions: string[];
  constraints: string[];
  dependencies: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  version: number;
}

/**
 * Strategic Objective - Measurable goal within a plan
 */
export interface StrategicObjective {
  id: string;
  planId: string;
  name: string;
  description: string;
  status: ObjectiveStatus;
  priority: PlanPriority;
  targetValue: number;
  currentValue: number;
  unit: string;
  startDate: Date;
  targetDate: Date;
  milestones: Milestone[];
  keyResults: KeyResult[];
  alignedIntelligencePriorities: string[];
  successCriteria: string[];
  dependencies: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Key Result - Measurable outcome for an objective
 */
export interface KeyResult {
  id: string;
  objectiveId: string;
  description: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  weight: number;
  status: ObjectiveStatus;
  dueDate: Date;
  updatedAt: Date;
}

/**
 * Initiative - Action or project to achieve objectives
 */
export interface Initiative {
  id: string;
  planId: string;
  objectiveIds: string[];
  name: string;
  description: string;
  type: InitiativeType;
  status: ObjectiveStatus;
  priority: PlanPriority;
  startDate: Date;
  endDate: Date;
  budget?: number;
  budgetUsed?: number;
  assignedTo: string[];
  milestones: Milestone[];
  deliverables: Deliverable[];
  risks: string[];
  dependencies: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Milestone - Key checkpoint within an objective or initiative
 */
export interface Milestone {
  id: string;
  parentId: string;
  parentType: 'objective' | 'initiative';
  name: string;
  description: string;
  status: MilestoneStatus;
  dueDate: Date;
  completedAt?: Date;
  completedBy?: string;
  deliverables: string[];
  dependencies: string[];
}

/**
 * Deliverable - Output from an initiative
 */
export interface Deliverable {
  id: string;
  initiativeId: string;
  name: string;
  description: string;
  type: string;
  status: MilestoneStatus;
  dueDate: Date;
  completedAt?: Date;
  artifacts: string[];
}

/**
 * Risk Assessment - Identified risk and mitigation
 */
export interface RiskAssessment {
  id: string;
  planId: string;
  name: string;
  description: string;
  category: RiskCategory;
  likelihood: number; // 1-5
  impact: number; // 1-5
  riskScore: number; // likelihood * impact
  riskLevel: RiskLevel;
  status: 'IDENTIFIED' | 'ASSESSED' | 'MITIGATING' | 'MITIGATED' | 'ACCEPTED' | 'CLOSED';
  mitigationStrategies: MitigationStrategy[];
  contingencyPlans: string[];
  owner: string;
  identifiedAt: Date;
  lastAssessedAt: Date;
  reviewDate: Date;
}

/**
 * Mitigation Strategy - Plan to address a risk
 */
export interface MitigationStrategy {
  id: string;
  riskId: string;
  description: string;
  type: 'AVOID' | 'MITIGATE' | 'TRANSFER' | 'ACCEPT';
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';
  effectiveness: number; // 0-100%
  cost?: number;
  owner: string;
  deadline: Date;
}

/**
 * Stakeholder - Person or entity with interest in the plan
 */
export interface Stakeholder {
  id: string;
  planId: string;
  userId: string;
  name: string;
  role: StakeholderRole;
  responsibilities: string[];
  communicationPreferences: {
    frequency: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    channels: string[];
  };
  addedAt: Date;
  addedBy: string;
}

/**
 * Resource Allocation - Resources assigned to the plan
 */
export interface ResourceAllocation {
  id: string;
  planId: string;
  type: ResourceType;
  name: string;
  description: string;
  allocated: number;
  used: number;
  unit: string;
  startDate: Date;
  endDate: Date;
  status: 'PLANNED' | 'ALLOCATED' | 'IN_USE' | 'RELEASED';
}

/**
 * Key Performance Indicator - Metric for measuring success
 */
export interface KeyPerformanceIndicator {
  id: string;
  planId: string;
  name: string;
  description: string;
  formula: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  trend: 'UP' | 'DOWN' | 'STABLE';
  lastUpdated: Date;
  history: KPIDataPoint[];
}

/**
 * KPI Data Point - Historical KPI value
 */
export interface KPIDataPoint {
  timestamp: Date;
  value: number;
  notes?: string;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateStrategicPlanInput {
  tenantId: string;
  investigationId?: string;
  name: string;
  description: string;
  priority: PlanPriority;
  timeHorizon: TimeHorizon;
  startDate: string;
  endDate: string;
  assumptions?: string[];
  constraints?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateStrategicPlanInput {
  name?: string;
  description?: string;
  status?: PlanStatus;
  priority?: PlanPriority;
  timeHorizon?: TimeHorizon;
  startDate?: string;
  endDate?: string;
  assumptions?: string[];
  constraints?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateObjectiveInput {
  planId: string;
  name: string;
  description: string;
  priority: PlanPriority;
  targetValue: number;
  unit: string;
  startDate: string;
  targetDate: string;
  alignedIntelligencePriorities?: string[];
  successCriteria?: string[];
}

export interface CreateInitiativeInput {
  planId: string;
  objectiveIds: string[];
  name: string;
  description: string;
  type: InitiativeType;
  priority: PlanPriority;
  startDate: string;
  endDate: string;
  budget?: number;
  assignedTo?: string[];
}

export interface CreateRiskInput {
  planId: string;
  name: string;
  description: string;
  category: RiskCategory;
  likelihood: number;
  impact: number;
  contingencyPlans?: string[];
}

export interface CreateMilestoneInput {
  parentId: string;
  parentType: 'objective' | 'initiative';
  name: string;
  description: string;
  dueDate: string;
  deliverables?: string[];
}

export interface AddStakeholderInput {
  planId: string;
  userId: string;
  name: string;
  role: StakeholderRole;
  responsibilities?: string[];
}

export interface AllocateResourceInput {
  planId: string;
  type: ResourceType;
  name: string;
  description: string;
  allocated: number;
  unit: string;
  startDate: string;
  endDate: string;
}

export interface CreateKPIInput {
  planId: string;
  name: string;
  description: string;
  formula: string;
  targetValue: number;
  unit: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface StrategicPlanFilter {
  status?: PlanStatus;
  priority?: PlanPriority;
  timeHorizon?: TimeHorizon;
  investigationId?: string;
  createdBy?: string;
  startDateFrom?: string;
  startDateTo?: string;
  tags?: string[];
}

export interface StrategicPlanListResult {
  data: StrategicPlan[];
  total: number;
  hasMore: boolean;
}

// ============================================================================
// ANALYTICS & REPORTING TYPES
// ============================================================================

export interface PlanProgress {
  planId: string;
  overallProgress: number; // 0-100
  objectivesProgress: {
    total: number;
    completed: number;
    onTrack: number;
    atRisk: number;
    blocked: number;
  };
  initiativesProgress: {
    total: number;
    completed: number;
    inProgress: number;
    notStarted: number;
  };
  milestonesProgress: {
    total: number;
    completed: number;
    upcoming: number;
    overdue: number;
  };
  riskSummary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  resourceUtilization: {
    budget: { allocated: number; used: number };
    personnel: { allocated: number; assigned: number };
  };
  healthScore: number; // 0-100
  updatedAt: Date;
}

export interface PlanTimeline {
  planId: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  type: 'milestone' | 'objective_start' | 'objective_end' | 'initiative_start' | 'initiative_end' | 'review' | 'risk_identified';
  date: Date;
  title: string;
  description: string;
  status: string;
  relatedEntityId: string;
  relatedEntityType: string;
}

export interface PlanScorecard {
  planId: string;
  period: { start: Date; end: Date };
  kpiScores: {
    kpiId: string;
    name: string;
    target: number;
    actual: number;
    achievement: number; // percentage
    trend: 'UP' | 'DOWN' | 'STABLE';
  }[];
  objectiveScores: {
    objectiveId: string;
    name: string;
    progress: number;
    keyResultsAchievement: number;
  }[];
  overallScore: number;
  recommendations: string[];
  generatedAt: Date;
}

// ============================================================================
// DATABASE ROW TYPES (for repository layer)
// ============================================================================

export interface StrategicPlanRow {
  id: string;
  tenant_id: string;
  investigation_id: string | null;
  name: string;
  description: string;
  status: string;
  priority: string;
  time_horizon: string;
  start_date: Date;
  end_date: Date;
  assumptions: string[];
  constraints: string[];
  dependencies: string[];
  tags: string[];
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  approved_by: string | null;
  approved_at: Date | null;
  version: number;
}

export interface ObjectiveRow {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  status: string;
  priority: string;
  target_value: number;
  current_value: number;
  unit: string;
  start_date: Date;
  target_date: Date;
  aligned_intelligence_priorities: string[];
  success_criteria: string[];
  dependencies: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface InitiativeRow {
  id: string;
  plan_id: string;
  objective_ids: string[];
  name: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  start_date: Date;
  end_date: Date;
  budget: number | null;
  budget_used: number | null;
  assigned_to: string[];
  risks: string[];
  dependencies: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface RiskRow {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  category: string;
  likelihood: number;
  impact: number;
  risk_score: number;
  risk_level: string;
  status: string;
  contingency_plans: string[];
  owner: string;
  identified_at: Date;
  last_assessed_at: Date;
  review_date: Date;
}

export interface MilestoneRow {
  id: string;
  parent_id: string;
  parent_type: string;
  name: string;
  description: string;
  status: string;
  due_date: Date;
  completed_at: Date | null;
  completed_by: string | null;
  deliverables: string[];
  dependencies: string[];
}

export interface StakeholderRow {
  id: string;
  plan_id: string;
  user_id: string;
  name: string;
  role: string;
  responsibilities: string[];
  communication_preferences: Record<string, unknown>;
  added_at: Date;
  added_by: string;
}

export interface ResourceRow {
  id: string;
  plan_id: string;
  type: string;
  name: string;
  description: string;
  allocated: number;
  used: number;
  unit: string;
  start_date: Date;
  end_date: Date;
  status: string;
}

export interface KPIRow {
  id: string;
  plan_id: string;
  name: string;
  description: string;
  formula: string;
  target_value: number;
  current_value: number;
  unit: string;
  frequency: string;
  trend: string;
  last_updated: Date;
  history: KPIDataPoint[];
}
