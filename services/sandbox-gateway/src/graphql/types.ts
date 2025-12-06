import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: Date;
  JSON: Record<string, unknown>;
  UUID: string;
};

export type TenantType = 'PRODUCTION' | 'SANDBOX' | 'DATALAB' | 'STAGING';
export type SandboxIsolationLevel = 'STANDARD' | 'ENHANCED' | 'AIRGAPPED' | 'RESEARCH';
export type DataAccessMode = 'SYNTHETIC_ONLY' | 'ANONYMIZED' | 'SAMPLED' | 'STRUCTURE_ONLY';
export type SandboxStatus = 'PROVISIONING' | 'ACTIVE' | 'SUSPENDED' | 'EXPIRED' | 'ARCHIVED' | 'TERMINATED';
export type ConnectorType = 'DATABASE' | 'API' | 'FILE_SYSTEM' | 'STREAMING' | 'EXTERNAL_SERVICE' | 'FEDERATION';
export type AnonymizationTechnique = 'REDACTION' | 'HASHING' | 'PSEUDONYMIZATION' | 'GENERALIZATION' | 'MASKING' | 'NOISE_ADDITION' | 'K_ANONYMITY' | 'DIFFERENTIAL_PRIVACY';
export type CloneStrategy = 'STRUCTURE_ONLY' | 'SYNTHETIC' | 'ANONYMIZED' | 'SAMPLED' | 'FUZZED';
export type DataSourceType = 'NEO4J' | 'POSTGRESQL' | 'INVESTIGATION' | 'ENTITY_SET' | 'SCENARIO';
export type PromotionStatus = 'DRAFT' | 'PENDING_REVIEW' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'PROMOTED' | 'ROLLED_BACK';
export type PromotionType = 'QUERY' | 'WORKFLOW' | 'SCRIPT' | 'CONFIGURATION' | 'MODEL';
export type ScenarioCategory = 'INTELLIGENCE_ANALYSIS' | 'FRAUD_DETECTION' | 'NETWORK_ANALYSIS' | 'ENTITY_RESOLUTION' | 'THREAT_DETECTION' | 'COMPLIANCE' | 'CUSTOM';

export interface ResourceQuotaInput {
  maxCpuMs?: InputMaybe<Scalars['Int']>;
  maxMemoryMb?: InputMaybe<Scalars['Int']>;
  maxStorageGb?: InputMaybe<Scalars['Float']>;
  maxExecutionsPerHour?: InputMaybe<Scalars['Int']>;
  maxConcurrentSandboxes?: InputMaybe<Scalars['Int']>;
  maxDataExportMb?: InputMaybe<Scalars['Int']>;
  maxNetworkBytesPerHour?: InputMaybe<Scalars['Int']>;
}

export interface DataAccessPolicyInput {
  mode?: InputMaybe<DataAccessMode>;
  maxRecords?: InputMaybe<Scalars['Int']>;
  allowedEntityTypes?: InputMaybe<Array<Scalars['String']>>;
  blockedEntityTypes?: InputMaybe<Array<Scalars['String']>>;
  piiHandling?: InputMaybe<Scalars['String']>;
  allowLinkbackToProduction?: InputMaybe<Scalars['Boolean']>;
  requireAnonymizationAudit?: InputMaybe<Scalars['Boolean']>;
  retentionDays?: InputMaybe<Scalars['Int']>;
}

export interface CreateSandboxInput {
  name: Scalars['String'];
  description?: InputMaybe<Scalars['String']>;
  parentTenantId?: InputMaybe<Scalars['UUID']>;
  isolationLevel?: InputMaybe<SandboxIsolationLevel>;
  preset?: InputMaybe<Scalars['String']>;
  resourceQuotas?: InputMaybe<ResourceQuotaInput>;
  dataAccessPolicy?: InputMaybe<DataAccessPolicyInput>;
  expiresInDays?: InputMaybe<Scalars['Int']>;
  teamIds?: InputMaybe<Array<Scalars['String']>>;
  tags?: InputMaybe<Array<Scalars['String']>>;
}

