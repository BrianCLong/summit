import { gql } from 'graphql-tag';

export const typeDefs = gql`
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.5", import: ["@key"])

  scalar JSON

  enum Direction {
    OUT
    IN
    BOTH
  }

  type PageInfo {
    endCursor: String
    hasNextPage: Boolean!
  }

  type Node @key(fields: "id") {
    id: ID!
    labels: [String!]!
    properties: JSON!
  }

  type Relationship {
    id: ID!
    type: String!
    startId: ID!
    endId: ID!
    properties: JSON!
  }

  type NodeNeighborhood {
    node: Node!
    neighbors: [Node!]!
    edges: [Relationship!]!
    pageInfo: PageInfo!
  }

  type GraphPath {
    nodes: [Node!]!
    edges: [Relationship!]!
  }

  type PathConnection {
    paths: [GraphPath!]!
    pageInfo: PageInfo!
  }

  input PropertyFilterInput {
    key: String!
    value: JSON!
  }

  input PathInput {
    startId: ID!
    direction: Direction = OUT
    maxHops: Int = 3
    limit: Int = 10
    cursor: String
    labelFilters: [String!]
    relationshipTypes: [String!]
    propertyFilters: [PropertyFilterInput!]
  }

  type Query {
    node(id: ID!): Node
    nodeNeighborhood(
      nodeId: ID!
      direction: Direction = BOTH
      limit: Int = 25
      cursor: String
      labelFilters: [String!]
      propertyFilters: [PropertyFilterInput!]
    ): NodeNeighborhood!
    filteredPaths(input: PathInput!): PathConnection!
  }
`;
