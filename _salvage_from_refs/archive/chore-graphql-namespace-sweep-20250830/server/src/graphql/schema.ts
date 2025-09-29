export const typeDefs = `
  type Query {
    hello: String
    health: String
    graphData(investigationId: ID!): GraphData
    searchEntities(query: String!, limit: Int = 10): [Node!]!
    getEntityDetails(entityId: ID!): Node
    getInvestigations: [Investigation!]!
    serverStats: ServerStats!
    
    # Advanced Intelligence Queries
    threatAnalysis(entityId: ID!): ThreatAnalysis!
    timelineEvents(investigationId: ID!, startDate: String, endDate: String): [TimelineEvent!]!
    entityEnrichment(entityId: ID!): EnrichmentData!
    correlateEntities(entityIds: [ID!]!): CorrelationResult!
    attackPathways(sourceId: ID!, targetId: ID!): [AttackPath!]!
    riskAssessment(investigationId: ID!): RiskAssessment!
    
    # AI/ML Analysis Queries
    clusterEntities(investigationId: ID!): [EntityCluster!]!
    detectAnomalies(investigationId: ID!): [AnomalyDetection!]!
    predictRelationships(entityId: ID!, candidateIds: [ID!]!): [RelationshipPrediction!]!
    calculateRiskScore(entityId: ID!): MLPrediction!
    analyzeGraphMetrics(investigationId: ID!): GraphMetrics!
    analyzeBehavioralPatterns(entityId: ID!): BehavioralAnalysis!
    
    # Real-time Collaboration Queries
    getActiveUsers(investigationId: ID!): [UserPresence!]!
    getPendingEdits(investigationId: ID!): [CollaborativeEdit!]!
    getComments(investigationId: ID!, entityId: ID): [Comment!]!
    getNotifications(investigationId: ID!, limit: Int = 20): [LiveNotification!]!
    getCollaborationStats: CollaborationStats!
    
    # Investigation Workflow Queries
    getInvestigation(investigationId: ID!): InvestigationDetail
    getAllInvestigations: [InvestigationSummary!]!
    getInvestigationsByStatus(status: InvestigationStatus!): [InvestigationSummary!]!
    getAssignedInvestigations(userId: ID!): [InvestigationSummary!]!
    getInvestigationTemplates: [InvestigationTemplate!]!
    getWorkflowStatistics: WorkflowStatistics!
    
    # Performance Analytics Queries
    getPerformanceReport: PerformanceReport!
    getPerformanceMetrics(timeRange: String): [PerformanceMetric!]!
    getCacheStrategies: [CacheStrategy!]!
    getQueryOptimizations: [QueryOptimization!]!
    getConnectionPoolStatus: [ConnectionPool!]!
    
    # Analytics Dashboard Queries
    getDashboardConfig: DashboardConfig!
    getWidget(widgetId: ID!): DashboardWidget
    getChart(chartId: ID!): ChartData
    getAnalyticsReport(reportId: ID!): AnalyticsReport
    getThreatMetrics: ThreatIntelMetrics!
    getInvestigationMetrics: InvestigationAnalyticsMetrics!
    getGeoThreatData: GeoThreatData!
  }
  
  type Mutation {
    # Collaboration Mutations
    joinInvestigation(investigationId: ID!, userInfo: UserInput!): UserPresence!
    leaveInvestigation(investigationId: ID!): Boolean!
    updatePresence(investigationId: ID!, updates: PresenceInput!): UserPresence!
    submitEdit(edit: EditInput!): CollaborativeEdit!
    resolveEdit(editId: ID!, status: EditStatus!): CollaborativeEdit!
    addComment(comment: CommentInput!): Comment!
    resolveComment(commentId: ID!): Comment!
    
    # Investigation Workflow Mutations
    createInvestigation(templateId: ID!, data: InvestigationInput!): InvestigationDetail!
    advanceWorkflowStage(investigationId: ID!, notes: String): InvestigationDetail!
    addEvidence(investigationId: ID!, evidence: EvidenceInput!): InvestigationDetail!
    addFinding(investigationId: ID!, finding: FindingInput!): InvestigationDetail!
    addTimelineEntry(investigationId: ID!, entry: TimelineEntryInput!): InvestigationDetail!
    
    # Performance Optimization Mutations
    optimizeQuery(queryType: QueryType!, query: String!): QueryOptimization!
    implementCacheWarming: Boolean!
    implementDataCompression: Boolean!
    
    # Analytics Dashboard Mutations
    createWidget(widget: DashboardWidgetInput!): DashboardWidget!
    updateWidget(widgetId: ID!, updates: DashboardWidgetInput!): DashboardWidget!
    deleteWidget(widgetId: ID!): Boolean!
    createAnalyticsReport(report: AnalyticsReportInput!): AnalyticsReport!
    generateReport(reportId: ID!): ReportExport!
    exportDashboard(format: ExportFormat!): DashboardExport!
  }
  
  type Subscription {
    # Real-time Subscriptions
    userPresenceUpdated(investigationId: ID!): UserPresence!
    editSubmitted(investigationId: ID!): CollaborativeEdit!
    commentAdded(investigationId: ID!): Comment!
    liveNotification(investigationId: ID!): LiveNotification!
  }
  
  type Investigation {
    id: ID!
    name: String!
    description: String
    status: String!
    createdAt: String!
    nodeCount: Int!
    edgeCount: Int!
  }
  
  type ServerStats {
    uptime: String!
    totalInvestigations: Int!
    totalEntities: Int!
    totalRelationships: Int!
    databaseStatus: DatabaseStatus!
  }
  
  type DatabaseStatus {
    redis: String!
    postgres: String!
    neo4j: String!
  }
  
  type GraphData {
    nodes: [Node!]!
    edges: [Edge!]!
    nodeCount: Int!
    edgeCount: Int!
  }
  
  type Node {
    id: ID!
    type: String!
    label: String!
    description: String
    properties: JSON
    confidence: Float
    source: String
    investigationId: ID
    createdBy: String
    updatedBy: String
    createdAt: String!
    updatedAt: String!
    attack_ttps: [String]
    capec_ttps: [String]
    triage_score: Float
    actor_links: [String]
  }
  
  type Edge {
    id: ID!
    type: String!
    label: String!
    description: String
    properties: JSON
    confidence: Float
    source: String
    fromEntityId: ID!
    toEntityId: ID!
    investigationId: ID
    createdBy: String
    updatedBy: String
    since: String
    until: String
    createdAt: String!
    updatedAt: String!
    attack_ttps: [String]
    capec_ttps: [String]
  }

  # Advanced Intelligence Types
  type ThreatAnalysis {
    entityId: ID!
    riskScore: Float!
    threatLevel: String!
    mitreAttacks: [MitreAttack!]!
    vulnerabilities: [Vulnerability!]!
    recommendations: [String!]!
    lastUpdated: String!
  }

  type MitreAttack {
    technique: String!
    tactic: String!
    description: String!
    severity: String!
    confidence: Float!
  }

  type Vulnerability {
    cve: String!
    severity: String!
    description: String!
    exploitable: Boolean!
    patchAvailable: Boolean!
  }

  type TimelineEvent {
    id: ID!
    timestamp: String!
    eventType: String!
    entityId: ID!
    description: String!
    severity: String!
    source: String!
    metadata: JSON
  }

  type EnrichmentData {
    entityId: ID!
    externalSources: [ExternalSource!]!
    geolocation: Geolocation
    reputation: ReputationData!
    relatedEntities: [Node!]!
    lastEnriched: String!
  }

  type ExternalSource {
    source: String!
    data: JSON!
    confidence: Float!
    lastUpdated: String!
  }

  type Geolocation {
    country: String
    city: String
    latitude: Float
    longitude: Float
    accuracy: Float
  }

  type ReputationData {
    score: Float!
    category: String!
    sources: [String!]!
    lastChecked: String!
  }

  type CorrelationResult {
    correlationScore: Float!
    commonAttributes: [String!]!
    sharedConnections: [Node!]!
    temporalOverlap: Boolean!
    recommendations: [String!]!
  }

  type AttackPath {
    id: ID!
    sourceId: ID!
    targetId: ID!
    steps: [AttackStep!]!
    difficulty: String!
    likelihood: Float!
    mitigations: [String!]!
  }

  type AttackStep {
    step: Int!
    technique: String!
    description: String!
    requirements: [String!]!
    detection: [String!]!
  }

  type RiskAssessment {
    investigationId: ID!
    overallRisk: Float!
    riskFactors: [RiskFactor!]!
    mitreMatrix: [MitreMatrixEntry!]!
    timeline: [RiskTimelineEntry!]!
    recommendations: [String!]!
  }

  type RiskFactor {
    factor: String!
    impact: Float!
    likelihood: Float!
    description: String!
  }

  type MitreMatrixEntry {
    tactic: String!
    techniques: [String!]!
    coverage: Float!
  }

  type RiskTimelineEntry {
    timestamp: String!
    riskLevel: Float!
    events: [String!]!
  }

  # AI/ML Analysis Types
  type EntityCluster {
    id: ID!
    entities: [ID!]!
    centerEntity: ID!
    similarity_score: Float!
    cluster_type: String!
    characteristics: [String!]!
  }

  type AnomalyDetection {
    entity_id: ID!
    anomaly_type: String!
    severity: Float!
    description: String!
    baseline_deviation: Float!
    contributing_factors: [String!]!
    timestamp: String!
  }

  type RelationshipPrediction {
    target_entity: ID!
    predicted_relationship: String!
    confidence: Float!
    reasoning: [String!]!
  }

  type MLPrediction {
    confidence: Float!
    reasoning: [String!]!
    probability: Float!
    risk_level: String!
  }

  type GraphMetrics {
    centrality_scores: JSON!
    clustering_coefficient: Float!
    average_path_length: Float!
    network_density: Float!
    community_modularity: Float!
    influence_scores: JSON!
  }

  type BehavioralAnalysis {
    patterns: [BehavioralPattern!]!
    behavioral_score: Float!
    pattern_stability: Float!
  }

  type BehavioralPattern {
    pattern_type: String!
    description: String!
    confidence: Float!
    frequency: Float!
    time_window: String!
  }

  # Real-time Collaboration Types
  type UserPresence {
    userId: ID!
    investigationId: ID!
    currentPage: String!
    cursorPosition: CursorPosition
    selectedEntityId: ID
    timestamp: String!
    userInfo: User!
  }

  type User {
    id: ID!
    name: String!
    email: String!
    avatar: String
    role: String!
    isActive: Boolean!
    lastSeen: String!
  }

  type CursorPosition {
    x: Float!
    y: Float!
  }

  type CollaborativeEdit {
    id: ID!
    userId: ID!
    investigationId: ID!
    entityId: ID!
    editType: EditType!
    changes: JSON!
    timestamp: String!
    status: EditStatus!
    user: User!
  }

  type Comment {
    id: ID!
    userId: ID!
    investigationId: ID!
    entityId: ID
    content: String!
    position: CursorPosition
    timestamp: String!
    replies: [Comment!]!
    resolved: Boolean!
    user: User!
  }

  type LiveNotification {
    id: ID!
    type: NotificationType!
    userId: ID!
    investigationId: ID!
    message: String!
    timestamp: String!
    metadata: JSON
    user: User!
  }

  type CollaborationStats {
    activeUsers: Int!
    activeInvestigations: Int!
    pendingEdits: Int!
    totalComments: Int!
    recentNotifications: Int!
  }

  # Input Types
  input UserInput {
    name: String!
    email: String!
    avatar: String
    role: String!
  }

  input PresenceInput {
    currentPage: String
    cursorPosition: CursorPositionInput
    selectedEntityId: ID
  }

  input CursorPositionInput {
    x: Float!
    y: Float!
  }

  input EditInput {
    investigationId: ID!
    entityId: ID!
    editType: EditType!
    changes: JSON!
  }

  input CommentInput {
    investigationId: ID!
    entityId: ID
    content: String!
    position: CursorPositionInput
  }

  # Enums
  enum EditType {
    CREATE
    UPDATE
    DELETE
    MOVE
  }

  enum EditStatus {
    PENDING
    APPLIED
    REJECTED
  }

  enum NotificationType {
    USER_JOINED
    USER_LEFT
    ENTITY_UPDATED
    COMMENT_ADDED
    EDIT_CONFLICT
  }
  
  # Investigation Workflow Types
  type InvestigationSummary {
    id: ID!
    name: String!
    description: String
    status: InvestigationStatus!
    priority: Priority!
    assignedTo: [String!]!
    createdBy: String!
    createdAt: String!
    updatedAt: String!
    dueDate: String
    tags: [String!]!
    classification: SecurityClassification!
    currentStage: WorkflowStageType!
    entityCount: Int!
    evidenceCount: Int!
    findingCount: Int!
  }

  type InvestigationDetail {
    id: ID!
    name: String!
    description: String
    status: InvestigationStatus!
    priority: Priority!
    assignedTo: [String!]!
    createdBy: String!
    createdAt: String!
    updatedAt: String!
    dueDate: String
    tags: [String!]!
    classification: SecurityClassification!
    workflow: WorkflowStage!
    entities: [String!]!
    relationships: [String!]!
    evidence: [Evidence!]!
    findings: [Finding!]!
    timeline: [TimelineEventEntry!]!
    collaborators: [String!]!
    permissions: [InvestigationPermission!]!
  }

  type WorkflowStage {
    currentStage: WorkflowStageType!
    stages: JSON!
  }

  type Evidence {
    id: ID!
    type: EvidenceType!
    title: String!
    description: String!
    source: String!
    collectedAt: String!
    collectedBy: String!
    integrity: IntegrityStatus!
    chainOfCustody: [ChainOfCustodyEntry!]!
    attachments: [String!]!
    metadata: JSON
    classification: SecurityClassification!
  }

  type ChainOfCustodyEntry {
    timestamp: String!
    custodian: String!
    action: CustodyAction!
    location: String!
    notes: String
    integrity: IntegrityStatus!
  }

  type Finding {
    id: ID!
    title: String!
    description: String!
    severity: Severity!
    confidence: Float!
    category: FindingCategory!
    relatedEntities: [String!]!
    evidence: [String!]!
    recommendations: [String!]!
    status: FindingStatus!
    discoveredAt: String!
    discoveredBy: String!
    verifiedBy: String
    verifiedAt: String
    mitigatedAt: String
  }

  type TimelineEventEntry {
    id: ID!
    timestamp: String!
    eventType: EventType!
    title: String!
    description: String!
    actor: String!
    target: String
    sourceIp: String
    destinationIp: String
    relatedEntities: [String!]!
    evidence: [String!]!
    severity: Severity!
    confidence: Float!
    metadata: JSON
  }

  type InvestigationPermission {
    userId: String!
    role: InvestigationRole!
    permissions: [PermissionType!]!
    grantedBy: String!
    grantedAt: String!
  }

  type InvestigationTemplate {
    id: ID!
    name: String!
    description: String!
    category: String!
    workflowStages: [WorkflowStageType!]!
    requiredFields: [String!]!
    defaultTags: [String!]!
    defaultClassification: SecurityClassification!
    estimatedDuration: Int!
    slaHours: Int!
  }

  type WorkflowStatistics {
    total: Int!
    byStatus: JSON!
    byPriority: JSON!
    byStage: JSON!
    overdueSLA: Int!
  }

  # Investigation Input Types
  input InvestigationInput {
    name: String!
    description: String
    priority: Priority!
    assignedTo: [String!]!
    classification: SecurityClassification
    tags: [String!]
    dueDate: String
  }

  input EvidenceInput {
    type: EvidenceType!
    title: String!
    description: String!
    source: String!
    attachments: [String!]
    metadata: JSON
    classification: SecurityClassification!
  }

  input FindingInput {
    title: String!
    description: String!
    severity: Severity!
    confidence: Float!
    category: FindingCategory!
    relatedEntities: [String!]!
    evidence: [String!]!
    recommendations: [String!]!
    status: FindingStatus!
  }

  input TimelineEntryInput {
    timestamp: String!
    eventType: EventType!
    title: String!
    description: String!
    actor: String!
    target: String
    sourceIp: String
    destinationIp: String
    relatedEntities: [String!]!
    evidence: [String!]!
    severity: Severity!
    confidence: Float!
    metadata: JSON
  }

  # Investigation Enums
  enum InvestigationStatus {
    DRAFT
    ACTIVE
    ON_HOLD
    ESCALATED
    RESOLVED
    CLOSED
    ARCHIVED
  }

  enum Priority {
    LOW
    MEDIUM
    HIGH
    CRITICAL
    EMERGENCY
  }

  enum SecurityClassification {
    PUBLIC
    INTERNAL
    CONFIDENTIAL
    SECRET
    TOP_SECRET
  }

  enum WorkflowStageType {
    INTAKE
    TRIAGE
    INVESTIGATION
    ANALYSIS
    CONTAINMENT
    ERADICATION
    RECOVERY
    LESSONS_LEARNED
  }

  enum EvidenceType {
    DIGITAL_ARTIFACT
    NETWORK_LOG
    SYSTEM_LOG
    EMAIL
    DOCUMENT
    IMAGE
    VIDEO
    AUDIO
    TESTIMONY
    PHYSICAL
  }

  enum Severity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum FindingCategory {
    MALWARE
    PHISHING
    DATA_BREACH
    INSIDER_THREAT
    APT
    FRAUD
    POLICY_VIOLATION
    VULNERABILITY
    MISCONFIGURATION
  }

  enum FindingStatus {
    DRAFT
    UNDER_REVIEW
    CONFIRMED
    FALSE_POSITIVE
    MITIGATED
    RESOLVED
  }

  enum EventType {
    LOGIN
    LOGOUT
    FILE_ACCESS
    NETWORK_CONNECTION
    PROCESS_EXECUTION
    EMAIL_SENT
    DNS_QUERY
    HTTP_REQUEST
    MALWARE_DETECTION
    ALERT_TRIGGERED
  }

  enum IntegrityStatus {
    VERIFIED
    COMPROMISED
    UNKNOWN
    CORRUPTED
  }

  enum CustodyAction {
    COLLECTED
    TRANSFERRED
    ANALYZED
    STORED
    ARCHIVED
    DISPOSED
  }

  enum InvestigationRole {
    LEAD
    ANALYST
    REVIEWER
    OBSERVER
    STAKEHOLDER
  }

  enum PermissionType {
    READ
    write
    delete
    assign
    close
    archive
    manage_evidence
    manage_permissions
  }

  scalar JSON

  # Performance Optimization Types
  type PerformanceReport {
    timestamp: String!
    metrics: SystemMetrics!
    cacheStrategies: [CacheStrategy!]!
    connectionPools: [ConnectionPool!]!
    slowQueries: [QueryOptimization!]!
    systemHealth: SystemHealth!
  }

  type PerformanceMetric {
    id: ID!
    timestamp: String!
    endpoint: String!
    responseTime: Float!
    memoryUsage: Float!
    cpuUsage: Float!
    cacheHitRate: Float!
    concurrentUsers: Int!
    status: MetricStatus!
  }

  type SystemMetrics {
    totalRequests: Int!
    avgResponseTime: Float!
    errorRate: Float!
    cacheHitRate: Float!
    concurrentUsers: Int!
  }

  type CacheStrategy {
    id: ID!
    name: String!
    pattern: String!
    ttl: Int!
    priority: CachePriority!
    compressionEnabled: Boolean!
    prefetchEnabled: Boolean!
  }

  type QueryOptimization {
    id: ID!
    queryType: QueryType!
    originalQuery: String!
    optimizedQuery: String!
    executionTime: Float!
    improvement: Float!
    indexRecommendations: [String!]!
  }

  type ConnectionPool {
    id: ID!
    type: DatabaseType!
    maxConnections: Int!
    activeConnections: Int!
    idleConnections: Int!
    avgResponseTime: Float!
    errorRate: Float!
  }

  type SystemHealth {
    memoryUsage: MemoryUsage!
    uptime: Float!
  }

  type MemoryUsage {
    heapUsed: Float!
    heapTotal: Float!
    external: Float!
    arrayBuffers: Float!
  }

  # Analytics Dashboard Types
  type DashboardConfig {
    widgets: [DashboardWidget!]!
    charts: [ChartData!]!
    reports: [AnalyticsReport!]!
    metadata: DashboardMetadata!
  }

  type DashboardWidget {
    id: ID!
    title: String!
    type: WidgetType!
    config: JSON!
    position: WidgetPosition!
    refreshInterval: Int!
    dataSource: String!
    filters: JSON!
    permissions: [String!]!
  }

  type WidgetPosition {
    x: Int!
    y: Int!
    width: Int!
    height: Int!
  }

  type ChartData {
    id: ID!
    type: ChartType!
    title: String!
    data: JSON!
    options: JSON!
    metadata: ChartMetadata!
  }

  type ChartMetadata {
    lastUpdated: String!
    dataPoints: Int!
    refreshRate: Int!
  }

  type AnalyticsReport {
    id: ID!
    name: String!
    description: String!
    category: ReportCategory!
    widgets: [String!]!
    schedule: ReportSchedule!
    recipients: [String!]!
    format: ReportFormat!
    createdBy: String!
    createdAt: String!
  }

  type DashboardMetadata {
    lastUpdated: String!
    totalWidgets: Int!
    totalCharts: Int!
    totalReports: Int!
  }

  type ThreatIntelMetrics {
    totalIOCs: Int!
    activeThreats: Int!
    resolvedThreats: Int!
    threatSeverityDistribution: JSON!
    topThreatTypes: [ThreatTypeCount!]!
    geographicDistribution: [GeoThreatData!]!
    timeSeriesData: [TimeSeriesPoint!]!
  }

  type ThreatTypeCount {
    type: String!
    count: Int!
  }

  type InvestigationAnalyticsMetrics {
    totalInvestigations: Int!
    activeInvestigations: Int!
    completedInvestigations: Int!
    avgCompletionTime: Float!
    investigationsByStatus: JSON!
    evidenceMetrics: EvidenceMetrics!
    findingsMetrics: FindingsMetrics!
  }

  type EvidenceMetrics {
    totalEvidence: Int!
    evidenceByType: JSON!
  }

  type FindingsMetrics {
    totalFindings: Int!
    findingsBySeverity: JSON!
  }

  type GeoThreatData {
    country: String
    lat: Float
    lng: Float
    threatCount: Int!
    weight: Float
  }

  type TimeSeriesPoint {
    timestamp: String!
    value: Float!
    label: String
  }

  type ReportExport {
    reportId: ID!
    format: ReportFormat!
    url: String!
    generatedAt: String!
  }

  type DashboardExport {
    format: ExportFormat!
    filename: String!
    size: String!
    pages: Int
    url: String!
  }

  # Input Types
  input DashboardWidgetInput {
    title: String!
    type: WidgetType!
    config: JSON!
    position: WidgetPositionInput!
    refreshInterval: Int!
    dataSource: String!
    filters: JSON
    permissions: [String!]
  }

  input WidgetPositionInput {
    x: Int!
    y: Int!
    width: Int!
    height: Int!
  }

  input AnalyticsReportInput {
    name: String!
    description: String!
    category: ReportCategory!
    widgets: [String!]!
    schedule: ReportSchedule!
    recipients: [String!]!
    format: ReportFormat!
    createdBy: String!
  }

  # Enums for Performance and Analytics
  enum MetricStatus {
    SUCCESS
    ERROR
    TIMEOUT
  }

  enum CachePriority {
    HIGH
    MEDIUM
    LOW
  }

  enum QueryType {
    GRAPHQL
    CYPHER
    SQL
  }

  enum DatabaseType {
    POSTGRESQL
    NEO4J
    REDIS
  }

  enum WidgetType {
    CHART
    METRIC
    TABLE
    MAP
    TIMELINE
    NETWORK
  }

  enum ChartType {
    LINE
    BAR
    PIE
    SCATTER
    HEATMAP
    SANKEY
    TREEMAP
  }

  enum ReportCategory {
    THREAT
    INVESTIGATION
    PERFORMANCE
    COLLABORATION
    SECURITY
  }

  enum ReportSchedule {
    REALTIME
    HOURLY
    DAILY
    WEEKLY
    MONTHLY
  }

  enum ReportFormat {
    DASHBOARD
    PDF
    EXCEL
    JSON
  }

  enum ExportFormat {
    JSON
    PDF
  }
`;
