import { gql } from 'graphql-tag';

const subscriptionTypeDefs = gql`
  type GraphEventEnvelope {
    id: ID!
    type: String!
    investigationId: ID
    tenantId: String
    timestamp: String!
    payload: JSON!
  }

  type GraphEventBatch {
    cursor: ID!
    events: [GraphEventEnvelope!]!
  }

  extend type Subscription {
    entityCreated(investigationId: ID): Entity!
    entityUpdated(investigationId: ID): Entity!
    entityDeleted(investigationId: ID): ID!

    relationshipCreated(investigationId: ID): Relationship!
    relationshipUpdated(investigationId: ID): Relationship!
    relationshipDeleted(investigationId: ID): ID!

    investigationUpdated(investigationId: ID): Investigation!
    graphUpdated(investigationId: ID): JSON!

    graphEvents(
      investigationId: ID
      types: [String!]
      batchSize: Int = 20
      flushIntervalMs: Int = 250
    ): GraphEventBatch!
  }
`;

module.exports = { subscriptionTypeDefs };
