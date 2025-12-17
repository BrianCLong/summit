/**
 * Trust Center GraphQL Schema
 *
 * GraphQL type definitions for Trust Center, regulatory packs,
 * and compliance evidence management.
 *
 * @module graphql/schema.trust-center
 */

import { gql } from 'graphql-tag';

export const trustCenterTypeDefs = gql`
  # ==========================================================================
  # Enums
  # ==========================================================================

  enum ComplianceFramework {
    SOC2_TYPE_I
    SOC2_TYPE_II
    ISO_27001
    ISO_27017
    ISO_27018
    HIPAA
    HITRUST
    FEDRAMP_LOW
    FEDRAMP_MODERATE
    FEDRAMP_HIGH
    PCI_DSS_4
    GDPR
    CCPA
    SOX
    NIST_CSF
    NIST_800_53
    NIST_800_171
    CIS_CONTROLS
    CSA_STAR
  }

  enum ControlStatus {
    EFFECTIVE
    PARTIALLY_EFFECTIVE
    INEFFECTIVE
    NOT_TESTED
    NOT_APPLICABLE
  }

  enum HealthStatus {
    OPERATIONAL
    DEGRADED
    PARTIAL_OUTAGE
    MAJOR_OUTAGE
  }

  enum ArtifactType {
    CONTROL_DESCRIPTION
    TEST_PROCEDURE
    EVIDENCE_SNAPSHOT
    COMPLIANCE_REPORT
    ATTESTATION
    CERTIFICATION
    PENTEST_SUMMARY
    SLO_DASHBOARD
    POLICY_DOCUMENT
  }

  enum DataClassification {
    PUBLIC
    INTERNAL
    CONFIDENTIAL
    RESTRICTED
    CUSTOMER_NDA
  }

  enum EvidenceRequestStatus {
    PENDING
    PROCESSING
    COMPLETED
    FAILED
    EXPIRED
  }

  enum ReportFormat {
    JSON
    CSV
    PDF
    OSCAL
    CAIQ
  }

  enum AssuranceReadiness {
    READY
    PARTIAL
    NOT_READY
  }

  # ==========================================================================
  # Input Types
  # ==========================================================================

  input DateRangeInput {
    start: String!
    end: String!
  }

  input EvidenceScopeInput {
    level: String
    redactionLevel: DataClassification
  }

  input EvidenceRequestInput {
    controlIds: [String!]!
    purpose: String!
    dateRange: DateRangeInput
  }

  input ReportGenerationInput {
    packId: String!
    format: ReportFormat
    dateRange: DateRangeInput
    controlIds: [String!]
    includeEvidence: Boolean
  }

  input WebhookInput {
    url: String!
    events: [String!]!
    secret: String
  }

  # ==========================================================================
  # Types - Trust Center Status
  # ==========================================================================

  type TrustCenterStatus {
    overallStatus: HealthStatus!
    certifications: [CertificationSummary!]!
    sloSummary: SLOSummary!
    lastUpdated: String!
    incidentCount: Int!
    uptime: UptimeMetrics!
  }

  type CertificationSummary {
    framework: ComplianceFramework!
    name: String!
    status: String!
    validFrom: String
    validUntil: String
    auditor: String
  }

  type SLOSummary {
    availability: AvailabilityMetric!
    latency: LatencyMetric!
    errorRate: ErrorRateMetric!
  }

  type AvailabilityMetric {
    target: Float!
    current: Float!
    period: String!
  }

  type LatencyMetric {
    p50: Float!
    p95: Float!
    p99: Float!
    target: Float!
  }

  type ErrorRateMetric {
    target: Float!
    current: Float!
  }

  type UptimeMetrics {
    last24h: Float!
    last7d: Float!
    last30d: Float!
  }

  type ServiceStatus {
    id: ID!
    name: String!
    status: HealthStatus!
    uptime: Float!
    latency: Float!
    lastIncident: IncidentSummary
  }

  type IncidentSummary {
    id: ID!
    title: String!
    resolvedAt: String
  }

  # ==========================================================================
  # Types - Regulatory Packs
  # ==========================================================================

  type RegulatoryPack {
    id: ID!
    name: String!
    description: String
    framework: ComplianceFramework!
    version: String!
    status: String!
    controls: [PackControl!]!
    artifacts: [PackArtifact!]!
    metadata: PackMetadata!
    createdAt: String!
    updatedAt: String!
  }

  type RegulatoryPackSummary {
    id: ID!
    name: String!
    framework: ComplianceFramework!
    version: String!
    status: String!
    controlCount: Int!
    lastUpdated: String!
  }

  type PackControl {
    id: ID!
    controlDefinitionId: String
    title: String!
    description: String!
    category: String!
    evidenceSources: [EvidenceSourceConfig!]!
    tests: [ControlTest!]!
    mappings: [FrameworkMapping!]!
  }

  type PackArtifact {
    id: ID!
    type: ArtifactType!
    name: String!
    description: String
    access: DataClassification!
    path: String!
  }

  type PackMetadata {
    auditPeriod: DateRange
    auditor: String
    certificationDate: String
    expirationDate: String
    version: String!
  }

  type DateRange {
    start: String!
    end: String!
  }

  # ==========================================================================
  # Types - Controls
  # ==========================================================================

  type ControlDefinition {
    id: ID!
    title: String!
    description: String!
    category: String!
    frameworkMappings: [FrameworkMapping!]!
    implementation: ControlImplementation!
    evidenceSources: [EvidenceSourceConfig!]!
    tests: [ControlTest!]!
    status: ControlStatus!
    lastTestedAt: String
    nextTestDue: String
    owner: ActorReference
  }

  type ControlImplementation {
    description: String!
    components: [ImplementationComponent!]!
    documentation: [String!]
  }

  type ImplementationComponent {
    name: String!
    type: String!
    location: String!
    description: String!
  }

  type FrameworkMapping {
    framework: ComplianceFramework!
    controlId: String!
    requirement: String!
    mappingConfidence: String!
    notes: String
  }

  type EvidenceSourceConfig {
    id: ID!
    type: String!
    name: String!
    description: String
    retentionPeriod: String!
    refreshFrequency: String!
    stalenessThreshold: String!
  }

  type ControlTest {
    id: ID!
    name: String!
    description: String
    type: String!
    frequency: String!
    procedure: String!
    expectedResult: String!
  }

  type ActorReference {
    type: String!
    id: String!
    name: String
    email: String
  }

  # ==========================================================================
  # Types - Evidence
  # ==========================================================================

  type ControlEvidence {
    controlId: String!
    control: ControlDefinition!
    evidenceSnapshots: [EvidenceSnapshot!]!
    testResults: [TestResult!]!
    metrics: ControlMetrics!
  }

  type EvidenceSnapshot {
    id: ID!
    sourceId: String!
    controlId: String!
    capturedAt: String!
    capturedBy: ActorReference
    content: JSON
    contentHash: String!
    contentSize: Int!
    redactionApplied: Boolean!
    signature: CryptographicSignature
  }

  type CryptographicSignature {
    algorithm: String!
    signature: String!
    publicKeyId: String!
    timestamp: String!
  }

  type TestResult {
    id: ID!
    testId: String!
    controlId: String!
    executedAt: String!
    executedBy: ActorReference
    status: String!
    details: String
    duration: Int
    failureReason: String
  }

  type ControlMetrics {
    controlId: String!
    period: DateRange!
    testsExecuted: Int!
    testsPassed: Int!
    testsFailed: Int!
    passRate: Float!
    evidenceCount: Int!
    evidenceFreshness: Float!
    trend: String!
  }

  # ==========================================================================
  # Types - Evidence Requests
  # ==========================================================================

  type EvidenceRequest {
    id: ID!
    tenantId: String!
    requestedBy: ActorReference!
    requestedAt: String!
    controlIds: [String!]!
    dateRange: DateRange
    purpose: String!
    status: EvidenceRequestStatus!
    processedAt: String
    expiresAt: String
    packageUrl: String
    errorMessage: String
  }

  type EvidencePackage {
    id: ID!
    requestId: String!
    tenantId: String!
    controlIds: [String!]!
    snapshots: [EvidenceSnapshot!]!
    metadata: PackageMetadata!
    integrity: PackageIntegrity!
  }

  type PackageMetadata {
    generatedAt: String!
    expiresAt: String!
    format: String!
    redactionApplied: Boolean!
  }

  type PackageIntegrity {
    packageHash: String!
    signature: CryptographicSignature
  }

  # ==========================================================================
  # Types - Reports
  # ==========================================================================

  type ComplianceReport {
    id: ID!
    packId: String!
    packName: String!
    framework: ComplianceFramework!
    tenantId: String!
    generatedAt: String!
    summary: ComplianceSummary!
    controls: [ControlAssessment!]!
    recommendations: [String!]!
  }

  type ComplianceSummary {
    totalControls: Int!
    effectiveControls: Int!
    partiallyEffective: Int!
    ineffective: Int!
    notTested: Int!
    complianceScore: Float!
    overallStatus: String!
  }

  type ControlAssessment {
    controlId: String!
    status: ControlStatus!
    metrics: ControlMetrics!
    checklistStatus: AssuranceReadiness!
  }

  type ReportJob {
    id: ID!
    tenantId: String!
    status: String!
    progress: Float
    startedAt: String
    completedAt: String
    downloadUrl: String
    error: ReportError
  }

  type ReportError {
    code: String!
    message: String!
  }

  type ReportJobProgress {
    jobId: String!
    status: String!
    progress: Float!
    currentStep: String
    estimatedCompletion: String
  }

  # ==========================================================================
  # Types - Assurance Checklist
  # ==========================================================================

  type AssuranceChecklist {
    controlId: String!
    controlTitle: String!
    overallStatus: AssuranceReadiness!
    items: [AssuranceChecklistItem!]!
    lastEvaluated: String!
    evaluatedBy: ActorReference!
  }

  type AssuranceChecklistItem {
    id: ID!
    category: String!
    requirement: String!
    description: String!
    status: String!
    evidence: String
    notes: String
  }

  # ==========================================================================
  # Types - Webhooks
  # ==========================================================================

  type Webhook {
    id: ID!
    tenantId: String!
    url: String!
    events: [String!]!
    active: Boolean!
    createdAt: String!
    lastTriggeredAt: String
    failureCount: Int!
  }

  # ==========================================================================
  # Types - Control Status Updates (Subscriptions)
  # ==========================================================================

  type ControlStatusUpdate {
    controlId: String!
    previousStatus: ControlStatus!
    currentStatus: ControlStatus!
    changedAt: String!
    reason: String
    testResultId: String
  }

  # ==========================================================================
  # Queries
  # ==========================================================================

  extend type Query {
    # Trust Center Public
    trustCenterStatus: TrustCenterStatus!
    certifications(framework: ComplianceFramework): [CertificationSummary!]!
    serviceStatus: [ServiceStatus!]!
    sloMetrics: SLOSummary!

    # Regulatory Packs
    regulatoryPacks(frameworks: [ComplianceFramework!]): [RegulatoryPackSummary!]!
    regulatoryPack(packId: String!): RegulatoryPack

    # Controls
    controls(framework: ComplianceFramework): [ControlDefinition!]!
    control(controlId: String!): ControlDefinition

    # Evidence
    controlEvidence(
      controlId: String!
      dateRange: DateRangeInput
      scope: EvidenceScopeInput
    ): ControlEvidence!

    evidenceRequest(requestId: String!): EvidenceRequest
    evidencePackage(packageId: String!): EvidencePackage

    # Reports
    complianceReport(reportId: String!): ComplianceReport

    # Assessment
    controlAssessment(controlId: String!): ControlAssessment!
    assuranceChecklist(controlId: String!): AssuranceChecklist!
  }

  # ==========================================================================
  # Mutations
  # ==========================================================================

  extend type Mutation {
    # Evidence Requests
    requestEvidence(input: EvidenceRequestInput!): EvidenceRequest!

    # Report Generation
    generateComplianceReport(input: ReportGenerationInput!): ReportJob!

    # Webhooks
    registerComplianceWebhook(input: WebhookInput!): Webhook!
    updateComplianceWebhook(id: String!, input: WebhookInput!): Webhook!
    deleteComplianceWebhook(id: String!): Boolean!
  }

  # ==========================================================================
  # Subscriptions
  # ==========================================================================

  extend type Subscription {
    # Real-time control status
    controlStatus(controlIds: [String!]!): ControlStatusUpdate!

    # Report generation progress
    reportProgress(jobId: String!): ReportJobProgress!
  }
`;

export default trustCenterTypeDefs;
