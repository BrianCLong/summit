/**
 * Strategic Planning GraphQL Schema
 *
 * Defines types, queries, mutations, and subscriptions for strategic planning.
 */

export const strategicPlanningTypeDefs = `
  # ============================================================================
  # ENUMS
  # ============================================================================

  enum PlanStatus {
    DRAFT
    UNDER_REVIEW
    APPROVED
    ACTIVE
    ON_HOLD
    COMPLETED
    ARCHIVED
    CANCELLED
  }

  enum PlanPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum TimeHorizon {
    SHORT_TERM
    MEDIUM_TERM
    LONG_TERM
    STRATEGIC
  }

  enum ObjectiveStatus {
    NOT_STARTED
    IN_PROGRESS
    AT_RISK
    ON_TRACK
    COMPLETED
    BLOCKED
    DEFERRED
  }

  enum InitiativeType {
    COLLECTION
    ANALYSIS
    DISSEMINATION
    COORDINATION
    CAPABILITY_BUILDING
    TECHNOLOGY
    PARTNERSHIP
    TRAINING
  }

  enum RiskLevel {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum RiskCategory {
    OPERATIONAL
    STRATEGIC
    RESOURCE
    SECURITY
    COMPLIANCE
    TECHNICAL
    EXTERNAL
  }

  enum RiskMitigationType {
    AVOID
    MITIGATE
    TRANSFER
    ACCEPT
  }

  enum MilestoneStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    MISSED
    DEFERRED
  }

  enum ResourceType {
    PERSONNEL
    BUDGET
    TECHNOLOGY
    INTELLIGENCE
    PARTNERSHIP
  }

  enum ResourceStatus {
    PLANNED
    ALLOCATED
    IN_USE
    RELEASED
  }

  enum StakeholderRole {
    OWNER
    SPONSOR
    CONTRIBUTOR
    REVIEWER
    OBSERVER
  }

  enum KPIFrequency {
    DAILY
    WEEKLY
    MONTHLY
    QUARTERLY
  }

  enum TrendDirection {
    UP
    DOWN
    STABLE
  }

  # ============================================================================
  # TYPES
  # ============================================================================

  type StrategicPlan {
    id: ID!
    tenantId: String!
    investigationId: ID
    name: String!
    description: String!
    status: PlanStatus!
    priority: PlanPriority!
    timeHorizon: TimeHorizon!
    startDate: DateTime!
    endDate: DateTime!
    objectives: [StrategicObjective!]!
    initiatives: [Initiative!]!
    risks: [RiskAssessment!]!
    stakeholders: [Stakeholder!]!
    resources: [ResourceAllocation!]!
    kpis: [KeyPerformanceIndicator!]!
    assumptions: [String!]!
    constraints: [String!]!
    dependencies: [String!]!
    tags: [String!]!
    metadata: JSON
    createdBy: String!
    createdAt: DateTime!
    updatedAt: DateTime!
    approvedBy: String
    approvedAt: DateTime
    version: Int!

    # Computed fields
    progress: PlanProgress
    timeline: PlanTimeline
  }

  type StrategicObjective {
    id: ID!
    planId: ID!
    name: String!
    description: String!
    status: ObjectiveStatus!
    priority: PlanPriority!
    targetValue: Float!
    currentValue: Float!
    unit: String!
    startDate: DateTime!
    targetDate: DateTime!
    milestones: [Milestone!]!
    keyResults: [KeyResult!]!
    alignedIntelligencePriorities: [String!]!
    successCriteria: [String!]!
    dependencies: [String!]!
    createdBy: String!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Computed fields
    progress: Float!
  }

  type KeyResult {
    id: ID!
    objectiveId: ID!
    description: String!
    targetValue: Float!
    currentValue: Float!
    unit: String!
    weight: Float!
    status: ObjectiveStatus!
    dueDate: DateTime!
    updatedAt: DateTime!

    # Computed fields
    progress: Float!
  }

  type Initiative {
    id: ID!
    planId: ID!
    objectiveIds: [ID!]!
    name: String!
    description: String!
    type: InitiativeType!
    status: ObjectiveStatus!
    priority: PlanPriority!
    startDate: DateTime!
    endDate: DateTime!
    budget: Float
    budgetUsed: Float
    assignedTo: [String!]!
    milestones: [Milestone!]!
    deliverables: [Deliverable!]!
    risks: [String!]!
    dependencies: [String!]!
    createdBy: String!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Computed fields
    budgetUtilization: Float
  }

  type Milestone {
    id: ID!
    parentId: ID!
    parentType: String!
    name: String!
    description: String!
    status: MilestoneStatus!
    dueDate: DateTime!
    completedAt: DateTime
    completedBy: String
    deliverables: [String!]!
    dependencies: [String!]!

    # Computed fields
    isOverdue: Boolean!
    daysUntilDue: Int!
  }

  type Deliverable {
    id: ID!
    initiativeId: ID!
    name: String!
    description: String!
    type: String!
    status: MilestoneStatus!
    dueDate: DateTime!
    completedAt: DateTime
    artifacts: [String!]!
  }

  type RiskAssessment {
    id: ID!
    planId: ID!
    name: String!
    description: String!
    category: RiskCategory!
    likelihood: Int!
    impact: Int!
    riskScore: Int!
    riskLevel: RiskLevel!
    status: String!
    mitigationStrategies: [MitigationStrategy!]!
    contingencyPlans: [String!]!
    owner: String!
    identifiedAt: DateTime!
    lastAssessedAt: DateTime!
    reviewDate: DateTime!
  }

  type MitigationStrategy {
    id: ID!
    riskId: ID!
    description: String!
    type: RiskMitigationType!
    status: String!
    effectiveness: Float!
    cost: Float
    owner: String!
    deadline: DateTime!
  }

  type Stakeholder {
    id: ID!
    planId: ID!
    userId: String!
    name: String!
    role: StakeholderRole!
    responsibilities: [String!]!
    communicationPreferences: CommunicationPreferences!
    addedAt: DateTime!
    addedBy: String!
  }

  type CommunicationPreferences {
    frequency: String!
    channels: [String!]!
  }

  type ResourceAllocation {
    id: ID!
    planId: ID!
    type: ResourceType!
    name: String!
    description: String!
    allocated: Float!
    used: Float!
    unit: String!
    startDate: DateTime!
    endDate: DateTime!
    status: ResourceStatus!

    # Computed fields
    utilizationRate: Float!
  }

  type KeyPerformanceIndicator {
    id: ID!
    planId: ID!
    name: String!
    description: String!
    formula: String!
    targetValue: Float!
    currentValue: Float!
    unit: String!
    frequency: KPIFrequency!
    trend: TrendDirection!
    lastUpdated: DateTime!
    history: [KPIDataPoint!]!

    # Computed fields
    achievement: Float!
  }

  type KPIDataPoint {
    timestamp: DateTime!
    value: Float!
    notes: String
  }

  # ============================================================================
  # ANALYTICS & PROGRESS TYPES
  # ============================================================================

  type PlanProgress {
    planId: ID!
    overallProgress: Float!
    objectivesProgress: ObjectivesProgress!
    initiativesProgress: InitiativesProgress!
    milestonesProgress: MilestonesProgress!
    riskSummary: RiskSummary!
    resourceUtilization: ResourceUtilizationSummary!
    healthScore: Float!
    updatedAt: DateTime!
  }

  type ObjectivesProgress {
    total: Int!
    completed: Int!
    onTrack: Int!
    atRisk: Int!
    blocked: Int!
  }

  type InitiativesProgress {
    total: Int!
    completed: Int!
    inProgress: Int!
    notStarted: Int!
  }

  type MilestonesProgress {
    total: Int!
    completed: Int!
    upcoming: Int!
    overdue: Int!
  }

  type RiskSummary {
    total: Int!
    critical: Int!
    high: Int!
    medium: Int!
    low: Int!
  }

  type ResourceUtilizationSummary {
    budget: BudgetUtilization!
    personnel: PersonnelUtilization!
  }

  type BudgetUtilization {
    allocated: Float!
    used: Float!
  }

  type PersonnelUtilization {
    allocated: Float!
    assigned: Float!
  }

  type PlanTimeline {
    planId: ID!
    events: [TimelineEvent!]!
  }

  type TimelineEvent {
    id: ID!
    type: String!
    date: DateTime!
    title: String!
    description: String!
    status: String!
    relatedEntityId: ID!
    relatedEntityType: String!
  }

  type PlanScorecard {
    planId: ID!
    period: ScorecardPeriod!
    kpiScores: [KPIScore!]!
    objectiveScores: [ObjectiveScore!]!
    overallScore: Float!
    recommendations: [String!]!
    generatedAt: DateTime!
  }

  type ScorecardPeriod {
    start: DateTime!
    end: DateTime!
  }

  type KPIScore {
    kpiId: ID!
    name: String!
    target: Float!
    actual: Float!
    achievement: Float!
    trend: TrendDirection!
  }

  type ObjectiveScore {
    objectiveId: ID!
    name: String!
    progress: Float!
    keyResultsAchievement: Float!
  }

  type PlanActivityLog {
    id: ID!
    entityType: String!
    entityId: ID!
    action: String!
    actorId: String!
    changes: JSON
    createdAt: DateTime!
  }

  # ============================================================================
  # LIST TYPES
  # ============================================================================

  type StrategicPlanList {
    data: [StrategicPlan!]!
    total: Int!
    hasMore: Boolean!
  }

  # ============================================================================
  # INPUT TYPES
  # ============================================================================

  input CreateStrategicPlanInput {
    investigationId: ID
    name: String!
    description: String!
    priority: PlanPriority!
    timeHorizon: TimeHorizon!
    startDate: DateTime!
    endDate: DateTime!
    assumptions: [String!]
    constraints: [String!]
    tags: [String!]
    metadata: JSON
  }

  input UpdateStrategicPlanInput {
    name: String
    description: String
    status: PlanStatus
    priority: PlanPriority
    timeHorizon: TimeHorizon
    startDate: DateTime
    endDate: DateTime
    assumptions: [String!]
    constraints: [String!]
    tags: [String!]
    metadata: JSON
  }

  input CreateObjectiveInput {
    planId: ID!
    name: String!
    description: String!
    priority: PlanPriority!
    targetValue: Float!
    unit: String!
    startDate: DateTime!
    targetDate: DateTime!
    alignedIntelligencePriorities: [String!]
    successCriteria: [String!]
  }

  input UpdateObjectiveInput {
    name: String
    description: String
    status: ObjectiveStatus
    priority: PlanPriority
    targetValue: Float
    currentValue: Float
    unit: String
    startDate: DateTime
    targetDate: DateTime
    alignedIntelligencePriorities: [String!]
    successCriteria: [String!]
  }

  input CreateKeyResultInput {
    objectiveId: ID!
    description: String!
    targetValue: Float!
    unit: String!
    weight: Float
    dueDate: DateTime!
  }

  input CreateInitiativeInput {
    planId: ID!
    objectiveIds: [ID!]!
    name: String!
    description: String!
    type: InitiativeType!
    priority: PlanPriority!
    startDate: DateTime!
    endDate: DateTime!
    budget: Float
    assignedTo: [String!]
  }

  input UpdateInitiativeInput {
    name: String
    description: String
    type: InitiativeType
    status: ObjectiveStatus
    priority: PlanPriority
    startDate: DateTime
    endDate: DateTime
    budget: Float
    budgetUsed: Float
    assignedTo: [String!]
    objectiveIds: [ID!]
  }

  input CreateDeliverableInput {
    initiativeId: ID!
    name: String!
    description: String!
    type: String!
    dueDate: DateTime!
  }

  input CreateMilestoneInput {
    parentId: ID!
    parentType: String!
    name: String!
    description: String!
    dueDate: DateTime!
    deliverables: [String!]
  }

  input CreateRiskInput {
    planId: ID!
    name: String!
    description: String!
    category: RiskCategory!
    likelihood: Int!
    impact: Int!
    contingencyPlans: [String!]
  }

  input UpdateRiskInput {
    name: String
    description: String
    category: RiskCategory
    likelihood: Int
    impact: Int
    status: String
    contingencyPlans: [String!]
    owner: String
    reviewDate: DateTime
  }

  input CreateMitigationInput {
    riskId: ID!
    description: String!
    type: RiskMitigationType!
    owner: String!
    deadline: DateTime!
    cost: Float
  }

  input AddStakeholderInput {
    planId: ID!
    userId: String!
    name: String!
    role: StakeholderRole!
    responsibilities: [String!]
  }

  input AllocateResourceInput {
    planId: ID!
    type: ResourceType!
    name: String!
    description: String!
    allocated: Float!
    unit: String!
    startDate: DateTime!
    endDate: DateTime!
  }

  input CreateKPIInput {
    planId: ID!
    name: String!
    description: String!
    formula: String!
    targetValue: Float!
    unit: String!
    frequency: KPIFrequency!
  }

  input StrategicPlanFilter {
    status: PlanStatus
    priority: PlanPriority
    timeHorizon: TimeHorizon
    investigationId: ID
    createdBy: String
    startDateFrom: DateTime
    startDateTo: DateTime
    tags: [String!]
  }

  input ScorecardPeriodInput {
    start: DateTime!
    end: DateTime!
  }

  # ============================================================================
  # EXTEND ROOT TYPES
  # ============================================================================

  extend type Query {
    # Strategic Plans
    strategicPlan(id: ID!): StrategicPlan
    strategicPlans(
      filter: StrategicPlanFilter
      limit: Int = 50
      offset: Int = 0
    ): StrategicPlanList!

    # Plan Analytics
    planProgress(planId: ID!): PlanProgress
    planTimeline(planId: ID!): PlanTimeline
    planScorecard(planId: ID!, period: ScorecardPeriodInput): PlanScorecard
    planActivityLog(planId: ID!, limit: Int = 50): [PlanActivityLog!]!

    # Individual Entities
    strategicObjective(id: ID!): StrategicObjective
    initiative(id: ID!): Initiative
    risk(id: ID!): RiskAssessment
  }

  extend type Mutation {
    # Strategic Plans
    createStrategicPlan(input: CreateStrategicPlanInput!): StrategicPlan!
    updateStrategicPlan(id: ID!, input: UpdateStrategicPlanInput!): StrategicPlan
    deleteStrategicPlan(id: ID!): Boolean!
    approveStrategicPlan(id: ID!): StrategicPlan
    activateStrategicPlan(id: ID!): StrategicPlan

    # Objectives
    createObjective(input: CreateObjectiveInput!): StrategicObjective!
    updateObjective(id: ID!, input: UpdateObjectiveInput!): StrategicObjective
    deleteObjective(id: ID!): Boolean!
    updateObjectiveProgress(id: ID!, currentValue: Float!): StrategicObjective

    # Key Results
    createKeyResult(input: CreateKeyResultInput!): KeyResult!
    updateKeyResultProgress(id: ID!, currentValue: Float!): KeyResult

    # Initiatives
    createInitiative(input: CreateInitiativeInput!): Initiative!
    updateInitiative(id: ID!, input: UpdateInitiativeInput!): Initiative
    deleteInitiative(id: ID!): Boolean!

    # Deliverables
    createDeliverable(input: CreateDeliverableInput!): Deliverable!
    completeDeliverable(id: ID!): Deliverable

    # Milestones
    createMilestone(input: CreateMilestoneInput!): Milestone!
    completeMilestone(id: ID!): Milestone
    deferMilestone(id: ID!): Milestone

    # Risks
    createRisk(input: CreateRiskInput!): RiskAssessment!
    updateRisk(id: ID!, input: UpdateRiskInput!): RiskAssessment
    createMitigation(input: CreateMitigationInput!): MitigationStrategy!

    # Stakeholders
    addStakeholder(input: AddStakeholderInput!): Stakeholder!
    removeStakeholder(planId: ID!, userId: String!): Boolean!

    # Resources
    allocateResource(input: AllocateResourceInput!): ResourceAllocation!
    updateResourceUsage(id: ID!, used: Float!, status: ResourceStatus): ResourceAllocation

    # KPIs
    createKPI(input: CreateKPIInput!): KeyPerformanceIndicator!
    updateKPIValue(id: ID!, value: Float!, notes: String): KeyPerformanceIndicator
  }

  extend type Subscription {
    strategicPlanUpdated(planId: ID!): StrategicPlan!
    objectiveProgressUpdated(planId: ID!): StrategicObjective!
    riskLevelChanged(planId: ID!): RiskAssessment!
    milestoneCompleted(planId: ID!): Milestone!
  }
`;
