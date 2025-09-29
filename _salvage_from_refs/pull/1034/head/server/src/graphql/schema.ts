export const typeDefs = /* GraphQL */ `
  scalar JSON
  scalar DateTime
  type Entity { id: ID!, type: String!, props: JSON, createdAt: DateTime!, updatedAt: DateTime }
  type Relationship { id: ID!, from: ID!, to: ID!, type: String!, props: JSON, createdAt: DateTime! }

type AISuggestionExplanation {
  score: Float!
  factors: [String!]!
  featureImportances: JSON
}

type AIRecommendation {
  from: ID!
  to: ID!
  score: Float!
  explanation: AISuggestionExplanation
}

type User {
  id: ID!
  email: String!
  username: String
  createdAt: DateTime!
  updatedAt: DateTime
}

input UserInput {
  email: String!
  username: String
}

type Investigation {
  id: ID!
  name: String!
  description: String
  createdAt: DateTime!
  updatedAt: DateTime
}

input InvestigationInput {
  name: String!
  description: String
}

type LinkedEntity {
  text: String!
  label: String!
  startChar: Int!
  endChar: Int!
  entityId: ID # ID of the linked entity in the graph
}

input LinkedEntityInput {
  text: String!
  label: String!
  startChar: Int!
  endChar: Int!
  entityId: ID # ID of the linked entity in the graph
}

type ExtractedRelationship {
  sourceEntityId: ID!
  targetEntityId: ID!
  type: String!
  confidence: Float!
  textSpan: String!
}
  type Query {
    entity(id: ID!): Entity
    entities(type: String, q: String, limit: Int = 25, offset: Int = 0): [Entity!]!
    relationship(id: ID!): Relationship
    relationships(from: ID, to: ID, type: String, limit: Int = 25, offset: Int = 0): [Relationship!]!
    user(id: ID!): User
    users(limit: Int = 25, offset: Int = 0): [User!]!
    investigation(id: ID!): Investigation
    investigations(limit: Int = 25, offset: Int = 0): [Investigation!]!
    semanticSearch(query: String!, type: String, props: JSON, limit: Int = 10, offset: Int = 0): [Entity!]! # Enhanced query
  }
  input EntityInput { type: String!, props: JSON }
  input RelationshipInput { from: ID!, to: ID!, type: String!, props: JSON }
  type Mutation {
    createEntity(input: EntityInput!): Entity!
    updateEntity(id: ID!, input: EntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
    createRelationship(input: RelationshipInput!): Relationship!
    updateRelationship(id: ID!, input: RelationshipInput!): Relationship!
    deleteRelationship(id: ID!): Boolean!
    createUser(input: UserInput!): User!
    updateUser(id: ID!, input: UserInput!): User!
    deleteUser(id: ID!): Boolean!
    createInvestigation(input: InvestigationInput!): Investigation!
    updateInvestigation(id: ID!, input: InvestigationInput!): Investigation!
    deleteInvestigation(id: ID!): Boolean!
    linkEntities(text: String!): [LinkedEntity!]!
    extractRelationships(text: String!, entities: [LinkedEntityInput!]!): [ExtractedRelationship!]!
  }
  type Subscription {
    entityCreated: Entity!
    entityUpdated: Entity!
    entityDeleted: ID!
    aiRecommendationUpdated: AIRecommendation!
  }
`;