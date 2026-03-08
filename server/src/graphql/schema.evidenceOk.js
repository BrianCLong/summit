"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceOkTypeDefs = void 0;
const graphql_tag_1 = require("graphql-tag");
exports.evidenceOkTypeDefs = (0, graphql_tag_1.gql) `
  type CostSnapshot {
    graphqlPerMillionUsd: Float
    ingestPerThousandUsd: Float
  }
  type EvidenceOk {
    ok: Boolean!
    reasons: [String!]!
    snapshot: SLOSnapshot!
    cost: CostSnapshot
  }
  extend type Query {
    evidenceOk(service: String!, releaseId: ID!): EvidenceOk!
  }
`;
exports.default = exports.evidenceOkTypeDefs;
