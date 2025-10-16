import { gql } from 'graphql-tag';

export const evidenceOkTypeDefs = gql`
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

export default evidenceOkTypeDefs;
