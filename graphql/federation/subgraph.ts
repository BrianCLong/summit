/**
 * Apollo Federation Subgraph Utilities
 * Helpers for creating federated subgraphs
 */

import { buildSubgraphSchema } from '@apollo/subgraph';
import { parse, DocumentNode } from 'graphql';
import { IResolvers } from '@graphql-tools/utils';

/**
 * Create a federated subgraph schema
 */
export function createSubgraphSchema(
  typeDefs: string | DocumentNode,
  resolvers: IResolvers
) {
  const typeDefsDoc = typeof typeDefs === 'string' ? parse(typeDefs) : typeDefs;

  return buildSubgraphSchema({
    typeDefs: typeDefsDoc,
    resolvers,
  });
}

/**
 * Example: Core subgraph
 * Handles basic entity and relationship operations
 */
export const coreSubgraphTypeDefs = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Entity @key(fields: "id") {
    id: ID!
    type: String!
    props: JSON
    createdAt: DateTime!
    updatedAt: DateTime
    canonicalId: ID
  }

  type Relationship @key(fields: "id") {
    id: ID!
    from: ID!
    to: ID!
    type: String!
    props: JSON
    createdAt: DateTime!
  }

  extend type Query {
    entity(id: ID!): Entity
    entities(type: String, q: String, limit: Int = 25, offset: Int = 0): [Entity!]!
    relationship(id: ID!): Relationship
    relationships(from: ID, to: ID, type: String, limit: Int = 25, offset: Int = 0): [Relationship!]!
  }

  extend type Mutation {
    createEntity(input: EntityInput!): Entity!
    updateEntity(id: ID!, input: EntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    createRelationship(input: RelationshipInput!): Relationship!
    updateRelationship(id: ID!, input: RelationshipInput!): Relationship!
    deleteRelationship(id: ID!): Boolean!
  }

  input EntityInput {
    type: String!
    props: JSON
  }

  input RelationshipInput {
    from: ID!
    to: ID!
    type: String!
    props: JSON
  }

  scalar JSON
  scalar DateTime
`;

/**
 * Example: AI Analysis subgraph
 * Handles AI-powered analysis and insights
 */
export const aiSubgraphTypeDefs = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@external"])

  type Entity @key(fields: "id") {
    id: ID! @external
    insights: EntityInsights
  }

  type EntityInsights {
    entityId: ID!
    insights: [String!]!
    suggestedRelationships: [SuggestedRelationship!]!
    riskFactors: [RiskFactor!]!
    generatedAt: String!
  }

  type SuggestedRelationship {
    type: String!
    reason: String!
    confidence: Float!
  }

  type RiskFactor {
    factor: String!
    severity: String!
    description: String!
  }

  type ExtractedEntity {
    id: ID!
    text: String!
    type: String!
    confidence: Float!
    position: EntityPosition!
  }

  type EntityPosition {
    start: Int!
    end: Int!
  }

  type ExtractedAIRelationship {
    id: ID!
    source: String!
    target: String!
    type: String!
    confidence: Float!
  }

  type EntityExtractionResult {
    entities: [ExtractedEntity!]!
    relationships: [ExtractedAIRelationship!]!
  }

  input GraphRAGQueryInput {
    investigationId: ID!
    question: String!
    focusEntityIds: [ID!]
    maxHops: Int
    temperature: Float
    maxTokens: Int
    useCase: String
    rankingStrategy: String
  }

  type GraphRAGResponse {
    answer: String!
    confidence: Float!
    citations: Citations!
    why_paths: [WhyPath!]!
  }

  type Citations {
    entityIds: [ID!]!
  }

  type WhyPath {
    from: ID!
    to: ID!
    relId: ID!
    type: String!
    supportScore: Float
    score_breakdown: ScoreBreakdown
  }

  type ScoreBreakdown {
    length: Float!
    edgeType: Float!
    centrality: Float!
  }

  extend type Query {
    extractEntities(
      text: String!
      extractRelationships: Boolean = false
      confidenceThreshold: Float = 0.7
    ): EntityExtractionResult!

    generateEntityInsights(
      entityId: ID!
      entityType: String!
      properties: JSON = {}
    ): EntityInsights!

    graphRagAnswer(input: GraphRAGQueryInput!): GraphRAGResponse!
  }

  scalar JSON
`;

/**
 * Example: Investigations subgraph
 * Handles investigation management
 */
export const investigationsSubgraphTypeDefs = `
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable"])

  type Investigation @key(fields: "id") {
    id: ID!
    name: String!
    description: String
    createdAt: DateTime!
    updatedAt: DateTime
  }

  type User @key(fields: "id") {
    id: ID!
    email: String!
    username: String
    createdAt: DateTime!
    updatedAt: DateTime
  }

  extend type Query {
    investigation(id: ID!): Investigation
    investigations(limit: Int = 25, offset: Int = 0): [Investigation!]!
    user(id: ID!): User
    users(limit: Int = 25, offset: Int = 0): [User!]!
  }

  extend type Mutation {
    createInvestigation(input: InvestigationInput!): Investigation!
    updateInvestigation(id: ID!, input: InvestigationInput!): Investigation!
    deleteInvestigation(id: ID!): Boolean!
  }

  input InvestigationInput {
    name: String!
    description: String
  }

  scalar DateTime
`;

/**
 * Reference resolvers for entity keys
 */
export const entityReferenceResolver = {
  __resolveReference(reference: { id: string }) {
    // This would fetch the entity from your data source
    return { id: reference.id };
  },
};

/**
 * Helper to add federation directives to existing schema
 */
export function addFederationDirectives(typeDefs: string): string {
  // Check if schema already has federation directives
  if (typeDefs.includes('@link') || typeDefs.includes('extend schema')) {
    return typeDefs;
  }

  // Add federation link to schema
  const federationLink = `
    extend schema
      @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@key", "@shareable", "@external", "@requires", "@provides"])
  `;

  return federationLink + '\n' + typeDefs;
}

/**
 * Create entity reference resolver
 */
export function createEntityReference<T extends { id: string }>(
  fetchById: (id: string) => Promise<T | null>
) {
  return {
    __resolveReference: async (reference: { id: string }) => {
      return fetchById(reference.id);
    },
  };
}
