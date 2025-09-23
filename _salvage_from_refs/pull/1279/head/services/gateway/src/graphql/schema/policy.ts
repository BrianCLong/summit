/**
 * Policy GraphQL Schema
 *
 * Provides GraphQL API for policy evaluation, privacy settings,
 * licensing controls, and governance management.
 */

import { gql } from 'apollo-server-express';

export const policyTypeDefs = gql`
  # Policy evaluation result
  type PolicyEvaluationResult {
    allowed: Boolean!
    violations: [PolicyViolation!]!
    reason: String
    metadata: JSON
    evaluatedAt: DateTime!
    cacheHit: Boolean!
  }

  # Policy violation details
  type PolicyViolation {
    type: PolicyViolationType!
    severity: ViolationSeverity!
    message: String!
    resource: String
    action: String
    metadata: JSON
  }

  # Privacy policy evaluation
  type PrivacyPolicyResult {
    allowed: Boolean!
    dataClassification: DataClassification!
    retentionTier: RetentionTier!
    redactionLevel: RedactionLevel!
    consentRequired: Boolean!
    geoRestrictions: [String!]!
    piiDetected: [PIIDetection!]!
  }

  # PII detection result
  type PIIDetection {
    type: PIIType!
    field: String!
    confidence: Float!
    location: String
    pattern: String
  }

  # License enforcement result
  type LicenseEnforcementResult {
    allowed: Boolean!
    tier: LicenseTier!
    usage: LicenseUsage!
    limits: LicenseLimits!
    violations: [LicenseViolation!]!
    commercialUse: Boolean!
    geoRestricted: Boolean!
  }

  # License usage tracking
  type LicenseUsage {
    apiCalls: LicenseCounter!
    dataProcessing: LicenseCounter!
    storage: LicenseCounter!
    users: LicenseCounter!
    exports: LicenseCounter!
  }

  # License counter with limits
  type LicenseCounter {
    current: Int!
    limit: Int!
    period: String!
    resetAt: DateTime
    percentage: Float!
  }

  # License limits by tier
  type LicenseLimits {
    apiCallsPerMonth: Int!
    dataProcessingGB: Int!
    storageGB: Int!
    maxUsers: Int!
    exportsPerMonth: Int!
    supportLevel: String!
    features: [String!]!
  }

  # License violation
  type LicenseViolation {
    type: LicenseViolationType!
    current: Int!
    limit: Int!
    percentage: Float!
    message: String!
  }

  # Governance policy result
  type GovernancePolicyResult {
    allowed: Boolean!
    gates: [GovernanceGate!]!
    ciRequirements: CIRequirements!
    securityRequirements: SecurityRequirements!
    qualityMetrics: QualityMetrics!
    violations: [GovernanceViolation!]!
  }

  # Governance gate evaluation
  type GovernanceGate {
    name: String!
    enabled: Boolean!
    passed: Boolean!
    message: String
    metadata: JSON
  }

  # CI requirements compliance
  type CIRequirements {
    workflowExists: Boolean!
    usesBaseline: Boolean!
    hasRequiredJobs: Boolean!
    reasonableTimeout: Boolean!
    securityScanning: Boolean!
  }

  # Security requirements compliance
  type SecurityRequirements {
    broadPermissions: Boolean!
    secretHandling: Boolean!
    vulnerabilityCount: Int!
    licenseCompatible: Boolean!
  }

  # Quality metrics
  type QualityMetrics {
    codeCoverage: Float!
    testCoverage: Float!
    complexityScore: Float!
    lintScore: Float!
  }

  # Governance violation
  type GovernanceViolation {
    type: String!
    service: String
    workflow: String
    message: String!
    severity: ViolationSeverity!
  }

  # Policy configuration
  type PolicyConfiguration {
    id: ID!
    tenantId: String!
    type: PolicyType!
    name: String!
    description: String
    enabled: Boolean!
    rules: JSON!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    createdBy: String!
  }

  # Enums
  enum PolicyType {
    PRIVACY
    LICENSING
    GOVERNANCE
    SECURITY
    COMPLIANCE
  }

  enum PolicyViolationType {
    PRIVACY_BREACH
    LICENSE_EXCEEDED
    GOVERNANCE_FAILURE
    SECURITY_VIOLATION
    DATA_CLASSIFICATION
    RETENTION_VIOLATION
    GEO_RESTRICTION
  }

  enum ViolationSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  enum DataClassification {
    PUBLIC
    INTERNAL
    CONFIDENTIAL
    RESTRICTED
    SECRET
  }

  enum RetentionTier {
    SHORT_30D
    MEDIUM_1Y
    LONG_7Y
    PERMANENT
    LEGAL_HOLD
  }

  enum RedactionLevel {
    NONE
    PARTIAL
    FULL
    K_ANONYMITY
    DIFFERENTIAL_PRIVACY
  }

  enum PIIType {
    EMAIL
    PHONE
    SSN
    CREDIT_CARD
    IP_ADDRESS
    NAME
    ADDRESS
    DOB
    CUSTOM
  }

  enum LicenseTier {
    BASIC
    PROFESSIONAL
    ENTERPRISE
    UNLIMITED
  }

  enum LicenseViolationType {
    API_LIMIT_EXCEEDED
    DATA_LIMIT_EXCEEDED
    STORAGE_LIMIT_EXCEEDED
    USER_LIMIT_EXCEEDED
    EXPORT_LIMIT_EXCEEDED
    FEATURE_RESTRICTED
    GEO_RESTRICTED
    COMMERCIAL_RESTRICTED
  }

  # Input types
  input PolicyEvaluationInput {
    tenantId: String!
    userId: String
    resource: String!
    action: String!
    context: JSON
    skipCache: Boolean = false
  }

  input PrivacyPolicyInput {
    tenantId: String!
    userId: String
    dataType: String!
    purpose: String!
    retention: RetentionTier
    context: JSON
  }

  input LicenseEnforcementInput {
    tenantId: String!
    operation: String!
    resource: String
    quantity: Int = 1
    context: JSON
  }

  input GovernancePolicyInput {
    services: [ServiceInput!]!
    workflows: [WorkflowInput!]!
    gates: JSON
  }

  input ServiceInput {
    name: String!
    files: [String!]!
    packageJson: JSON
    coveragePercentage: Float
    securityScan: SecurityScanInput
  }

  input WorkflowInput {
    name: String!
    content: String!
    jobs: [JobInput!]!
    permissions: [String!]
  }

  input JobInput {
    name: String!
    timeoutMinutes: Int
    steps: [StepInput!]!
  }

  input StepInput {
    name: String
    env: JSON
  }

  input SecurityScanInput {
    vulnerabilities: [VulnerabilityInput!]!
  }

  input VulnerabilityInput {
    severity: String!
    type: String
    package: String
  }

  input PolicyConfigurationInput {
    tenantId: String!
    type: PolicyType!
    name: String!
    description: String
    enabled: Boolean = true
    rules: JSON!
    metadata: JSON
  }

  # Queries
  extend type Query {
    # Evaluate comprehensive policy
    evaluatePolicy(input: PolicyEvaluationInput!): PolicyEvaluationResult!

    # Privacy policy evaluation
    evaluatePrivacyPolicy(input: PrivacyPolicyInput!): PrivacyPolicyResult!

    # License enforcement check
    enforceLicense(input: LicenseEnforcementInput!): LicenseEnforcementResult!

    # Governance policy evaluation
    evaluateGovernancePolicy(input: GovernancePolicyInput!): GovernancePolicyResult!

    # Get policy configurations
    policyConfigurations(
      tenantId: String!
      type: PolicyType
      enabled: Boolean
    ): [PolicyConfiguration!]!

    # Get policy configuration by ID
    policyConfiguration(id: ID!): PolicyConfiguration

    # Get license usage for tenant
    licenseUsage(tenantId: String!): LicenseUsage!

    # Get policy evaluation history
    policyEvaluationHistory(
      tenantId: String!
      resource: String
      action: String
      limit: Int = 100
      offset: Int = 0
    ): [PolicyEvaluationResult!]!

    # Health check for policy services
    policyHealthCheck: JSON!
  }

  # Mutations
  extend type Mutation {
    # Create policy configuration
    createPolicyConfiguration(input: PolicyConfigurationInput!): PolicyConfiguration!

    # Update policy configuration
    updatePolicyConfiguration(
      id: ID!
      input: PolicyConfigurationInput!
    ): PolicyConfiguration!

    # Delete policy configuration
    deletePolicyConfiguration(id: ID!): Boolean!

    # Reset license usage counters
    resetLicenseUsage(
      tenantId: String!
      counter: String
    ): LicenseUsage!

    # Clear policy evaluation cache
    clearPolicyCache(
      tenantId: String
      resource: String
      action: String
    ): Boolean!

    # Bulk evaluate policies
    bulkEvaluatePolicy(
      inputs: [PolicyEvaluationInput!]!
    ): [PolicyEvaluationResult!]!
  }

  # Subscriptions
  extend type Subscription {
    # Real-time policy violations
    policyViolations(tenantId: String!): PolicyViolation!

    # License usage updates
    licenseUsageUpdates(tenantId: String!): LicenseUsage!

    # Policy evaluation events
    policyEvaluationEvents(
      tenantId: String!
      resource: String
    ): PolicyEvaluationResult!
  }
`;