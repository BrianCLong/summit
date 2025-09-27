import { gql } from "apollo-server-express";
import { authDirective } from "./authDirective.js";

const { authDirectiveTypeDefs } = authDirective();

export const typeDefs = gql`
${authDirectiveTypeDefs}
  type AISuggestion {
    id: ID!
    type: String!
    label: String!
    confidence: Float!
    status: String!
    createdAt: String!
  }

  type Answer {
    id: ID!
    content: String!
    createdAt: String!
  }

  type Query {
    suggestions(status: String = "pending", limit: Int = 50): [AISuggestion!]!
    citations(id: ID!): [Citation!]!
    caseAnswers(caseId:ID!): [Answer!]! @auth(scope:["case:read"])
  }

  type Citation { kind: String!, id: ID!, name: String }

  type Mutation {
    acceptSuggestion(id: ID!): Boolean!
    rejectSuggestion(id: ID!): Boolean!
    upsertTenantConfig(id: ID!, rag: Boolean, erV2: Boolean, transport: String, rpmLimit: Int, modelTier: String): TenantConfig!
  }

  type TenantConfig { id: ID!, rag: Boolean!, erV2: Boolean!, transport: String!, rpmLimit: Int!, modelTier: String! }

  type Case {
    id: ID!
    name: String!
    createdAt: String!
    updatedAt: String!
  }

  extend type Query {
    case(id: ID!): Case
    cases: [Case!]!
  }

  extend type Mutation {
    createCase(name: String!): Case!
    updateCase(id: ID!, name: String!): Case!
    deleteCase(id: ID!): Boolean!
    attachAnswerToCase(caseId:ID!, answerId:ID!, sig:String!): Boolean!
  }
`;