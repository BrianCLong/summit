// Mock for graphql/schema.collab
export const collabTypeDefs = `
  type Branch {
    id: ID!
    name: String!
    createdAt: String
  }

  type Mutation {
    createBranch(name: String!): Branch
    deleteBranch(id: ID!): Boolean
  }

  type Query {
    branch(id: ID!): Branch
    branches: [Branch!]!
  }
`;

export default collabTypeDefs;
