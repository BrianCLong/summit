import { gql } from 'graphql-tag';

export const apiKeyTypeDefs = gql`
  enum ApiKeyScope {
    VIEWER
    ANALYST
    OPERATOR
    ADMIN
  }

  type ApiKey {
    id: ID!
    name: String!
    scope: ApiKeyScope!
    tenantId: String
    createdBy: String
    createdAt: DateTime!
    expiresAt: DateTime!
    revokedAt: DateTime
    revokedBy: String
    lastUsedAt: DateTime
  }

  type ApiKeySecret {
    key: String!
    apiKey: ApiKey!
  }

  input CreateApiKeyInput {
    name: String!
    scope: ApiKeyScope!
    expiresAt: DateTime!
    tenantId: String
  }

  extend type Query {
    apiKeys(includeRevoked: Boolean = false): [ApiKey!]!
  }

  extend type Mutation {
    createApiKey(input: CreateApiKeyInput!): ApiKeySecret!
    revokeApiKey(id: ID!): ApiKey!
  }
`;

export default apiKeyTypeDefs;
