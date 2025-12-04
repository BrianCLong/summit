import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  scalar JSON
  scalar DateTime

  """
  Core entity in the IntelGraph knowledge base
  """
  type Entity {
    id: ID!
    type: String!
    name: String!
    attributes: JSON
    sources: [Source!]!
    degree: Int!
    """
    Confidence score for entity resolution (0.0 - 1.0)
    """
    confidence: Float
    """
    Creation timestamp
    """
    createdAt: DateTime!
    """
    Last update timestamp
    """
    updatedAt: DateTime!
    """
    Data retention tier
    """
    retentionTier: String!
    """
    Purpose classification for data usage
    """
    purpose: String!
    """
    Data residency region
    """
    region: String!
  }

  """
  Threat intelligence indicator
  """
  type Indicator {
    id: ID!
    iocType: String!
    value: String!
    confidence: Float
    sources: [Source!]!
    """
    Related entities through graph traversal
    """
    relatedEntities: [Entity!]!
    """
    First seen timestamp
    """
    firstSeen: DateTime
    """
    Last seen timestamp
    """
    lastSeen: DateTime
    """
    Tags and classifications
    """
    tags: [String!]!
  }

  """
  Data source provenance information
  """
  type Source {
    id: ID!
    system: String!
    collectedAt: DateTime!
    """
    Provenance metadata including collection method
    """
    provenance: JSON
    """
    Source reliability score
    """
    reliability: Float
  }

  """
  Graph path between entities
  """
  type PathStep {
    from: ID!
    to: ID!
    relType: String!
    """
    Path traversal score/weight
    """
    score: Float
    """
    Edge properties
    """
    properties: JSON
  }

  """
  Graph analytics and insights
  """
  type GraphInsight {
    type: String!
    """
    Insight relevance score
    """
    score: Float!
    """
    Related entities
    """
    entities: [Entity!]!
    """
    Insight description
    """
    description: String
    """
    Supporting evidence
    """
    evidence: [JSON!]!
  }

  """
  Entity search filters
  """
  input EntityFilter {
    types: [String!]
    purposes: [String!]
    regions: [String!]
    sources: [String!]
    retentionTiers: [String!]
    """
    Date range filter
    """
    dateRange: DateRangeInput
    """
    Confidence threshold (0.0 - 1.0)
    """
    minConfidence: Float
  }

  """
  Date range input
  """
  input DateRangeInput {
    from: DateTime!
    to: DateTime!
  }

  """
  Pagination input
  """
  input PaginationInput {
    limit: Int = 25
    offset: Int = 0
  }

  """
  Entity search results with pagination
  """
  type EntitySearchResult {
    entities: [Entity!]!
    totalCount: Int!
    hasMore: Boolean!
    """
    Next pagination cursor
    """
    nextCursor: String
  }

  """
  Query root type
  """
  type Query {
    """
    Get entity by ID with ABAC policy enforcement
    """
    entityById(id: ID!): Entity

    """
    Search entities with filtering and pagination
    """
    searchEntities(
      query: String!
      filter: EntityFilter
      pagination: PaginationInput
    ): EntitySearchResult!

    """
    Find shortest path between two entities (max 3 hops per SLO)
    """
    pathBetween(fromId: ID!, toId: ID!, maxHops: Int = 3): [PathStep!]!

    """
    Get threat intelligence indicators
    """
    indicators(filter: EntityFilter, pagination: PaginationInput): [Indicator!]!

    """
    Get graph-based insights for entity or set of entities
    """
    insights(entityIds: [ID!]!, insightTypes: [String!]): [GraphInsight!]!

    """
    Entity relationship graph for visualization
    """
    entityGraph(
      centerEntityId: ID!
      depth: Int = 2
      relationTypes: [String!]
    ): EntityGraph!

    """
    Health check for API availability
    """
    health: HealthStatus!
  }

  """
  Entity graph for visualization
  """
  type EntityGraph {
    nodes: [EntityNode!]!
    edges: [EntityEdge!]!
    """
    Graph statistics
    """
    stats: GraphStats!
  }

  """
  Graph node representation
  """
  type EntityNode {
    id: ID!
    label: String!
    type: String!
    """
    Node size/importance score
    """
    weight: Float!
    """
    Visual properties
    """
    properties: JSON
  }

  """
  Graph edge representation
  """
  type EntityEdge {
    id: ID!
    source: ID!
    target: ID!
    type: String!
    """
    Edge weight/strength
    """
    weight: Float!
    """
    Edge properties and metadata
    """
    properties: JSON
  }

  """
  Graph statistics
  """
  type GraphStats {
    nodeCount: Int!
    edgeCount: Int!
    density: Float!
    """
    Average clustering coefficient
    """
    clustering: Float!
  }

  """
  API health status
  """
  type HealthStatus {
    status: String!
    timestamp: DateTime!
    version: String!
    """
    Component health details
    """
    components: JSON!
    """
    Performance metrics
    """
    metrics: JSON!
  }

  """
  Subscription root type for real-time updates
  """
  type Subscription {
    """
    Real-time entity updates
    """
    entityUpdated(entityId: ID!): Entity!

    """
    New insights generated
    """
    insightGenerated(entityIds: [ID!]): GraphInsight!
  }

  """
  Policy label for compliance and data governance
  """
  type PolicyLabel {
    """
    Origin classification
    """
    origin: String
    """
    Sensitivity level
    """
    sensitivity: String
    """
    Legal basis for processing
    """
    legalBasis: String
    """
    Data residency requirement
    """
    residency: String
    """
    Retention tier
    """
    retentionTier: String
    """
    Additional policy metadata
    """
    metadata: JSON
  }

  """
  Input for policy labels
  """
  input PolicyLabelInput {
    origin: String
    sensitivity: String
    legalBasis: String
    residency: String
    retentionTier: String
    metadata: JSON
  }

  """
  Claim entity representing assertions or statements
  """
  type Claim {
    id: ID!
    """
    Claim type category
    """
    claimType: String!
    """
    The claim statement
    """
    statement: String!
    """
    Claim subject(s)
    """
    subjects: [JSON!]!
    """
    Claim source(s)
    """
    sources: [JSON!]!
    """
    Verification details
    """
    verification: JSON
    """
    Policy labels for compliance
    """
    policyLabels: PolicyLabel
    """
    Related claims
    """
    relatedClaims: [JSON!]
    """
    Context (case ID, investigation ID, etc.)
    """
    context: JSON
    """
    Creation timestamp
    """
    createdAt: DateTime!
    """
    Last update timestamp
    """
    updatedAt: DateTime!
    """
    Additional properties
    """
    properties: JSON
  }

  """
  Evidence entity representing supporting artifacts
  """
  type Evidence {
    id: ID!
    """
    Evidence title/name
    """
    title: String!
    """
    Description of the evidence
    """
    description: String
    """
    Evidence type
    """
    evidenceType: String!
    """
    Evidence sources
    """
    sources: [JSON!]!
    """
    Evidence blobs/artifacts
    """
    blobs: [JSON!]!
    """
    Policy labels for compliance
    """
    policyLabels: PolicyLabel!
    """
    Context linking
    """
    context: JSON
    """
    Verification status
    """
    verification: JSON
    """
    Tags for categorization
    """
    tags: [String!]
    """
    Creation timestamp
    """
    createdAt: DateTime!
    """
    Last update timestamp
    """
    updatedAt: DateTime!
    """
    Additional properties
    """
    properties: JSON
  }

  """
  Decision entity representing decisions made with evidence
  """
  type Decision {
    id: ID!
    """
    Decision title/summary
    """
    title: String!
    """
    Detailed decision description
    """
    description: String
    """
    Decision context (case, investigation, maestro run, etc.)
    """
    context: JSON!
    """
    Options considered
    """
    options: [JSON!]
    """
    Selected option ID
    """
    selectedOption: String
    """
    Decision rationale
    """
    rationale: String
    """
    Is this decision reversible?
    """
    reversible: Boolean!
    """
    Decision status
    """
    status: String!
    """
    Who made the decision
    """
    decidedBy: JSON
    """
    When the decision was made
    """
    decidedAt: DateTime
    """
    Who approved the decision
    """
    approvedBy: [JSON!]
    """
    Evidence supporting this decision
    """
    evidence: [Evidence!]
    """
    Related claims
    """
    claims: [Claim!]
    """
    Policy labels for compliance
    """
    policyLabels: PolicyLabel!
    """
    Risk assessment
    """
    risks: [JSON!]
    """
    Owners responsible for implementation
    """
    owners: [JSON!]
    """
    Checks/gates before implementation
    """
    checks: [JSON!]
    """
    Tags for categorization
    """
    tags: [String!]
    """
    Creation timestamp
    """
    createdAt: DateTime!
    """
    Last update timestamp
    """
    updatedAt: DateTime!
    """
    Additional properties
    """
    properties: JSON
  }

  """
  Input for creating a Claim
  """
  input CreateClaimInput {
    claimType: String!
    statement: String!
    subjects: [JSON!]!
    sources: [JSON!]!
    verification: JSON
    policyLabels: PolicyLabelInput
    relatedClaims: [JSON!]
    context: JSON
    properties: JSON
  }

  """
  Input for creating Evidence
  """
  input CreateEvidenceInput {
    title: String!
    description: String
    evidenceType: String!
    sources: [JSON!]!
    blobs: [JSON!]!
    policyLabels: PolicyLabelInput!
    context: JSON
    verification: JSON
    tags: [String!]
    properties: JSON
  }

  """
  Input for creating a Decision
  """
  input CreateDecisionInput {
    title: String!
    description: String
    context: JSON!
    options: [JSON!]
    selectedOption: String
    rationale: String
    reversible: Boolean!
    status: String!
    decidedBy: JSON
    decidedAt: DateTime
    approvedBy: [JSON!]
    evidenceIds: [ID!]
    claimIds: [ID!]
    policyLabels: PolicyLabelInput!
    risks: [JSON!]
    owners: [JSON!]
    checks: [JSON!]
    tags: [String!]
    properties: JSON
  }

  extend type Query {
    """
    Get Claim by ID
    """
    claimById(id: ID!): Claim

    """
    Get Evidence by ID
    """
    evidenceById(id: ID!): Evidence

    """
    Get Decision by ID
    """
    decisionById(id: ID!): Decision

    """
    Search Claims
    """
    searchClaims(
      query: String!
      filter: EntityFilter
      pagination: PaginationInput
    ): [Claim!]!

    """
    Search Evidence
    """
    searchEvidence(
      query: String!
      filter: EntityFilter
      pagination: PaginationInput
    ): [Evidence!]!

    """
    Search Decisions
    """
    searchDecisions(
      query: String!
      filter: EntityFilter
      pagination: PaginationInput
    ): [Decision!]!
  }

  """
  Mutation root type (Sprint 1)
  """
  type Mutation {
    """
    Create a new Claim
    """
    createClaim(input: CreateClaimInput!): Claim!

    """
    Create new Evidence
    """
    createEvidence(input: CreateEvidenceInput!): Evidence!

    """
    Create a new Decision
    """
    createDecision(input: CreateDecisionInput!): Decision!

    """
    Update a Claim
    """
    updateClaim(id: ID!, input: CreateClaimInput!): Claim!

    """
    Update Evidence
    """
    updateEvidence(id: ID!, input: CreateEvidenceInput!): Evidence!

    """
    Update a Decision
    """
    updateDecision(id: ID!, input: CreateDecisionInput!): Decision!
  }
`;
