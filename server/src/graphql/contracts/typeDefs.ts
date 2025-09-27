import { gql } from 'graphql-tag';

export const contractsTypeDefs = gql`
  """Common JSON scalar"""
  scalar JSON
  """ISO-8601 timestamp"""
  scalar DateTime

  """
  Annotates a field with a static cost estimate that can be used by
  persisted query tooling to enforce read/write SLOs.
  """
  directive @cost(
    complexity: Int!
    estimatedMs: Int!
    scope: CostScope = FIELD
  ) on FIELD_DEFINITION

  """
  Declares the target SLO for an operation. Enforcement occurs in the
  resolver diagnostics emitted to observability sinks.
  """
  directive @slo(targetMs: Int!, percentile: Int!) on FIELD_DEFINITION | OBJECT

  enum CostScope {
    FIELD
    OBJECT
    CONNECTION
  }

  enum SortDirection {
    ASC
    DESC
  }

  enum PublicRelationshipDirection {
    INBOUND
    OUTBOUND
    BIDIRECTIONAL
  }

  enum PublicInvestigationStatus {
    ACTIVE
    ARCHIVED
    COMPLETED
  }

  enum PublicEntitySortField {
    UPDATED_AT
    CREATED_AT
    CONFIDENCE
    DEGREE
  }

  enum PublicTimelineEventKind {
    ENTITY_CREATED
    ENTITY_UPDATED
    RELATIONSHIP_CREATED
    RELATIONSHIP_DELETED
    NOTE_ADDED
    STATUS_CHANGED
  }

  type PolicyDecision {
    allow: Boolean!
    reason: String
    obligations: [String!]!
  }

  type ResolverDiagnostics {
    fromCache: Boolean!
    lastEvaluatedAt: DateTime!
    durationMs: Int!
    attempts: Int!
    estimatedCostMs: Int!
    sloTargetMs: Int!
  }

  type BackpressureAdvice {
    throttleSeconds: Int
    recommendedPageSize: Int
    reason: String
  }

  type PaginationInfo {
    hasNextPage: Boolean!
    endCursor: String
    throttleUntil: DateTime
  }

  type PublicError {
    code: String!
    message: String!
    field: String
    retryable: Boolean!
    context: JSON
  }

  type PublicInvestigationSummary {
    id: ID!
    name: String!
    status: PublicInvestigationStatus!
    priority: String
    ownerId: String
  }

  type PublicEntity {
    id: ID!
    tenantId: String!
    kind: String!
    labels: [String!]!
    properties: JSON!
    confidence: Float
    degree: Int
    createdAt: DateTime!
    updatedAt: DateTime!
    lastIngestedAt: DateTime
    retentionClass: String
    geographicScope: String
    piiTags: [String!]!
    sourceSystems: [String!]!
    investigation: PublicInvestigationSummary
  }

  type PublicRelationship {
    id: ID!
    tenantId: String!
    type: String!
    properties: JSON!
    confidence: Float
    createdAt: DateTime!
    updatedAt: DateTime!
    source: PublicEntity!
    target: PublicEntity!
  }

  type PublicRelationshipEdge {
    cursor: String!
    node: PublicRelationship!
    policy: PolicyDecision!
  }

  type PublicRelationshipConnection @slo(targetMs: 350, percentile: 95) {
    nodes: [PublicRelationship!]!
    edges: [PublicRelationshipEdge!]!
    totalCount: Int!
    pageInfo: PaginationInfo!
    backpressure: BackpressureAdvice
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    errors: [PublicError!]!
  }

  type PublicEntityEdge {
    cursor: String!
    node: PublicEntity!
    policy: PolicyDecision!
  }

  type PublicEntityConnection @slo(targetMs: 350, percentile: 95) {
    nodes: [PublicEntity!]!
    edges: [PublicEntityEdge!]!
    totalCount: Int!
    pageInfo: PaginationInfo!
    backpressure: BackpressureAdvice
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    errors: [PublicError!]!
  }

  type PublicInvestigation {
    id: ID!
    tenantId: String!
    name: String!
    description: String
    status: PublicInvestigationStatus!
    priority: String
    ownerId: String
    tags: [String!]!
    props: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    entityCount: Int!
    relationshipCount: Int!
  }

  type PublicInvestigationEdge {
    cursor: String!
    node: PublicInvestigation!
    policy: PolicyDecision!
  }

  type PublicInvestigationConnection @slo(targetMs: 350, percentile: 95) {
    nodes: [PublicInvestigation!]!
    edges: [PublicInvestigationEdge!]!
    totalCount: Int!
    pageInfo: PaginationInfo!
    backpressure: BackpressureAdvice
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    errors: [PublicError!]!
  }

  type PublicTimelineEvent {
    id: ID!
    investigationId: ID!
    entityId: ID
    relationshipId: ID
    kind: PublicTimelineEventKind!
    occurredAt: DateTime!
    actorId: ID
    payload: JSON!
  }

  type PublicTimelineEdge {
    cursor: String!
    node: PublicTimelineEvent!
  }

  type PublicTimelineConnection @slo(targetMs: 350, percentile: 95) {
    nodes: [PublicTimelineEvent!]!
    edges: [PublicTimelineEdge!]!
    totalCount: Int!
    pageInfo: PaginationInfo!
    backpressure: BackpressureAdvice
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    errors: [PublicError!]!
  }

  type PublicEntityResult {
    entity: PublicEntity
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    errors: [PublicError!]!
  }

  type PublicNeighborhood {
    center: PublicEntity
    entities: [PublicEntity!]!
    relationships: [PublicRelationship!]!
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    backpressure: BackpressureAdvice
    errors: [PublicError!]!
  }

  type PublicMutationResult {
    ok: Boolean!
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    errors: [PublicError!]!
  }

  type PublicBatchFailure {
    input: PublicUpsertEntityInput!
    errors: [PublicError!]!
  }

  type PublicBatchResult {
    ok: Boolean!
    accepted: Int!
    failed: Int!
    failures: [PublicBatchFailure!]!
    policy: PolicyDecision!
    diagnostics: ResolverDiagnostics!
    errors: [PublicError!]!
  }

  input PaginationInput {
    first: Int = 25
    after: String
  }

  input BackpressureInput {
    maxWindowMs: Int = 5000
    clientLagMs: Int = 0
  }

  input PublicEntityFilter {
    tenantId: String!
    ids: [ID!]
    kinds: [String!]
    labels: [String!]
    search: String
    minConfidence: Float
    maxConfidence: Float
    investigationId: ID
    sourceSystems: [String!]
    piiTags: [String!]
    updatedAfter: DateTime
    updatedBefore: DateTime
  }

  input PublicEntitySort {
    field: PublicEntitySortField!
    direction: SortDirection = DESC
  }

  input PublicRelationshipFilter {
    tenantId: String!
    entityId: ID
    types: [String!]
    direction: PublicRelationshipDirection = BIDIRECTIONAL
  }

  input PublicInvestigationFilter {
    tenantId: String!
    status: [PublicInvestigationStatus!]
    search: String
    updatedAfter: DateTime
    updatedBefore: DateTime
    tags: [String!]
  }

  input PublicTimelineFilter {
    tenantId: String!
    investigationId: ID!
    kinds: [PublicTimelineEventKind!]
    since: DateTime
  }

  input PublicNeighborhoodInput {
    tenantId: String!
    entityId: ID!
    maxDepth: Int = 2
    maxDegree: Int = 200
    relationshipTypes: [String!]
    backpressure: BackpressureInput
  }

  input PublicUpsertEntityInput {
    id: ID
    tenantId: String!
    kind: String!
    labels: [String!] = []
    properties: JSON = {}
    confidence: Float
    investigationId: ID
    sourceSystems: [String!]
    piiTags: [String!]
    retentionClass: String
  }

  input PublicLinkEntitiesInput {
    tenantId: String!
    sourceId: ID!
    targetId: ID!
    type: String!
    properties: JSON = {}
    confidence: Float
  }

  input PublicAddInvestigationNoteInput {
    tenantId: String!
    investigationId: ID!
    note: String!
    visibility: String = "internal"
  }

  input PublicAcknowledgeInvestigationInput {
    tenantId: String!
    investigationId: ID!
    state: PublicInvestigationStatus!
    note: String
  }

  input PublicBatchOptions {
    dedupe: Boolean = true
    async: Boolean = false
    dryRun: Boolean = false
  }

  type Query {
    publicEntity(
      id: ID!
      backpressure: BackpressureInput
    ): PublicEntityResult!
      @cost(complexity: 45, estimatedMs: 120, scope: OBJECT)
      @slo(targetMs: 350, percentile: 95)

    publicEntities(
      filter: PublicEntityFilter!
      pagination: PaginationInput = {}
      sort: PublicEntitySort
      backpressure: BackpressureInput
    ): PublicEntityConnection!
      @cost(complexity: 120, estimatedMs: 220, scope: CONNECTION)
      @slo(targetMs: 350, percentile: 95)

    publicRelationships(
      filter: PublicRelationshipFilter!
      pagination: PaginationInput = {}
      backpressure: BackpressureInput
    ): PublicRelationshipConnection!
      @cost(complexity: 95, estimatedMs: 210, scope: CONNECTION)
      @slo(targetMs: 350, percentile: 95)

    publicInvestigations(
      filter: PublicInvestigationFilter!
      pagination: PaginationInput = {}
      backpressure: BackpressureInput
    ): PublicInvestigationConnection!
      @cost(complexity: 80, estimatedMs: 180, scope: CONNECTION)
      @slo(targetMs: 350, percentile: 95)

    publicInvestigationTimeline(
      filter: PublicTimelineFilter!
      pagination: PaginationInput = {}
    ): PublicTimelineConnection!
      @cost(complexity: 70, estimatedMs: 160, scope: CONNECTION)
      @slo(targetMs: 350, percentile: 95)

    publicEntityNeighborhood(
      input: PublicNeighborhoodInput!
    ): PublicNeighborhood!
      @cost(complexity: 200, estimatedMs: 320, scope: OBJECT)
      @slo(targetMs: 350, percentile: 95)
  }

  type Mutation {
    publicUpsertEntity(
      input: PublicUpsertEntityInput!
    ): PublicMutationResult!
      @cost(complexity: 110, estimatedMs: 420, scope: OBJECT)
      @slo(targetMs: 700, percentile: 95)

    publicLinkEntities(
      input: PublicLinkEntitiesInput!
    ): PublicMutationResult!
      @cost(complexity: 95, estimatedMs: 480, scope: OBJECT)
      @slo(targetMs: 700, percentile: 95)

    publicAddInvestigationNote(
      input: PublicAddInvestigationNoteInput!
    ): PublicMutationResult!
      @cost(complexity: 60, estimatedMs: 260, scope: FIELD)
      @slo(targetMs: 700, percentile: 95)

    publicAcknowledgeInvestigation(
      input: PublicAcknowledgeInvestigationInput!
    ): PublicMutationResult!
      @cost(complexity: 70, estimatedMs: 280, scope: FIELD)
      @slo(targetMs: 700, percentile: 95)

    publicBatchIngestEntities(
      input: [PublicUpsertEntityInput!]!
      options: PublicBatchOptions
    ): PublicBatchResult!
      @cost(complexity: 240, estimatedMs: 640, scope: OBJECT)
      @slo(targetMs: 700, percentile: 95)
  }

  type Subscription {
    publicInvestigationEvents(
      investigationId: ID!
      tenantId: String!
    ): PublicTimelineEvent!
      @cost(complexity: 40, estimatedMs: 120, scope: FIELD)
      @slo(targetMs: 250, percentile: 95)
  }
`;

export default contractsTypeDefs;