export interface UpdateSandboxInput {
  name?: InputMaybe<Scalars['String']>;
  description?: InputMaybe<Scalars['String']>;
  resourceQuotas?: InputMaybe<ResourceQuotaInput>;
  dataAccessPolicy?: InputMaybe<DataAccessPolicyInput>;
  status?: InputMaybe<SandboxStatus>;
  expiresAt?: InputMaybe<Scalars['DateTime']>;
  teamIds?: InputMaybe<Array<Scalars['String']>>;
  tags?: InputMaybe<Array<Scalars['String']>>;
}

export interface DataCloneInput {
  sandboxId: Scalars['UUID'];
  name: Scalars['String'];
  description?: InputMaybe<Scalars['String']>;
  sourceType: DataSourceType;
  sourceConfig: Scalars['JSON'];
  strategy: CloneStrategy;
  fieldAnonymization?: InputMaybe<Array<FieldAnonymizationInput>>;
  sampleSize?: InputMaybe<Scalars['Int']>;
  sampleMethod?: InputMaybe<Scalars['String']>;
  outputFormat?: InputMaybe<Scalars['String']>;
  includeRelationships?: InputMaybe<Scalars['Boolean']>;
  preserveGraph?: InputMaybe<Scalars['Boolean']>;
}

export interface FieldAnonymizationInput {
  fieldPath: Scalars['String'];
  technique: AnonymizationTechnique;
  preserveFormat?: InputMaybe<Scalars['Boolean']>;
  preserveLength?: InputMaybe<Scalars['Boolean']>;
  kValue?: InputMaybe<Scalars['Int']>;
  epsilon?: InputMaybe<Scalars['Float']>;
  hashAlgorithm?: InputMaybe<Scalars['String']>;
  maskChar?: InputMaybe<Scalars['String']>;
  maskFromStart?: InputMaybe<Scalars['Int']>;
  maskFromEnd?: InputMaybe<Scalars['Int']>;
}

export interface SyntheticDataInput {
  sandboxId: Scalars['UUID'];
  name: Scalars['String'];
  schemas: Array<SyntheticEntitySchemaInput>;
  config: SyntheticDataConfigInput;
  outputFormat?: InputMaybe<Scalars['String']>;
}

export interface SyntheticEntitySchemaInput {
  entityType: Scalars['String'];
  fields: Array<SyntheticFieldInput>;
  relationshipTypes?: InputMaybe<Array<RelationshipTypeInput>>;
}

export interface SyntheticFieldInput {
  name: Scalars['String'];
  type: Scalars['String'];
  generator: Scalars['String'];
  config?: InputMaybe<Scalars['JSON']>;
  nullable?: InputMaybe<Scalars['Boolean']>;
  nullProbability?: InputMaybe<Scalars['Float']>;
}

export interface RelationshipTypeInput {
  type: Scalars['String'];
  targetEntityType: Scalars['String'];
  direction: Scalars['String'];
  probability?: InputMaybe<Scalars['Float']>;
  minCount?: InputMaybe<Scalars['Int']>;
  maxCount?: InputMaybe<Scalars['Int']>;
}

export interface SyntheticDataConfigInput {
  totalEntities: Scalars['Int'];
  entityDistribution?: InputMaybe<Scalars['JSON']>;
  seed?: InputMaybe<Scalars['Int']>;
  locale?: InputMaybe<Scalars['String']>;
  generateRelationships?: InputMaybe<Scalars['Boolean']>;
  connectivityDensity?: InputMaybe<Scalars['Float']>;
}

export interface CreatePromotionInput {
  sandboxId: Scalars['UUID'];
  targetTenantId: Scalars['UUID'];
  promotionType: PromotionType;
  artifactId: Scalars['String'];
  artifactName: Scalars['String'];
  artifactVersion?: InputMaybe<Scalars['String']>;
  justification: Scalars['String'];
  rollbackPlan?: InputMaybe<Scalars['String']>;
}

export interface PromotionReviewInput {
  requestId: Scalars['UUID'];
  decision: Scalars['String'];
  comments?: InputMaybe<Scalars['String']>;
}

export interface SandboxQueryInput {
  sandboxId: Scalars['UUID'];
  query: Scalars['String'];
  queryType: Scalars['String'];
  parameters?: InputMaybe<Scalars['JSON']>;
  timeout?: InputMaybe<Scalars['Int']>;
  limit?: InputMaybe<Scalars['Int']>;
}

