import { gql } from 'graphql-tag';

export const consentGraphTypeDefs = gql`
  enum ConsentNodeType {
    SUBJECT
    PURPOSE
    SCOPE
    DELEGATION
  }

  enum ConsentEdgeType {
    SUBJECT_PURPOSE
    PURPOSE_SCOPE
    SCOPE_DELEGATION
    SUBJECT_SCOPE_FLOW
  }

  type TimeInterval {
    start: DateTime!
    end: DateTime
  }

  type DataFlow {
    id: ID!
    subjectId: ID!
    purposeId: ID!
    scopeId: ID!
    description: String!
    delegationChain: [ID!]!
  }

  type ConsentNode {
    id: ID!
    type: ConsentNodeType!
    name: String!
    metadata: JSON
  }

  type ConsentEdge {
    id: ID!
    type: ConsentEdgeType!
    fromId: ID!
    toId: ID!
    metadata: JSON
    validInterval: TimeInterval!
    txInterval: TimeInterval!
    flow: DataFlow
  }

  type ConsentGraphSnapshot {
    asOfValid: DateTime!
    asOfTx: DateTime!
    nodes: [ConsentNode!]!
    edges: [ConsentEdge!]!
  }

  type ConsentPolicyVersion {
    id: ID!
    label: String!
    validTime: DateTime!
    txTime: DateTime!
    summary: String
  }

  type ConsentPolicyDiff {
    baseVersionId: ID!
    compareVersionId: ID!
    added: [ConsentEdge!]!
    removed: [ConsentEdge!]!
    unchangedCount: Int!
  }

  type ImpactedFlow {
    flow: DataFlow!
    scope: ConsentNode!
    delegations: [ConsentNode!]!
  }

  type SubjectImpact {
    subject: ConsentNode!
    flows: [ImpactedFlow!]!
  }

  type ConsentRevocationImpact {
    purpose: ConsentNode!
    totalImpactedFlows: Int!
    impactedSubjects: [SubjectImpact!]!
  }

  extend type Query {
    consentPolicyVersions: [ConsentPolicyVersion!]!
    consentGraphAsOf(validTime: DateTime!, txTime: DateTime!): ConsentGraphSnapshot!
    consentPolicyDiff(baseVersionId: ID!, compareVersionId: ID!): ConsentPolicyDiff!
    consentRevocationImpact(
      purposeId: ID!
      validTime: DateTime!
      txTime: DateTime!
    ): ConsentRevocationImpact!
  }
`;
