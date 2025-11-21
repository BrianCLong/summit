import { gql } from 'apollo-server-express';

export const activityTypeDefs = gql`
  type Activity {
    id: ID!
    tenantId: String!
    sequenceNumber: String!
    actionType: String!
    resourceType: String!
    resourceId: String!
    actorId: String!
    actorType: String!
    payload: JSON
    metadata: JSON
    timestamp: DateTime!
  }

  extend type Query {
    activities(
      limit: Int = 50
      offset: Int = 0
      actionType: String
      resourceType: String
    ): [Activity!]!
  }
`;