export interface ScenarioSimulationInput {
  sandboxId: Scalars['UUID'];
  templateId: Scalars['UUID'];
  name: Scalars['String'];
  description?: InputMaybe<Scalars['String']>;
  parameters?: InputMaybe<Scalars['JSON']>;
  scale?: InputMaybe<Scalars['Float']>;
  seed?: InputMaybe<Scalars['Int']>;
  outputFormat?: InputMaybe<Scalars['String']>;
}

// Context type for resolvers
export interface GraphQLContext {
  user: {
    id: string;
    email: string;
    tenantId: string;
    role: string;
    permissions: string[];
  };
  requestId: string;
  startTime: number;
}

// Resolver types
export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs>;

export interface Resolvers<TContext = GraphQLContext> {
  Query?: QueryResolvers<TContext>;
  Mutation?: MutationResolvers<TContext>;
  Subscription?: SubscriptionResolvers<TContext>;
  DateTime?: GraphQLScalarType;
  JSON?: GraphQLScalarType;
  UUID?: GraphQLScalarType;
}

export interface QueryResolvers<TContext = GraphQLContext> {
  sandbox?: Resolver<Maybe<SandboxTenantProfile>, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  sandboxes?: Resolver<Array<SandboxTenantProfile>, {}, TContext, { status?: SandboxStatus; includeExpired?: boolean; limit?: number; offset?: number }>;
  sandboxPresets?: Resolver<Array<SandboxPreset>, {}, TContext, {}>;
  validateSandbox?: Resolver<ValidationReport, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  checkEnforcement?: Resolver<EnforcementDecision, {}, TContext, { sandboxId: string; operation: string; connectorType?: ConnectorType; targetEndpoint?: string; dataFields?: string[] }>;
  dataClone?: Resolver<Maybe<DataCloneResult>, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  dataClones?: Resolver<Array<DataCloneResult>, {}, TContext, { sandboxId: string; limit?: number; offset?: number }>;
  syntheticData?: Resolver<Maybe<SyntheticDataResult>, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  syntheticDataResults?: Resolver<Array<SyntheticDataResult>, {}, TContext, { sandboxId: string; limit?: number; offset?: number }>;
  scenarioTemplates?: Resolver<Array<ScenarioTemplate>, {}, TContext, { category?: ScenarioCategory }>;
  scenarioTemplate?: Resolver<Maybe<ScenarioTemplate>, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  promotionRequest?: Resolver<Maybe<PromotionRequest>, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  promotionRequests?: Resolver<Array<PromotionRequest>, {}, TContext, { sandboxId: string; status?: PromotionStatus; limit?: number; offset?: number }>;
  pendingReviews?: Resolver<Array<PromotionRequest>, {}, TContext, { limit?: number; offset?: number }>;
  activeSession?: Resolver<Maybe<DataLabSession>, {}, TContext, RequireFields<{ sandboxId: string }, 'sandboxId'>>;
  linkbackAttempts?: Resolver<Array<LinkbackAttempt>, {}, TContext, { sandboxId: string; limit?: number }>;
  health?: Resolver<HealthStatus, {}, TContext, {}>;
}

