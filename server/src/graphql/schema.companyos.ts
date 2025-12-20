/**
 * CompanyOS Internal Operations GraphQL Schema
 *
 * This schema supports Summit's self-hosting operational capabilities:
 * - Incident management
 * - Deployment tracking
 * - SLO monitoring
 * - Alert management
 * - Runbook execution
 * - On-call schedules
 * - Postmortem creation
 * - ADR (Architecture Decision Records)
 * - Roadmap/epic tracking
 * - Customer requests and demos
 */

export const companyOsTypeDefs = `
  # ============================================================================
  # INCIDENT MANAGEMENT
  # ============================================================================

  enum IncidentSeverity {
    SEV1
    SEV2
    SEV3
    SEV4
  }

  enum IncidentStatus {
    OPEN
    INVESTIGATING
    IDENTIFIED
    MONITORING
    RESOLVED
    CLOSED
  }

  type Incident {
    id: ID!
    tenantId: String!
    title: String!
    description: String
    severity: IncidentSeverity!
    status: IncidentStatus!
    affectedServices: [String!]
    startedAt: DateTime!
    detectedAt: DateTime
    acknowledgedAt: DateTime
    resolvedAt: DateTime
    closedAt: DateTime
    commander: String
    responders: [String!]
    githubIssueUrl: String
    githubIssueNumber: Int
    slackChannel: String
    rootCause: String
    impactDescription: String
    customerImpact: Boolean
    estimatedAffectedUsers: Int
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!

    # Computed fields
    durationMinutes: Float
    timeToResolveMinutes: Float
    alertCount: Int
    runbookExecutionCount: Int
    alerts: [Alert!]
    runbookExecutions: [RunbookExecution!]
    postmortem: Postmortem
  }

  input IncidentInput {
    title: String!
    description: String
    severity: IncidentSeverity!
    affectedServices: [String!]
    commander: String
    responders: [String!]
    impactDescription: String
    customerImpact: Boolean
    estimatedAffectedUsers: Int
    metadata: JSON
  }

  input IncidentUpdateInput {
    title: String
    description: String
    severity: IncidentSeverity
    status: IncidentStatus
    affectedServices: [String!]
    commander: String
    responders: [String!]
    rootCause: String
    impactDescription: String
    customerImpact: Boolean
    estimatedAffectedUsers: Int
    metadata: JSON
  }

  input IncidentFilter {
    severity: IncidentSeverity
    status: IncidentStatus
    commander: String
    customerImpact: Boolean
    fromDate: DateTime
    toDate: DateTime
  }

  # ============================================================================
  # DEPLOYMENT TRACKING
  # ============================================================================

  enum DeploymentEnvironment {
    DEV
    STAGING
    PREVIEW
    PRODUCTION
    CANARY
  }

  enum DeploymentStatus {
    PENDING
    IN_PROGRESS
    SUCCEEDED
    FAILED
    ROLLED_BACK
    CANCELLED
  }

  enum DeploymentType {
    STANDARD
    CANARY
    BLUE_GREEN
    ROLLING
    HOTFIX
  }

  enum HealthCheckStatus {
    PASSED
    FAILED
    SKIPPED
  }

  type Deployment {
    id: ID!
    serviceName: String!
    version: String!
    environment: DeploymentEnvironment!
    status: DeploymentStatus!
    deploymentType: DeploymentType
    startedAt: DateTime!
    completedAt: DateTime
    durationSeconds: Int
    deployedBy: String!
    commitSha: String
    githubRunId: String
    githubRunUrl: String
    githubReleaseUrl: String
    rollbackOfDeploymentId: ID
    healthCheckStatus: HealthCheckStatus
    smokeTestStatus: HealthCheckStatus
    errorMessage: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    rollbackOfDeployment: Deployment
  }

  input DeploymentInput {
    serviceName: String!
    version: String!
    environment: DeploymentEnvironment!
    deploymentType: DeploymentType
    deployedBy: String!
    commitSha: String
    githubRunId: String
    githubRunUrl: String
    githubReleaseUrl: String
    metadata: JSON
  }

  input DeploymentUpdateInput {
    status: DeploymentStatus
    completedAt: DateTime
    durationSeconds: Int
    healthCheckStatus: HealthCheckStatus
    smokeTestStatus: HealthCheckStatus
    errorMessage: String
    metadata: JSON
  }

  input DeploymentFilter {
    serviceName: String
    environment: DeploymentEnvironment
    status: DeploymentStatus
    deployedBy: String
    fromDate: DateTime
    toDate: DateTime
  }

  type DeploymentStats {
    serviceName: String!
    environment: DeploymentEnvironment!
    totalDeployments: Int!
    successfulDeployments: Int!
    failedDeployments: Int!
    rolledBackDeployments: Int!
    successRate: Float!
    avgDurationSeconds: Float
    lastDeploymentAt: DateTime
  }

  # ============================================================================
  # SLO VIOLATIONS
  # ============================================================================

  enum SLOType {
    AVAILABILITY
    LATENCY
    ERROR_RATE
    THROUGHPUT
  }

  enum ViolationSeverity {
    WARNING
    CRITICAL
  }

  type SLOViolation {
    id: ID!
    sloName: String!
    sloType: SLOType!
    serviceName: String!
    thresholdValue: Float!
    actualValue: Float!
    measurementWindow: String
    triggeredAt: DateTime!
    resolvedAt: DateTime
    severity: ViolationSeverity
    incidentId: ID
    alertId: ID
    errorBudgetImpact: Float
    prometheusQuery: String
    prometheusValueJson: JSON
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    incident: Incident
    alert: Alert
  }

  input SLOViolationInput {
    sloName: String!
    sloType: SLOType!
    serviceName: String!
    thresholdValue: Float!
    actualValue: Float!
    measurementWindow: String
    severity: ViolationSeverity
    prometheusQuery: String
    prometheusValueJson: JSON
    metadata: JSON
  }

  type SLOComplianceSummary {
    sloName: String!
    serviceName: String!
    sloType: SLOType!
    violationCount: Int!
    lastViolationAt: DateTime
    totalErrorBudgetConsumed: Float
    avgActualValue: Float
    thresholdValue: Float
  }

  # ============================================================================
  # ALERTS
  # ============================================================================

  enum AlertSource {
    PROMETHEUS
    ALERTMANAGER
    GRAFANA
    CUSTOM
    GITHUB_ACTIONS
  }

  enum AlertSeverity {
    INFO
    WARNING
    CRITICAL
  }

  enum AlertStatus {
    FIRING
    ACKNOWLEDGED
    RESOLVED
    SILENCED
  }

  type Alert {
    id: ID!
    alertName: String!
    alertSource: AlertSource!
    severity: AlertSeverity!
    status: AlertStatus!
    serviceName: String
    summary: String!
    description: String
    labels: JSON
    annotations: JSON
    triggeredAt: DateTime!
    acknowledgedAt: DateTime
    acknowledgedBy: String
    resolvedAt: DateTime
    incidentId: ID
    sloViolationId: ID
    runbookUrl: String
    dashboardUrl: String
    fingerprint: String
    groupKey: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    incident: Incident
    sloViolation: SLOViolation
  }

  input AlertInput {
    alertName: String!
    alertSource: AlertSource!
    severity: AlertSeverity!
    serviceName: String
    summary: String!
    description: String
    labels: JSON
    annotations: JSON
    runbookUrl: String
    dashboardUrl: String
    fingerprint: String
    groupKey: String
    metadata: JSON
  }

  input AlertUpdateInput {
    status: AlertStatus
    acknowledgedBy: String
    incidentId: ID
    metadata: JSON
  }

  input AlertFilter {
    alertName: String
    severity: AlertSeverity
    status: AlertStatus
    serviceName: String
    fromDate: DateTime
    toDate: DateTime
  }

  type AlertMetrics {
    alertName: String!
    serviceName: String
    severity: AlertSeverity!
    fireCount: Int!
    resolvedCount: Int!
    avgTimeToAcknowledgeMinutes: Float
    avgTimeToResolveMinutes: Float
    lastFiredAt: DateTime
  }

  # ============================================================================
  # RUNBOOKS
  # ============================================================================

  type Runbook {
    id: ID!
    name: String!
    title: String!
    description: String
    category: String
    filePath: String!
    yamlContent: JSON
    markdownContent: String
    tags: [String!]
    relatedServices: [String!]
    estimatedDurationMinutes: Int
    lastExecutedAt: DateTime
    executionCount: Int
    successRate: Float
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    recentExecutions: [RunbookExecution!]
  }

  input RunbookInput {
    name: String!
    title: String!
    description: String
    category: String
    filePath: String!
    yamlContent: JSON
    markdownContent: String
    tags: [String!]
    relatedServices: [String!]
    estimatedDurationMinutes: Int
    metadata: JSON
  }

  enum RunbookExecutionStatus {
    STARTED
    IN_PROGRESS
    COMPLETED
    FAILED
    CANCELLED
  }

  enum RunbookTriggerSource {
    MANUAL
    INCIDENT
    ALERT
    SCHEDULED
    API
  }

  type RunbookExecution {
    id: ID!
    runbookId: ID!
    incidentId: ID
    alertId: ID
    status: RunbookExecutionStatus!
    triggeredBy: String!
    triggerSource: RunbookTriggerSource
    startedAt: DateTime!
    completedAt: DateTime
    durationSeconds: Int
    stepsCompleted: Int
    stepsTotal: Int
    currentStep: String
    executionLog: JSON
    outcome: String
    errorMessage: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    runbook: Runbook!
    incident: Incident
    alert: Alert
  }

  input RunbookExecutionInput {
    runbookId: ID!
    incidentId: ID
    alertId: ID
    triggeredBy: String!
    triggerSource: RunbookTriggerSource
    stepsTotal: Int
    metadata: JSON
  }

  input RunbookExecutionUpdateInput {
    status: RunbookExecutionStatus
    stepsCompleted: Int
    currentStep: String
    executionLog: JSON
    outcome: String
    errorMessage: String
    metadata: JSON
  }

  # ============================================================================
  # ON-CALL SCHEDULES
  # ============================================================================

  enum OnCallRole {
    PRIMARY
    SECONDARY
    ESCALATION
  }

  type OnCallSchedule {
    id: ID!
    teamName: String!
    userId: String!
    userEmail: String
    userDisplayName: String
    role: OnCallRole
    startTime: DateTime!
    endTime: DateTime!
    timezone: String
    isOverride: Boolean
    overrideReason: String
    pagerdutyScheduleId: String
    notificationPreferences: JSON
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String
  }

  input OnCallScheduleInput {
    teamName: String!
    userId: String!
    userEmail: String
    userDisplayName: String
    role: OnCallRole
    startTime: DateTime!
    endTime: DateTime!
    timezone: String
    isOverride: Boolean
    overrideReason: String
    notificationPreferences: JSON
    metadata: JSON
  }

  input OnCallScheduleFilter {
    teamName: String
    userId: String
    startTime: DateTime
    endTime: DateTime
    activeOnly: Boolean
  }

  type CurrentOnCallUser {
    teamName: String!
    userId: String!
    userEmail: String
    userDisplayName: String
    role: OnCallRole!
    startTime: DateTime!
    endTime: DateTime!
  }

  # ============================================================================
  # POSTMORTEMS
  # ============================================================================

  enum PostmortemStatus {
    DRAFT
    IN_REVIEW
    PUBLISHED
    ARCHIVED
  }

  enum ResponseEffectiveness {
    EXCELLENT
    GOOD
    FAIR
    POOR
  }

  type TimelineEvent {
    timestamp: DateTime!
    description: String!
    author: String
  }

  type ActionItem {
    id: ID!
    description: String!
    owner: String
    dueDate: DateTime
    completed: Boolean
    completedAt: DateTime
  }

  type Postmortem {
    id: ID!
    incidentId: ID!
    title: String!
    summary: String
    timeline: [TimelineEvent!]
    rootCauseAnalysis: String
    impactAnalysis: String
    whatWentWell: [String!]
    whatWentWrong: [String!]
    actionItems: [ActionItem!]
    lessonsLearned: [String!]
    contributingFactors: [String!]
    detectionMethod: String
    responseEffectiveness: ResponseEffectiveness
    severityAssessment: String
    downtimeMinutes: Int
    customerImpactDescription: String
    status: PostmortemStatus!
    author: String!
    reviewers: [String!]
    publishedAt: DateTime
    githubIssueUrl: String
    googleDocUrl: String
    slackDiscussionUrl: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!

    # Relations
    incident: Incident!
  }

  input TimelineEventInput {
    timestamp: DateTime!
    description: String!
    author: String
  }

  input ActionItemInput {
    description: String!
    owner: String
    dueDate: DateTime
    completed: Boolean
  }

  input PostmortemInput {
    incidentId: ID!
    title: String!
    summary: String
    timeline: [TimelineEventInput!]
    rootCauseAnalysis: String
    impactAnalysis: String
    whatWentWell: [String!]
    whatWentWrong: [String!]
    actionItems: [ActionItemInput!]
    lessonsLearned: [String!]
    contributingFactors: [String!]
    detectionMethod: String
    responseEffectiveness: ResponseEffectiveness
    severityAssessment: String
    downtimeMinutes: Int
    customerImpactDescription: String
    githubIssueUrl: String
    googleDocUrl: String
    slackDiscussionUrl: String
    metadata: JSON
  }

  input PostmortemUpdateInput {
    title: String
    summary: String
    timeline: [TimelineEventInput!]
    rootCauseAnalysis: String
    impactAnalysis: String
    whatWentWell: [String!]
    whatWentWrong: [String!]
    actionItems: [ActionItemInput!]
    lessonsLearned: [String!]
    contributingFactors: [String!]
    detectionMethod: String
    responseEffectiveness: ResponseEffectiveness
    status: PostmortemStatus
    reviewers: [String!]
    metadata: JSON
  }

  # ============================================================================
  # ADRs (Architecture Decision Records)
  # ============================================================================

  enum ADRStatus {
    PROPOSED
    ACCEPTED
    REJECTED
    DEPRECATED
    SUPERSEDED
  }

  type ADR {
    id: ID!
    adrNumber: Int!
    title: String!
    status: ADRStatus!
    context: String!
    decision: String!
    consequences: String
    supersededByAdrId: ID
    relatedAdrIds: [ID!]
    filePath: String!
    markdownContent: String
    tags: [String!]
    affectedServices: [String!]
    stakeholders: [String!]
    decisionDate: DateTime
    reviewDate: DateTime
    githubPrUrl: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String

    # Relations
    supersededByAdr: ADR
    relatedAdrs: [ADR!]
  }

  input ADRInput {
    adrNumber: Int!
    title: String!
    status: ADRStatus
    context: String!
    decision: String!
    consequences: String
    supersededByAdrId: ID
    relatedAdrIds: [ID!]
    filePath: String!
    markdownContent: String
    tags: [String!]
    affectedServices: [String!]
    stakeholders: [String!]
    decisionDate: DateTime
    githubPrUrl: String
    metadata: JSON
  }

  input ADRUpdateInput {
    title: String
    status: ADRStatus
    context: String
    decision: String
    consequences: String
    supersededByAdrId: ID
    relatedAdrIds: [ID!]
    markdownContent: String
    tags: [String!]
    affectedServices: [String!]
    stakeholders: [String!]
    reviewDate: DateTime
    metadata: JSON
  }

  input ADRFilter {
    status: ADRStatus
    tags: [String!]
    affectedServices: [String!]
  }

  # ============================================================================
  # ROADMAP ITEMS / EPICS
  # ============================================================================

  enum RoadmapItemStatus {
    BACKLOG
    PLANNED
    IN_PROGRESS
    BLOCKED
    COMPLETED
    CANCELLED
  }

  enum RoadmapPriority {
    P0_MUST
    P1_LOVE
    P2_DELIGHT
    P3_NICE
  }

  type UserStory {
    id: ID!
    description: String!
    acceptanceCriteria: [String!]
  }

  type RoadmapItem {
    id: ID!
    epicId: String
    title: String!
    description: String
    status: RoadmapItemStatus!
    priority: RoadmapPriority
    category: String
    quarter: String
    startDate: DateTime
    targetDate: DateTime
    completedDate: DateTime
    owner: String
    team: String
    githubRepo: String
    githubIssues: [String!]
    githubMilestoneUrl: String
    relatedAdrIds: [ID!]
    dependencies: [ID!]
    userStories: [UserStory!]
    acceptanceCriteria: JSON
    verificationHooks: JSON
    evidenceHooks: JSON
    progressPercentage: Int
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String

    # Relations
    relatedAdrs: [ADR!]
    dependentItems: [RoadmapItem!]
  }

  input UserStoryInput {
    description: String!
    acceptanceCriteria: [String!]
  }

  input RoadmapItemInput {
    epicId: String
    title: String!
    description: String
    status: RoadmapItemStatus
    priority: RoadmapPriority
    category: String
    quarter: String
    startDate: DateTime
    targetDate: DateTime
    owner: String
    team: String
    githubRepo: String
    githubIssues: [String!]
    githubMilestoneUrl: String
    relatedAdrIds: [ID!]
    dependencies: [ID!]
    userStories: [UserStoryInput!]
    acceptanceCriteria: JSON
    verificationHooks: JSON
    evidenceHooks: JSON
    metadata: JSON
  }

  input RoadmapItemUpdateInput {
    title: String
    description: String
    status: RoadmapItemStatus
    priority: RoadmapPriority
    category: String
    quarter: String
    startDate: DateTime
    targetDate: DateTime
    completedDate: DateTime
    owner: String
    team: String
    githubIssues: [String!]
    progressPercentage: Int
    metadata: JSON
  }

  input RoadmapItemFilter {
    status: RoadmapItemStatus
    priority: RoadmapPriority
    category: String
    quarter: String
    owner: String
    team: String
  }

  # ============================================================================
  # CUSTOMER REQUESTS / DEMOS
  # ============================================================================

  enum CustomerRequestType {
    DEMO
    FEATURE_REQUEST
    BUG_REPORT
    FEEDBACK
    QUESTION
  }

  enum CustomerRequestPriority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum CustomerRequestStatus {
    NEW
    TRIAGED
    PLANNED
    IN_PROGRESS
    COMPLETED
    WONT_DO
  }

  type CustomerRequest {
    id: ID!
    requestType: CustomerRequestType
    customerName: String!
    customerEmail: String
    customerOrg: String
    title: String!
    description: String
    priority: CustomerRequestPriority
    status: CustomerRequestStatus!
    assignedTo: String
    demoDate: DateTime
    demoRecordingUrl: String
    relatedRoadmapItemId: ID
    githubIssueUrl: String
    salesforceId: String
    tags: [String!]
    estimatedValue: Float
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String

    # Relations
    relatedRoadmapItem: RoadmapItem
  }

  input CustomerRequestInput {
    requestType: CustomerRequestType
    customerName: String!
    customerEmail: String
    customerOrg: String
    title: String!
    description: String
    priority: CustomerRequestPriority
    demoDate: DateTime
    tags: [String!]
    estimatedValue: Float
    metadata: JSON
  }

  input CustomerRequestUpdateInput {
    requestType: CustomerRequestType
    title: String
    description: String
    priority: CustomerRequestPriority
    status: CustomerRequestStatus
    assignedTo: String
    demoDate: DateTime
    demoRecordingUrl: String
    relatedRoadmapItemId: ID
    githubIssueUrl: String
    salesforceId: String
    tags: [String!]
    metadata: JSON
  }

  input CustomerRequestFilter {
    requestType: CustomerRequestType
    status: CustomerRequestStatus
    priority: CustomerRequestPriority
    customerOrg: String
    assignedTo: String
  }

  # ============================================================================
  # DORA METRICS
  # ============================================================================

  type DORAMetrics {
    serviceName: String!
    environment: DeploymentEnvironment!
    avgDeploymentFrequencyPerDay: Float
    totalDeployments90d: Int
    changeFailureRate: Float
    avgMTTRMinutes: Float
    leadTimeMinutes: Float
  }

  # ============================================================================
  # COMPANYOS DASHBOARD SUMMARY
  # ============================================================================

  type CompanyOSDashboard {
    activeIncidents: [Incident!]!
    recentDeployments: [Deployment!]!
    firingAlerts: [Alert!]!
    sloViolations: [SLOViolation!]!
    currentOnCall: [CurrentOnCallUser!]!
    roadmapProgress: [RoadmapItem!]!
    recentPostmortems: [Postmortem!]!
    doraMetrics: DORAMetrics
  }

  # ============================================================================
  # QUERIES
  # ============================================================================

  extend type Query {
    # Incidents
    incident(id: ID!): Incident
    incidents(filter: IncidentFilter, limit: Int = 25, offset: Int = 0): [Incident!]!
    activeIncidents: [Incident!]!

    # Deployments
    deployment(id: ID!): Deployment
    deployments(filter: DeploymentFilter, limit: Int = 25, offset: Int = 0): [Deployment!]!
    deploymentStats(serviceName: String, environment: DeploymentEnvironment, days: Int = 30): [DeploymentStats!]!

    # SLO Violations
    sloViolation(id: ID!): SLOViolation
    sloViolations(serviceName: String, fromDate: DateTime, limit: Int = 25, offset: Int = 0): [SLOViolation!]!
    sloComplianceSummary(serviceName: String, days: Int = 28): [SLOComplianceSummary!]!

    # Alerts
    alert(id: ID!): Alert
    alerts(filter: AlertFilter, limit: Int = 25, offset: Int = 0): [Alert!]!
    firingAlerts: [Alert!]!
    alertMetrics(days: Int = 7): [AlertMetrics!]!

    # Runbooks
    runbook(id: ID!): Runbook
    runbooks(category: String, tags: [String!], limit: Int = 100): [Runbook!]!
    runbookByName(name: String!): Runbook
    runbookExecution(id: ID!): RunbookExecution
    runbookExecutions(runbookId: ID, incidentId: ID, limit: Int = 25): [RunbookExecution!]!

    # On-Call Schedules
    onCallSchedule(id: ID!): OnCallSchedule
    onCallSchedules(filter: OnCallScheduleFilter, limit: Int = 100): [OnCallSchedule!]!
    currentOnCall(teamName: String): [CurrentOnCallUser!]!

    # Postmortems
    postmortem(id: ID!): Postmortem
    postmortems(status: PostmortemStatus, limit: Int = 25, offset: Int = 0): [Postmortem!]!
    postmortemByIncidentId(incidentId: ID!): Postmortem

    # ADRs
    adr(id: ID!): ADR
    adrs(filter: ADRFilter, limit: Int = 100, offset: Int = 0): [ADR!]!
    adrByNumber(adrNumber: Int!): ADR

    # Roadmap Items
    roadmapItem(id: ID!): RoadmapItem
    roadmapItems(filter: RoadmapItemFilter, limit: Int = 100, offset: Int = 0): [RoadmapItem!]!
    roadmapItemByEpicId(epicId: String!): RoadmapItem

    # Customer Requests
    customerRequest(id: ID!): CustomerRequest
    customerRequests(filter: CustomerRequestFilter, limit: Int = 25, offset: Int = 0): [CustomerRequest!]!

    # DORA Metrics
    doraMetrics(serviceName: String, environment: DeploymentEnvironment, days: Int = 90): DORAMetrics

    # Dashboard
    companyOsDashboard: CompanyOSDashboard!
  }

  # ============================================================================
  # MUTATIONS
  # ============================================================================

  extend type Mutation {
    # Incidents
    createIncident(input: IncidentInput!): Incident!
    updateIncident(id: ID!, input: IncidentUpdateInput!): Incident!
    acknowledgeIncident(id: ID!, acknowledgedBy: String!): Incident!
    resolveIncident(id: ID!, rootCause: String): Incident!
    closeIncident(id: ID!): Incident!
    linkIncidentToGithub(id: ID!, githubIssueUrl: String!, githubIssueNumber: Int!): Incident!

    # Deployments
    createDeployment(input: DeploymentInput!): Deployment!
    updateDeployment(id: ID!, input: DeploymentUpdateInput!): Deployment!
    markDeploymentSucceeded(id: ID!): Deployment!
    markDeploymentFailed(id: ID!, errorMessage: String!): Deployment!
    rollbackDeployment(deploymentId: ID!, rolledBackBy: String!): Deployment!

    # SLO Violations
    createSLOViolation(input: SLOViolationInput!): SLOViolation!
    resolveSLOViolation(id: ID!): SLOViolation!
    linkSLOViolationToIncident(violationId: ID!, incidentId: ID!): SLOViolation!

    # Alerts
    createAlert(input: AlertInput!): Alert!
    updateAlert(id: ID!, input: AlertUpdateInput!): Alert!
    acknowledgeAlert(id: ID!, acknowledgedBy: String!): Alert!
    resolveAlert(id: ID!): Alert!
    silenceAlert(id: ID!): Alert!
    linkAlertToIncident(alertId: ID!, incidentId: ID!): Alert!

    # Runbooks
    createRunbook(input: RunbookInput!): Runbook!
    updateRunbook(id: ID!, input: RunbookInput!): Runbook!
    syncRunbooksFromFiles: [Runbook!]! # Sync runbooks from RUNBOOKS/ directory

    # Runbook Executions
    createRunbookExecution(input: RunbookExecutionInput!): RunbookExecution!
    updateRunbookExecution(id: ID!, input: RunbookExecutionUpdateInput!): RunbookExecution!
    completeRunbookExecution(id: ID!, outcome: String): RunbookExecution!
    failRunbookExecution(id: ID!, errorMessage: String!): RunbookExecution!

    # On-Call Schedules
    createOnCallSchedule(input: OnCallScheduleInput!): OnCallSchedule!
    updateOnCallSchedule(id: ID!, input: OnCallScheduleInput!): OnCallSchedule!
    deleteOnCallSchedule(id: ID!): Boolean!

    # Postmortems
    createPostmortem(input: PostmortemInput!): Postmortem!
    updatePostmortem(id: ID!, input: PostmortemUpdateInput!): Postmortem!
    publishPostmortem(id: ID!): Postmortem!

    # ADRs
    createADR(input: ADRInput!): ADR!
    updateADR(id: ID!, input: ADRUpdateInput!): ADR!
    syncADRsFromFiles: [ADR!]! # Sync ADRs from adr/ directory

    # Roadmap Items
    createRoadmapItem(input: RoadmapItemInput!): RoadmapItem!
    updateRoadmapItem(id: ID!, input: RoadmapItemUpdateInput!): RoadmapItem!
    syncRoadmapFromBacklog: [RoadmapItem!]! # Sync from backlog.json/yaml

    # Customer Requests
    createCustomerRequest(input: CustomerRequestInput!): CustomerRequest!
    updateCustomerRequest(id: ID!, input: CustomerRequestUpdateInput!): CustomerRequest!

    # AI-Powered Operations
    generatePostmortemDraft(incidentId: ID!): Postmortem!
    suggestRunbookForAlert(alertId: ID!): Runbook
    analyzeIncidentPattern(incidentIds: [ID!]!): JSON
    suggestIncidentRemediation(incidentId: ID!): JSON
  }

  # ============================================================================
  # SUBSCRIPTIONS
  # ============================================================================

  extend type Subscription {
    incidentCreated: Incident!
    incidentUpdated(id: ID): Incident!
    alertFired: Alert!
    deploymentCompleted: Deployment!
    sloViolationTriggered: SLOViolation!
  }
`;
