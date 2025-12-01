
import { gql } from 'apollo-server-express';

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
  }
`;
