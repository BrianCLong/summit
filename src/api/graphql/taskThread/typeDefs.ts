export const typeDefs = `
type TaskThread {
  id: ID!
  taskId: ID!
  messages: [ThreadMessage!]!
}
type ThreadMessage {
  id: ID!
  body: String!
  authorId: ID!
  createdAt: String!
}
`;
