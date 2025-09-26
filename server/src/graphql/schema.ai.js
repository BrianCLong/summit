const gql = require('graphql-tag');

// AI/Analytics schema extensions for insights and search
const aiTypeDefs = gql`
  type AIRecommendation {
    from: ID!
    to: ID!
    score: Float!
    reason: String
  }
  type AIAnomaly {
    entityId: ID!
    anomalyScore: Float!
    reason: String
  }

  type EntityExplainabilityFeature {
    feature: String!
    weight: Float!
  }

  type EntityPredictionExplanation {
    entityText: String!
    label: String!
    confidence: Float
    method: String!
    context: String
    summary: String!
    featureWeights: [EntityExplainabilityFeature!]!
  }

  type EntityRecognitionEntity {
    text: String!
    label: String!
    confidence: Float
    start: Int
    end: Int
  }

  type EntityRecognitionRelationship {
    source: String!
    target: String!
    type: String!
    confidence: Float
  }

  type EntityRecognitionExplanation {
    text: String!
    entities: [EntityRecognitionEntity!]!
    relationships: [EntityRecognitionRelationship!]!
    explanations: [EntityPredictionExplanation!]!
    usedMethod: String!
    generatedAt: DateTime!
  }

  extend type Query {
    suggestLinks(entityId: ID!, limit: Int = 5): [AIRecommendation!]!
    detectAnomalies(investigationId: ID, limit: Int = 10): [AIAnomaly!]!
    searchEntities(q: String!, filters: JSON, limit: Int = 25): [Entity!]!
    searchEntitiesHybrid(q: String!, filters: JSON, limit: Int = 25): [Entity!]!
    explainEntityRecognition(text: String!, method: String, topK: Int = 5): EntityRecognitionExplanation!
  }

  extend type Subscription {
    aiSuggestions(entityId: ID!): [AIRecommendation!]!
  }

  extend type Mutation {
    recordAnomaly(entityId: ID!, anomalyScore: Float!, reason: String): AIAnomaly!
  }
`;

module.exports = { aiTypeDefs };
