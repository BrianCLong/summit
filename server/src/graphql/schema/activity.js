"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityTypeDefs = void 0;
const apollo_server_express_1 = require("apollo-server-express");
exports.activityTypeDefs = (0, apollo_server_express_1.gql) `
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
