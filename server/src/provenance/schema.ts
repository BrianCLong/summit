
import gql from 'graphql-tag';

export const provenanceTypeDefs = gql`
  scalar DateTime
  scalar JSON

  enum MutationType {
    CREATE
    UPDATE
    DELETE
    LINK
    UNLINK
    MERGE
  }

  type EntityState {
    id: String!
    type: String!
    version: Int!
    data: JSON
    metadata: JSON
  }

  type JsonPatch {
    op: String!
    path: String!
    value: JSON
    from: String
  }

  type MutationPayload {
    mutationType: MutationType!
    entityId: String!
    entityType: String!
    previousState: EntityState
    newState: EntityState
    diff: [JsonPatch!]
    reason: String
  }

  type MutationWitness {
    witnessId: String!
    timestamp: DateTime!
    signature: String!
    algorithm: String!
    validationResult: JSON
  }

  type CrossServiceAttribution {
    originService: String!
    originRegion: String
    traceId: String!
    upstreamEvents: [UpstreamEvent!]
  }

  type UpstreamEvent {
    service: String!
    eventId: String!
    timestamp: DateTime!
  }

  type ProvenanceEntry {
    id: String!
    tenantId: String!
    sequenceNumber: String!
    previousHash: String!
    currentHash: String!
    timestamp: DateTime!
    actionType: String!
    resourceType: String!
    resourceId: String!
    actorId: String!
    actorType: String!
    payload: MutationPayload
    metadata: JSON
    signature: String
    witness: MutationWitness
    attribution: CrossServiceAttribution
  }

  type ProvenanceChainVerification {
    valid: Boolean!
    totalEntries: Int!
    brokenChains: Int!
    invalidHashes: Int!
    missingEntries: Int!
    lastVerifiedSequence: String
    verificationTime: Float!
  }

  extend type Query {
    """
    Get the full lineage of an entity, showing all mutations over time.
    """
    entityLineage(
      id: String!
      limit: Int
      offset: Int
      order: String
    ): [ProvenanceEntry!]

    """
    Get provenance entries for a specific resource type.
    """
    resourceProvenance(
      resourceType: String!
      limit: Int
      offset: Int
    ): [ProvenanceEntry!]

    """
    Verify the integrity of the provenance chain for the current tenant.
    """
    verifyProvenanceChain: ProvenanceChainVerification!

    """
    Explain the causality of a specific outcome or action.
    """
    explainCausality(
      nodeId: String!
      depth: Int
    ): CanonicalGraphPath

    """
    Get the difference between two states in the provenance graph.
    """
    provenanceDiff(
      startNodeId: String!
      endNodeId: String!
    ): GraphDiff

    """
    Export the provenance graph for the tenant.
    """
    exportProvenanceGraph(
      from: DateTime
      to: DateTime
    ): ProvenanceGraphExport
  }

  type ProvenanceGraphExport {
    nodes: [CanonicalNode!]!
    edges: [CanonicalEdge!]!
    generatedAt: DateTime!
    checksum: String!
  }

  type CanonicalNode {
    id: String!
    tenantId: String!
    nodeType: String!
    subType: String!
    label: String!
    timestamp: DateTime!
    metadata: JSON
    hash: String
    sourceEntryId: String
  }

  type CanonicalEdge {
    sourceId: String!
    targetId: String!
    relation: String!
    timestamp: DateTime!
    properties: JSON
  }

  type CanonicalGraphPath {
    nodes: [CanonicalNode!]!
    edges: [CanonicalEdge!]!
  }

  type GraphDiff {
    additions: [CanonicalNode!]!
    deletions: [CanonicalNode!]!
    modifications: [NodeModification!]!
  }

  type NodeModification {
    nodeId: String!
    field: String!
    oldValue: JSON
    newValue: JSON
  }
`;