export interface MutationResolvers<TContext = GraphQLContext> {
  createSandbox?: Resolver<SandboxTenantProfile, {}, TContext, RequireFields<{ input: CreateSandboxInput }, 'input'>>;
  updateSandbox?: Resolver<SandboxTenantProfile, {}, TContext, RequireFields<{ id: string; input: UpdateSandboxInput }, 'id' | 'input'>>;
  activateSandbox?: Resolver<SandboxTenantProfile, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  suspendSandbox?: Resolver<SandboxTenantProfile, {}, TContext, RequireFields<{ id: string; reason: string }, 'id' | 'reason'>>;
  resumeSandbox?: Resolver<SandboxTenantProfile, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  archiveSandbox?: Resolver<SandboxTenantProfile, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  deleteSandbox?: Resolver<boolean, {}, TContext, RequireFields<{ id: string }, 'id'>>;
  extendSandbox?: Resolver<SandboxTenantProfile, {}, TContext, RequireFields<{ id: string; days: number }, 'id' | 'days'>>;
  cloneData?: Resolver<DataCloneResult, {}, TContext, RequireFields<{ input: DataCloneInput }, 'input'>>;
  generateSyntheticData?: Resolver<SyntheticDataResult, {}, TContext, RequireFields<{ input: SyntheticDataInput }, 'input'>>;
  runScenario?: Resolver<SyntheticDataResult, {}, TContext, RequireFields<{ input: ScenarioSimulationInput }, 'input'>>;
  executeSandboxQuery?: Resolver<SandboxQueryResult, {}, TContext, RequireFields<{ input: SandboxQueryInput }, 'input'>>;
  startSession?: Resolver<DataLabSession, {}, TContext, RequireFields<{ sandboxId: string }, 'sandboxId'>>;
  endSession?: Resolver<boolean, {}, TContext, RequireFields<{ sessionId: string }, 'sessionId'>>;
  createPromotionRequest?: Resolver<PromotionRequest, {}, TContext, RequireFields<{ input: CreatePromotionInput }, 'input'>>;
  submitForReview?: Resolver<PromotionRequest, {}, TContext, RequireFields<{ requestId: string; reviewers: string[] }, 'requestId' | 'reviewers'>>;
  reviewPromotion?: Resolver<PromotionRequest, {}, TContext, RequireFields<{ input: PromotionReviewInput }, 'input'>>;
  executePromotion?: Resolver<PromotionRequest, {}, TContext, RequireFields<{ requestId: string }, 'requestId'>>;
  rollbackPromotion?: Resolver<PromotionRequest, {}, TContext, RequireFields<{ requestId: string; reason: string }, 'requestId' | 'reason'>>;
  cancelPromotion?: Resolver<PromotionRequest, {}, TContext, RequireFields<{ requestId: string }, 'requestId'>>;
}

export interface SubscriptionResolvers<TContext = GraphQLContext> {
  sandboxStatusChanged?: SubscriptionResolver<SandboxTenantProfile, {}, TContext, { sandboxId: string }>;
  dataCloneProgress?: SubscriptionResolver<DataCloneResult, {}, TContext, { requestId: string }>;
  syntheticDataProgress?: SubscriptionResolver<SyntheticDataResult, {}, TContext, { requestId: string }>;
  promotionStatusChanged?: SubscriptionResolver<PromotionRequest, {}, TContext, { requestId: string }>;
  linkbackAlert?: SubscriptionResolver<LinkbackAttempt, {}, TContext, { sandboxId: string }>;
}

type SubscriptionResolver<TResult, TParent, TContext, TArgs> = {
  subscribe: (parent: TParent, args: TArgs, context: TContext, info: GraphQLResolveInfo) => AsyncIterator<TResult>;
  resolve?: (value: TResult) => TResult;
};

