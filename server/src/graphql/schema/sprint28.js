"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sprint28TypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.sprint28TypeDefs = (0, graphql_tag_1.gql) `
  type NpsResponse {
    id: ID!
    score: Int!
    comment: String
    ts: String!
    workspaceId: ID!
  }

  type FunnelPoint {
    name: String!
    value: Int!
    period: String!
  }

  type PilotKPI {
    ttfwMin: Int!
    dau: Int!
    queries: Int!
    cases: Int!
    exports: Int!
    nps: Float!
  }

  type SuccessCard {
    label: String!
    value: String!
    status: String!
    hint: String
  }

  extend type Mutation {
    submitNps(score: Int!, comment: String): Boolean!
    recordEvent(name: String!, props: JSON): Boolean!
    startTrial(plan: String!, days: Int = 14): Boolean!
    upgradePlan(plan: String!): Boolean!
  }

  extend type Query {
    funnel(period: String! = "7d"): [FunnelPoint!]!
    pilotKpis(workspaceId: ID!): PilotKPI!
    pilotSuccess(workspaceId: ID!): [SuccessCard!]!
  }
`;
exports.default = { sprint28TypeDefs: exports.sprint28TypeDefs };
