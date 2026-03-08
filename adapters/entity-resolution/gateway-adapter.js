"use strict";
/**
 * Entity Resolution Gateway Adapter
 * Provides ER functionality via stitched GraphQL schema
 * Auto-loaded by gateway from adapters/entity-resolution/
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayPlugin = exports.resolvers = exports.typeDefs = void 0;
const ER_SERVICE_URL = process.env.ER_SERVICE_URL || 'http://localhost:4020';
// ============================================================================
// GraphQL Schema Extension
// ============================================================================
exports.typeDefs = `#graphql
  extend type Query {
    """
    Find match candidates for an entity
    """
    erCandidates(entityId: ID!, limit: Int): ERCandidateResult!

    """
    Get explanation for why two entities match or don't match
    """
    erExplain(entityAId: ID!, entityBId: ID!): ERExplanation!
  }

  extend type Mutation {
    """
    Merge two entities into one
    """
    erMerge(input: ERMergeInput!): ERMergeResult!

    """
    Split an entity (reverse a merge)
    """
    erSplit(input: ERSplitInput!): ERSplitResult!
  }

  type ERCandidateResult {
    referenceEntityId: ID!
    candidates: [ERCandidate!]!
    totalCandidates: Int!
  }

  type ERCandidate {
    entityId: ID!
    score: Float!
    featureVector: ERFeatureVector!
    explanation: [String!]!
    requiresAdjudication: Boolean!
  }

  type ERFeatureVector {
    nameMatch: Float!
    identifierMatch: Float!
    attributeOverlap: Float!
    temporalProximity: Float!
    sourceAgreement: Float!
    transitiveSupport: Float!
  }

  type ERExplanation {
    entityA: EREntitySummary!
    entityB: EREntitySummary!
    scorecard: ERScorecard!
  }

  type EREntitySummary {
    id: ID!
    facets: JSON!
  }

  type ERScorecard {
    candidateId: ID!
    referenceId: ID!
    featureVector: ERFeatureVector!
    overallScore: Float!
    confidence: Float!
    matchDecision: ERMatchDecision!
    explanation: [ERScoreExplanation!]!
  }

  enum ERMatchDecision {
    MATCH
    NO_MATCH
    REVIEW
  }

  type ERScoreExplanation {
    feature: String!
    weight: Float!
    score: Float!
    contribution: Float!
    rationale: String!
  }

  input ERMergeInput {
    sourceEntityId: ID!
    targetEntityId: ID!
    reason: String!
    override: Boolean
  }

  type ERMergeResult {
    mergeId: ID!
    mergedEntityId: ID!
    score: Float!
    featureVector: ERFeatureVector!
    reversible: Boolean!
  }

  input ERSplitInput {
    entityId: ID!
    facetIds: [ID!]!
    reason: String!
  }

  type ERSplitResult {
    splitId: ID!
    originalEntityId: ID!
    newEntityIds: [ID!]!
    reversedMergeId: ID
  }

  scalar JSON
`;
// ============================================================================
// Resolvers
// ============================================================================
exports.resolvers = {
    Query: {
        erCandidates: async (_, args) => {
            const response = await fetch(`${ER_SERVICE_URL}/er/candidates/${args.entityId}?limit=${args.limit || 10}`);
            return response.json();
        },
        erExplain: async (_, args) => {
            const response = await fetch(`${ER_SERVICE_URL}/er/explain/${args.entityAId}/${args.entityBId}`);
            return response.json();
        },
    },
    Mutation: {
        erMerge: async (_, args) => {
            const response = await fetch(`${ER_SERVICE_URL}/er/merge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(args.input),
            });
            return response.json();
        },
        erSplit: async (_, args) => {
            const response = await fetch(`${ER_SERVICE_URL}/er/split`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(args.input),
            });
            return response.json();
        },
    },
};
// ============================================================================
// Gateway Plugin Export
// ============================================================================
exports.gatewayPlugin = {
    name: 'entity-resolution',
    version: '1.0.0',
    typeDefs: exports.typeDefs,
    resolvers: exports.resolvers,
};
exports.default = exports.gatewayPlugin;