// Output types
export interface SandboxTenantProfile {
  id: string;
  name: string;
  description?: string;
  tenantType: TenantType;
  parentTenantId?: string;
  ownerId: string;
  teamIds: string[];
  allowedUserIds: string[];
  isolationLevel: SandboxIsolationLevel;
  resourceQuotas: ResourceQuota;
  dataAccessPolicy: DataAccessPolicy;
  connectorRestrictions: ConnectorRestriction[];
  uiIndicators: UIIndicatorConfig;
  auditConfig: AuditConfig;
  integrationRestrictions: IntegrationRestrictions;
  complianceFrameworks: string[];
  dataClassification: string;
  status: SandboxStatus;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  lastAccessedAt?: Date;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface ResourceQuota {
  maxCpuMs: number;
  maxMemoryMb: number;
  maxStorageGb: number;
  maxExecutionsPerHour: number;
  maxConcurrentSandboxes: number;
  maxDataExportMb: number;
  maxNetworkBytesPerHour: number;
}

export interface DataAccessPolicy {
  mode: DataAccessMode;
  maxRecords: number;
  allowedEntityTypes: string[];
  blockedEntityTypes: string[];
  piiHandling: string;
  allowLinkbackToProduction: boolean;
  requireAnonymizationAudit: boolean;
  retentionDays: number;
}

export interface ConnectorRestriction {
  connectorType: ConnectorType;
  allowed: boolean;
  allowlist: string[];
  blocklist: string[];
  requireApproval: boolean;
  auditAllAccess: boolean;
}

export interface UIIndicatorConfig {
  mode: string;
  bannerText: string;
  bannerColor: string;
  watermarkText: string;
  watermarkOpacity: number;
  showDataSourceWarning: boolean;
  confirmBeforeExport: boolean;
}

export interface AuditConfig {
  logAllQueries: boolean;
  logAllMutations: boolean;
  logDataAccess: boolean;
  logExportAttempts: boolean;
  logLinkbackAttempts: boolean;
  alertOnSuspiciousActivity: boolean;
  retainAuditLogsDays: number;
  exportAuditFormat: string;
}

export interface IntegrationRestrictions {
  allowFederation: boolean;
  allowExternalExports: boolean;
  allowWebhooks: boolean;
  allowApiKeys: boolean;
  allowedIntegrations: string[];
  blockedIntegrations: string[];
  maxExternalCalls: number;
}

export interface SandboxPreset {
  name: string;
  description: string;
  isolationLevel: SandboxIsolationLevel;
  tenantType: TenantType;
}

export interface ValidationFinding {
  severity: string;
  code: string;
  message: string;
  field?: string;
  suggestion?: string;
}

export interface ValidationReport {
  valid: boolean;
  findings: ValidationFinding[];
  timestamp: Date;
  profileId: string;
}

export interface EnforcementDecision {
  allowed: boolean;
  reason: string;
  code?: string;
  requiresAudit: boolean;
  warnings: string[];
  filters?: Record<string, unknown>[];
}

export interface LinkbackAttempt {
  id: string;
  sandboxId: string;
  userId: string;
  timestamp: Date;
  sourceType: string;
  sourceId: string;
  targetProductionId?: string;
  blocked: boolean;
  reason: string;
  riskScore: number;
  metadata?: Record<string, unknown>;
}

export interface DataCloneResult {
  id: string;
  requestId: string;
  sandboxId: string;
  status: string;
  statistics: DataCloneStatistics;
  audit: DataCloneAudit;
  outputLocation?: string;
  outputNodeId?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface DataCloneStatistics {
  sourceRecords: number;
  clonedRecords: number;
  anonymizedFields: number;
  relationshipsCloned: number;
  processingTimeMs: number;
}

export interface DataCloneAudit {
  anonymizationReport: AnonymizationReportEntry[];
  validationPassed: boolean;
  warnings: string[];
}

export interface AnonymizationReportEntry {
  fieldPath: string;
  technique: string;
  recordsAffected: number;
}

export interface SyntheticDataResult {
  id: string;
  sandboxId: string;
  status: string;
  statistics: SyntheticDataStatistics;
  outputLocation?: string;
  sampleData?: Record<string, unknown>[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface SyntheticDataStatistics {
  entitiesGenerated: number;
  relationshipsGenerated: number;
  byEntityType: Record<string, number>;
  generationTimeMs: number;
}

export interface ScenarioTemplate {
  id: string;
  name: string;
  description?: string;
  category: ScenarioCategory;
  entityTemplates: Record<string, unknown>[];
  relationshipTemplates: Record<string, unknown>[];
  parameters: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
  isPublic: boolean;
  tags: string[];
}

export interface SandboxQueryResult {
  id: string;
  sandboxId: string;
  status: string;
  data?: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
  plan?: string;
  warnings: string[];
  error?: string;
}

export interface PromotionRequest {
  id: string;
  sandboxId: string;
  requesterId: string;
  targetTenantId: string;
  promotionType: PromotionType;
  artifactId: string;
  artifactName: string;
  artifactVersion?: string;
  status: PromotionStatus;
  reviewers: string[];
  approvals: PromotionApproval[];
  validationResults: PromotionValidationResults;
  justification: string;
  rollbackPlan?: string;
  createdAt: Date;
  updatedAt: Date;
  promotedAt?: Date;
}

export interface PromotionApproval {
  reviewerId: string;
  decision: string;
  comments?: string;
  timestamp: Date;
}

export interface PromotionValidationResults {
  securityScan?: Record<string, unknown>;
  performanceTest?: Record<string, unknown>;
  complianceCheck?: Record<string, unknown>;
  dataLeakageScan?: Record<string, unknown>;
}

export interface DataLabSession {
  id: string;
  sandboxId: string;
  userId: string;
  startedAt: Date;
  lastActivityAt: Date;
  operationCount: number;
}

export interface HealthStatus {
  status: string;
  version: string;
  uptime: number;
  dependencies: DependencyHealth[];
}

export interface DependencyHealth {
  name: string;
  status: string;
  latencyMs?: number;
  error?: string;
}
