export const typeDefs = /* GraphQL */ `
  scalar JSON
  scalar DateTime

  enum ConfigValueType {
    boolean
    integer
    float
    string
    json
  }

  enum HierarchyLevel {
    global
    environment
    tenant
    user
  }

  enum SegmentOperator {
    equals
    not_equals
    contains
    not_contains
    starts_with
    ends_with
    in
    not_in
    greater_than
    greater_than_or_equals
    less_than
    less_than_or_equals
    regex
    semver_equals
    semver_greater_than
    semver_less_than
  }

  enum ExperimentStatus {
    draft
    running
    paused
    completed
    archived
  }

  # Config types
  type ConfigItem {
    id: ID!
    key: String!
    value: JSON!
    valueType: ConfigValueType!
    level: HierarchyLevel!
    environment: String
    tenantId: String
    userId: String
    description: String
    isSecret: Boolean!
    isGovernanceProtected: Boolean!
    version: Int!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    updatedBy: String!
  }

  type ConfigItemConnection {
    items: [ConfigItem!]!
    total: Int!
  }

  input CreateConfigItemInput {
    key: String!
    value: JSON!
    valueType: ConfigValueType!
    level: HierarchyLevel!
    environment: String
    tenantId: String
    userId: String
    description: String
    isSecret: Boolean
    isGovernanceProtected: Boolean
  }

  input UpdateConfigItemInput {
    value: JSON
    description: String
    isSecret: Boolean
    isGovernanceProtected: Boolean
  }

  input ConfigContextInput {
    environment: String
    tenantId: String
    userId: String
    attributes: JSON
  }

  # Segment types
  type SegmentCondition {
    attribute: String!
    operator: SegmentOperator!
    value: JSON!
  }

  type SegmentRule {
    conditions: [SegmentCondition!]!
  }

  type Segment {
    id: ID!
    name: String!
    description: String
    tenantId: String
    rules: [SegmentRule!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    updatedBy: String!
  }

  type SegmentConnection {
    segments: [Segment!]!
    total: Int!
  }

  input SegmentConditionInput {
    attribute: String!
    operator: SegmentOperator!
    value: JSON!
  }

  input SegmentRuleInput {
    conditions: [SegmentConditionInput!]!
  }

  input CreateSegmentInput {
    name: String!
    description: String
    tenantId: String
    rules: [SegmentRuleInput!]
  }

  input UpdateSegmentInput {
    name: String
    description: String
    rules: [SegmentRuleInput!]
  }

  # Feature flag types
  type FlagTargetingRule {
    id: ID!
    segmentId: String
    inlineConditions: [SegmentCondition!]
    rolloutPercentage: Float!
    value: JSON!
    priority: Int!
  }

  type FeatureFlag {
    id: ID!
    key: String!
    name: String!
    description: String
    tenantId: String
    enabled: Boolean!
    defaultValue: JSON!
    valueType: ConfigValueType!
    targetingRules: [FlagTargetingRule!]!
    allowlist: [String!]!
    blocklist: [String!]!
    isGovernanceProtected: Boolean!
    staleAfterDays: Int
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    updatedBy: String!
  }

  type FeatureFlagConnection {
    flags: [FeatureFlag!]!
    total: Int!
  }

  type FlagEvaluationResult {
    flagKey: String!
    value: JSON
    enabled: Boolean!
    reason: String!
    ruleId: String
    segmentId: String
  }

  input CreateFeatureFlagInput {
    key: String!
    name: String!
    description: String
    tenantId: String
    enabled: Boolean
    defaultValue: JSON!
    valueType: ConfigValueType
    allowlist: [String!]
    blocklist: [String!]
    isGovernanceProtected: Boolean
    staleAfterDays: Int
  }

  input UpdateFeatureFlagInput {
    name: String
    description: String
    enabled: Boolean
    defaultValue: JSON
    allowlist: [String!]
    blocklist: [String!]
    isGovernanceProtected: Boolean
    staleAfterDays: Int
  }

  input AddTargetingRuleInput {
    segmentId: String
    inlineConditions: [SegmentConditionInput!]
    rolloutPercentage: Float
    value: JSON!
    priority: Int
  }

  input EvaluationContextInput {
    userId: String!
    tenantId: String
    environment: String
    attributes: JSON
  }

  # Experiment types
  type ExperimentVariant {
    id: ID!
    name: String!
    description: String
    weight: Float!
    value: JSON!
    isControl: Boolean!
  }

  type Experiment {
    id: ID!
    key: String!
    name: String!
    description: String
    tenantId: String
    status: ExperimentStatus!
    variants: [ExperimentVariant!]!
    targetSegmentId: String
    rolloutPercentage: Float!
    allowlist: [String!]!
    blocklist: [String!]!
    isGovernanceProtected: Boolean!
    requiresApproval: Boolean!
    approvedBy: String
    approvedAt: DateTime
    startedAt: DateTime
    endedAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
    updatedBy: String!
  }

  type ExperimentConnection {
    experiments: [Experiment!]!
    total: Int!
  }

  type ExperimentAssignment {
    experimentId: ID!
    experimentKey: String!
    variantId: ID!
    variantName: String!
    value: JSON
    inExperiment: Boolean!
    reason: String!
  }

  input ExperimentVariantInput {
    name: String!
    description: String
    weight: Float!
    value: JSON!
    isControl: Boolean
  }

  input CreateExperimentInput {
    key: String!
    name: String!
    description: String
    tenantId: String
    variants: [ExperimentVariantInput!]!
    targetSegmentId: String
    rolloutPercentage: Float
    allowlist: [String!]
    blocklist: [String!]
    isGovernanceProtected: Boolean
    requiresApproval: Boolean
  }

  input UpdateExperimentInput {
    name: String
    description: String
    rolloutPercentage: Float
    allowlist: [String!]
    blocklist: [String!]
  }

  # Audit types
  type AuditLogEntry {
    id: ID!
    entityType: String!
    entityId: ID!
    action: String!
    previousValue: JSON
    newValue: JSON
    tenantId: String
    userId: String!
    userEmail: String
    ipAddress: String
    userAgent: String
    timestamp: DateTime!
  }

  type AuditLogConnection {
    entries: [AuditLogEntry!]!
    total: Int!
  }

  # Batch evaluation types
  type BatchEvaluationResponse {
    flags: JSON!
    experiments: JSON!
    configs: JSON!
    evaluatedAt: Float!
  }

  # Queries
  type Query {
    # Config queries
    config(id: ID!): ConfigItem
    configValue(key: String!, context: ConfigContextInput): JSON
    configs(tenantId: String, limit: Int, offset: Int): ConfigItemConnection!

    # Segment queries
    segment(id: ID!): Segment
    segmentByName(name: String!, tenantId: String): Segment
    segments(tenantId: String, limit: Int, offset: Int): SegmentConnection!

    # Feature flag queries
    flag(id: ID!): FeatureFlag
    flagByKey(key: String!, tenantId: String): FeatureFlag
    flags(
      tenantId: String
      limit: Int
      offset: Int
      includeGlobal: Boolean
    ): FeatureFlagConnection!
    evaluateFlag(
      flagKey: String!
      context: EvaluationContextInput!
    ): FlagEvaluationResult!

    # Experiment queries
    experiment(id: ID!): Experiment
    experimentByKey(key: String!, tenantId: String): Experiment
    experiments(
      tenantId: String
      status: ExperimentStatus
      limit: Int
      offset: Int
      includeGlobal: Boolean
    ): ExperimentConnection!
    getExperimentAssignment(
      experimentKey: String!
      context: EvaluationContextInput!
    ): ExperimentAssignment!

    # Batch evaluation
    batchEvaluate(
      context: EvaluationContextInput!
      flagKeys: [String!]
      experimentKeys: [String!]
      configKeys: [String!]
    ): BatchEvaluationResponse!

    # Audit queries
    auditLog(
      entityType: String
      entityId: ID
      tenantId: String
      limit: Int
      offset: Int
    ): AuditLogConnection!
  }

  # Mutations
  type Mutation {
    # Config mutations
    createConfig(input: CreateConfigItemInput!): ConfigItem!
    updateConfig(id: ID!, input: UpdateConfigItemInput!): ConfigItem
    deleteConfig(id: ID!): Boolean!

    # Segment mutations
    createSegment(input: CreateSegmentInput!): Segment!
    updateSegment(id: ID!, input: UpdateSegmentInput!): Segment
    deleteSegment(id: ID!): Boolean!

    # Feature flag mutations
    createFlag(input: CreateFeatureFlagInput!): FeatureFlag!
    updateFlag(id: ID!, input: UpdateFeatureFlagInput!): FeatureFlag
    deleteFlag(id: ID!): Boolean!
    toggleFlag(id: ID!, enabled: Boolean!): FeatureFlag
    addTargetingRule(flagId: ID!, input: AddTargetingRuleInput!): FeatureFlag
    removeTargetingRule(flagId: ID!, ruleId: ID!): FeatureFlag

    # Experiment mutations
    createExperiment(input: CreateExperimentInput!): Experiment!
    updateExperiment(id: ID!, input: UpdateExperimentInput!): Experiment
    deleteExperiment(id: ID!): Boolean!
    startExperiment(id: ID!): Experiment
    pauseExperiment(id: ID!): Experiment
    completeExperiment(id: ID!): Experiment
    approveExperiment(id: ID!): Experiment
  }
`;
