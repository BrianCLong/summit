export const typeDefs = /* GraphQL */ `
  scalar DateTime
  type Entity { id: ID!, type: String!, props: JSON, createdAt: DateTime!, updatedAt: DateTime }
  type Relationship { id: ID!, from: ID!, to: ID!, type: String!, props: JSON, createdAt: DateTime! }
  type Query {
    entity(id: ID!): Entity
    entities(type: String, q: String, limit: Int = 25, offset: Int = 0): [Entity!]!
  }
  input EntityInput { type: String!, props: JSON }
  type Mutation {
    createEntity(input: EntityInput!): Entity!
    updateEntity(id: ID!, input: EntityInput!): Entity!
    deleteEntity(id: ID!): Boolean!
  }
  type Subscription {
    entityCreated: Entity!
    entityUpdated: Entity!
    entityDeleted: ID!
  }
`;