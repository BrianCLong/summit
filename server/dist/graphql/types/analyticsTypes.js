"use strict";
const gql = require('graphql-tag');
const analyticsTypes = gql `
  extend type Mutation {
    extractEntities(text: String!): [Entity!]!
  }

  extend type Query {
    linkSuggestions(investigationId: ID!): [Relationship!]!
  }
`;
module.exports = analyticsTypes;
//# sourceMappingURL=analyticsTypes.js.map