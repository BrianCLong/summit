/**
 * GraphQL Schema for Agentic Mesh Evaluation
 */

export const graphqlSchema = `#graphql
  # ===========================================================================
  # Scalars
  # ===========================================================================

  scalar DateTime
  scalar JSON

  # ===========================================================================
  # Mesh Types
  # ===========================================================================

  type Mesh {
    id: ID!
    name: String!
    description: String
    topology: MeshTopology!
    nodes: [MeshNode!]!
    edges: [MeshEdge!]!
    config: MeshConfig!
    status: MeshStatus!
    phase: MeshPhase!
    metrics: MeshMetrics!
    policies: [MeshPolicy!]!
    tenantId: String!
    projectId: String
    ownerId: String!
    tags: [String!]!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    deletedAt: DateTime
  }

  enum MeshTopology {
    PEER_TO_PEER
    HIERARCHICAL
    HYBRID
    STAR
    RING
    GRID
    CUSTOM
  }

  enum MeshStatus {
    INITIALIZING
    HEALTHY
    DEGRADED
    CRITICAL
    OFFLINE
  }

  enum MeshPhase {
    SETUP
    DISCOVERY
    FORMATION
    OPERATIONAL
    EVALUATION
    OPTIMIZATION
    TEARDOWN
  }

  type MeshNode {
    id: ID!
    name: String!
    agentId: String!
    role: AgentRole!
    status: AgentStatus!
    capabilities: [String!]!
    specializations: [String!]!
    maxConcurrentTasks: Int!
    endpoint: String!
    protocol: [String!]!
    neighbors: [String!]!
    performanceMetrics: NodePerformanceMetrics!
    resourceUtilization: ResourceUtilization!
    healthStatus: HealthStatus!
    lastHeartbeat: DateTime!
    uptime: Int!
    version: String!
    tags: [String!]!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  enum AgentRole {
    COORDINATOR
    WORKER
    SPECIALIST
    MONITOR
    VALIDATOR
    OPTIMIZER
    FALLBACK
  }

  enum AgentStatus {
    INITIALIZING
    READY
    BUSY
    IDLE
    DEGRADED
    FAILED
    OFFLINE
  }

  type NodePerformanceMetrics {
    tasksCompleted: Int!
    tasksSuccessful: Int!
    tasksFailed: Int!
    averageLatencyMs: Float!
    p95LatencyMs: Float!
    p99LatencyMs: Float!
    throughputPerSecond: Float!
    errorRate: Float!
    successRate: Float!
    qualityScore: Float!
  }

  type ResourceUtilization {
    cpuPercent: Float!
    memoryPercent: Float!
    diskPercent: Float!
    networkBytesPerSecond: Float!
    queueDepth: Int!
    activeConnections: Int!
  }

  type HealthStatus {
    overall: HealthLevel!
    checks: [HealthCheck!]!
    lastCheckAt: DateTime!
  }

  enum HealthLevel {
    HEALTHY
    DEGRADED
    UNHEALTHY
    CRITICAL
  }

  type HealthCheck {
    name: String!
    status: HealthCheckStatus!
    message: String
    timestamp: DateTime!
  }

  enum HealthCheckStatus {
    PASS
    WARN
    FAIL
  }

  type MeshEdge {
    id: ID!
    sourceId: String!
    targetId: String!
    protocol: String!
    bidirectional: Boolean!
    weight: Float!
    latencyMs: Float!
    bandwidth: Float!
    reliability: Float!
    metadata: JSON
  }

  type MeshConfig {
    maxHops: Int!
    messageTTL: Int!
    timeoutMs: Int!
    loadBalancingStrategy: LoadBalancingStrategy!
    enableFailover: Boolean!
    redundancyFactor: Int!
    healthCheckIntervalMs: Int!
    enableMetrics: Boolean!
    enableTracing: Boolean!
    enableLogging: Boolean!
  }

  enum LoadBalancingStrategy {
    ROUND_ROBIN
    LEAST_LOADED
    RANDOM
    WEIGHTED
    CONSISTENT_HASHING
    CAPABILITY_BASED
  }

  type MeshPolicy {
    id: ID!
    name: String!
    type: PolicyType!
    enforcement: PolicyEnforcement!
    priority: Int!
    enabled: Boolean!
  }

  enum PolicyType {
    ACCESS_CONTROL
    RESOURCE_LIMIT
    DATA_GOVERNANCE
    SECURITY
    COMPLIANCE
    PERFORMANCE
  }

  enum PolicyEnforcement {
    ADVISORY
    ENFORCING
    BLOCKING
  }

  type MeshMetrics {
    totalNodes: Int!
    activeNodes: Int!
    healthyNodes: Int!
    degradedNodes: Int!
    failedNodes: Int!
    totalEdges: Int!
    averageConnectivity: Float!
    networkDiameter: Int!
    clusteringCoefficient: Float!
    aggregateMetrics: AggregateMetrics!
    messageStats: MessageStats!
    resourceStats: ResourceStats!
    qualityMetrics: QualityMetrics!
    timestamp: DateTime!
  }

  type AggregateMetrics {
    totalTasksCompleted: Int!
    totalTasksSuccessful: Int!
    totalTasksFailed: Int!
    averageLatencyMs: Float!
    p50LatencyMs: Float!
    p95LatencyMs: Float!
    p99LatencyMs: Float!
    totalThroughput: Float!
    errorRate: Float!
    successRate: Float!
  }

  type MessageStats {
    totalSent: Int!
    totalReceived: Int!
    totalDropped: Int!
    totalRetried: Int!
    averageSize: Float!
    averageDeliveryTimeMs: Float!
    messageBacklog: Int!
  }

  type ResourceStats {
    averageCpuPercent: Float!
    averageMemoryPercent: Float!
    totalNetworkBytesPerSecond: Float!
    bottleneckNodes: [String!]!
  }

  type QualityMetrics {
    dataQuality: Float!
    serviceQuality: Float!
    userSatisfaction: Float!
    complianceScore: Float!
  }

  # ===========================================================================
  # Evaluation Types
  # ===========================================================================

  type Evaluation {
    id: ID!
    meshId: String!
    scenario: EvaluationScenario!
    scenarioParams: JSON
    status: EvaluationStatus!
    phase: EvaluationPhase!
    startedAt: DateTime!
    completedAt: DateTime
    durationMs: Int
    results: EvaluationResults!
    baselineId: String
    comparisonIds: [String!]!
    triggeredBy: String!
    triggerType: TriggerType!
    tags: [String!]!
    metadata: JSON
    createdAt: DateTime!
  }

  enum EvaluationScenario {
    PERFORMANCE_BASELINE
    LOAD_TESTING
    STRESS_TESTING
    FAULT_INJECTION
    CHAOS_ENGINEERING
    SCALABILITY_TESTING
    SECURITY_TESTING
    COMPLIANCE_TESTING
    OPTIMIZATION
    CUSTOM
  }

  enum EvaluationStatus {
    PENDING
    INITIALIZING
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
    TIMEOUT
  }

  enum EvaluationPhase {
    SETUP
    WARMUP
    EXECUTION
    COOLDOWN
    ANALYSIS
    REPORTING
  }

  enum TriggerType {
    MANUAL
    SCHEDULED
    AUTOMATED
    CI_CD
  }

  type EvaluationResults {
    passed: Boolean!
    score: Float!
    grade: Grade!
    metrics: EvaluationMetrics!
    findings: [Finding!]!
    recommendations: [Recommendation!]!
    benchmarks: [Benchmark!]!
    comparison: ComparisonResults
    artifacts: [Artifact!]!
  }

  enum Grade {
    A_PLUS
    A
    B
    C
    D
    F
  }

  type EvaluationMetrics {
    performance: PerformanceMetrics!
    reliability: ReliabilityMetrics!
    scalability: ScalabilityMetrics!
    efficiency: EfficiencyMetrics!
    security: SecurityMetrics!
    compliance: ComplianceMetrics!
  }

  type PerformanceMetrics {
    latency: LatencyMetrics!
    throughput: ThroughputMetrics!
    responseTime: ResponseTimeMetrics!
  }

  type LatencyMetrics {
    min: Float!
    max: Float!
    mean: Float!
    median: Float!
    p95: Float!
    p99: Float!
    p999: Float!
    stdDev: Float!
  }

  type ThroughputMetrics {
    requestsPerSecond: Float!
    tasksPerSecond: Float!
    messagesPerSecond: Float!
    bytesPerSecond: Float!
  }

  type ResponseTimeMetrics {
    average: Float!
    fastest: Float!
    slowest: Float!
    distribution: JSON!
  }

  type ReliabilityMetrics {
    uptime: Float!
    availability: Float!
    mtbf: Float!
    mttr: Float!
    errorRate: Float!
    successRate: Float!
    failureRate: Float!
  }

  type ScalabilityMetrics {
    maxConcurrentTasks: Int!
    horizontalScalability: Float!
    verticalScalability: Float!
    elasticity: Float!
    efficiency: Float!
  }

  type EfficiencyMetrics {
    resourceUtilization: Float!
    costPerTask: Float!
    energyEfficiency: Float!
    wasteRatio: Float!
  }

  type SecurityMetrics {
    vulnerabilities: Int!
    criticalVulnerabilities: Int!
    authenticationFailures: Int!
    authorizationFailures: Int!
    encryptionCoverage: Float!
    securityScore: Float!
  }

  type ComplianceMetrics {
    policyViolations: Int!
    criticalViolations: Int!
    complianceRate: Float!
    auditCoverage: Float!
    certificationStatus: CertificationStatus!
  }

  enum CertificationStatus {
    CERTIFIED
    PENDING
    FAILED
  }

  type Finding {
    id: ID!
    severity: Severity!
    category: FindingCategory!
    title: String!
    description: String!
    impact: String!
    evidence: JSON!
    affectedNodes: [String!]!
    timestamp: DateTime!
  }

  enum Severity {
    CRITICAL
    HIGH
    MEDIUM
    LOW
    INFO
  }

  enum FindingCategory {
    PERFORMANCE
    RELIABILITY
    SECURITY
    COMPLIANCE
    EFFICIENCY
    SCALABILITY
  }

  type Recommendation {
    id: ID!
    priority: Priority!
    category: String!
    title: String!
    description: String!
    rationale: String!
    implementation: String!
    estimatedImpact: String!
    estimatedEffort: String!
    relatedFindings: [String!]!
  }

  enum Priority {
    CRITICAL
    HIGH
    MEDIUM
    LOW
  }

  type Benchmark {
    name: String!
    metric: String!
    value: Float!
    unit: String!
    baseline: Float
    target: Float
    passed: Boolean!
    percentageDifference: Float
  }

  type ComparisonResults {
    baselineId: String!
    improvements: [ComparisonItem!]!
    regressions: [ComparisonItem!]!
    unchanged: [ComparisonItem!]!
    summary: String!
  }

  type ComparisonItem {
    metric: String!
    baseline: Float!
    current: Float!
    difference: Float!
    percentageChange: Float!
    significance: Significance!
  }

  enum Significance {
    MAJOR
    MODERATE
    MINOR
    NEGLIGIBLE
  }

  type Artifact {
    id: ID!
    type: ArtifactType!
    name: String!
    description: String
    url: String!
    size: Int!
    mimeType: String!
    metadata: JSON
    createdAt: DateTime!
  }

  enum ArtifactType {
    REPORT
    DATASET
    VISUALIZATION
    TRACE
    LOGS
    METRICS
    RECORDING
    CONFIGURATION
  }

  # ===========================================================================
  # Task Types
  # ===========================================================================

  type Task {
    id: ID!
    meshId: String!
    evaluationId: String
    type: String!
    name: String!
    description: String
    payload: JSON!
    targetNodes: [String!]
    routingStrategy: RoutingStrategy!
    status: TaskStatus!
    assignedTo: String
    priority: Int!
    createdAt: DateTime!
    scheduledAt: DateTime
    startedAt: DateTime
    completedAt: DateTime
    timeoutAt: DateTime
    durationMs: Int
    result: TaskResult
    error: TaskError
    dependencies: [String!]!
    dependents: [String!]!
    retries: Int!
    maxRetries: Int!
    tags: [String!]!
    metadata: JSON
  }

  enum RoutingStrategy {
    RANDOM
    ROUND_ROBIN
    LEAST_LOADED
    CAPABILITY_MATCH
    LOCALITY
    BROADCAST
    MULTICAST
    CUSTOM
  }

  enum TaskStatus {
    PENDING
    QUEUED
    ASSIGNED
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
    TIMEOUT
  }

  type TaskResult {
    success: Boolean!
    data: JSON!
    nodeId: String!
    timestamp: DateTime!
  }

  type TaskError {
    code: String!
    message: String!
    stack: String
    retryable: Boolean!
    nodeId: String
    timestamp: DateTime!
  }

  # ===========================================================================
  # Queries
  # ===========================================================================

  type Query {
    # Meshes
    mesh(id: ID!): Mesh
    meshes(tenantId: String, limit: Int, offset: Int): [Mesh!]!

    # Evaluations
    evaluation(id: ID!): Evaluation
    evaluations(meshId: String, scenario: EvaluationScenario, limit: Int, offset: Int): [Evaluation!]!

    # Tasks
    task(id: ID!): Task
    tasks(meshId: String, status: TaskStatus, limit: Int, offset: Int): [Task!]!

    # Metrics
    meshMetrics(meshId: ID!): MeshMetrics
    nodeMetrics(meshId: ID!, nodeId: ID!): NodePerformanceMetrics
    timeSeriesMetrics(meshId: ID!, startTime: DateTime!, endTime: DateTime!): [MeshMetrics!]!
  }

  # ===========================================================================
  # Mutations
  # ===========================================================================

  type Mutation {
    # Mesh Operations
    createMesh(input: CreateMeshInput!): Mesh!
    updateMesh(id: ID!, input: UpdateMeshInput!): Mesh!
    deleteMesh(id: ID!): Boolean!
    startMesh(id: ID!): Mesh!
    stopMesh(id: ID!): Mesh!

    # Node Operations
    addNode(meshId: ID!, input: AddNodeInput!): MeshNode!
    removeNode(meshId: ID!, nodeId: ID!): Boolean!

    # Evaluation Operations
    startEvaluation(input: StartEvaluationInput!): Evaluation!
    cancelEvaluation(id: ID!): Evaluation!

    # Task Operations
    submitTask(input: SubmitTaskInput!): Task!
    cancelTask(id: ID!): Task!
  }

  # ===========================================================================
  # Subscriptions
  # ===========================================================================

  type Subscription {
    meshUpdated(meshId: ID!): Mesh!
    evaluationUpdated(evaluationId: ID!): Evaluation!
    metricsUpdated(meshId: ID!): MeshMetrics!
    taskUpdated(taskId: ID!): Task!
  }

  # ===========================================================================
  # Inputs
  # ===========================================================================

  input CreateMeshInput {
    name: String!
    description: String
    topology: MeshTopology!
    nodes: [NodeInput!]!
    config: MeshConfigInput
    tenantId: String!
    projectId: String
    ownerId: String!
    tags: [String!]
  }

  input NodeInput {
    name: String!
    agentId: String!
    role: AgentRole!
    capabilities: [String!]!
    specializations: [String!]
    maxConcurrentTasks: Int!
    endpoint: String!
    protocol: [String!]!
  }

  input MeshConfigInput {
    maxHops: Int
    messageTTL: Int
    timeoutMs: Int
    loadBalancingStrategy: LoadBalancingStrategy
    enableFailover: Boolean
    redundancyFactor: Int
  }

  input UpdateMeshInput {
    name: String
    description: String
    tags: [String!]
  }

  input AddNodeInput {
    name: String!
    agentId: String!
    role: AgentRole!
    capabilities: [String!]!
    maxConcurrentTasks: Int!
    endpoint: String!
    protocol: [String!]!
  }

  input StartEvaluationInput {
    meshId: ID!
    scenario: EvaluationScenario!
    scenarioParams: JSON
    baselineId: ID
    triggeredBy: String!
    triggerType: TriggerType
    tags: [String!]
  }

  input SubmitTaskInput {
    meshId: ID!
    type: String!
    name: String!
    description: String
    payload: JSON!
    targetNodes: [String!]
    routingStrategy: RoutingStrategy
    priority: Int
    dependencies: [String!]
  }
`;
