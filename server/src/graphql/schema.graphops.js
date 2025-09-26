const gql = require('graphql-tag');

const typeDefs = gql`
  extend type Entity {
    id: ID!
    label: String!
    type: String!
    tags: [String!]!
  }

  extend type Mutation {
    # Expands neighbors around a given entity with role-based limits
    expandNeighbors(entityId: ID!, limit: Int): Graph

    # Expands neighborhood for an entity within an investigation
    expandNeighborhood(entityId: ID!, investigationId: ID!, radius: Int!): Graph

    # Tags an entity with a given string
    tagEntity(entityId: ID!, tag: String!): Entity!

    # Deletes a tag from an entity
    deleteTag(entityId: ID!, tag: String!): Entity!

    # Enqueues a request for AI to analyze an entity
    requestAIAnalysis(entityId: ID!): AIRequestResult!

    # Creates a tagged snapshot or reverts the graph to a specific version
    manageGraphVersion(input: GraphVersionControlInput!): GraphVersionPayload!
  }

  type AIRequestResult {
    ok: Boolean!
    requestId: ID
  }

  enum GraphVersionAction {
    TAG
    REVERT
  }

  input GraphVersionControlInput {
    action: GraphVersionAction!
    tag: String
    description: String
    metadata: JSON
    investigationId: ID
    versionId: ID
  }

  type GraphVersionMetadata {
    id: ID!
    tenantId: ID!
    scope: String!
    tag: String!
    description: String
    snapshotKey: String!
    snapshotBucket: String!
    graphHash: String!
    nodeCount: Int!
    relationshipCount: Int!
    diffSummary: JSON!
    metadata: JSON
    createdBy: ID
    createdAt: DateTime!
    lastAppliedAt: DateTime
    lastAppliedBy: ID
  }

  type GraphVersionDiffSummary {
    nodesAdded: Int!
    nodesUpdated: Int!
    nodesRemoved: Int!
    relationshipsAdded: Int!
    relationshipsUpdated: Int!
    relationshipsRemoved: Int!
  }

  type GraphVersionPayload {
    ok: Boolean!
    action: GraphVersionAction!
    version: GraphVersionMetadata
    diff: GraphVersionDiffSummary!
  }
`;

module.exports = { graphTypeDefs: typeDefs };
