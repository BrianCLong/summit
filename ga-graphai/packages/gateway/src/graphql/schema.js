import { buildSchema, GraphQLScalarType, Kind } from 'graphql';

const GraphQLJSON = new GraphQLScalarType({
  name: 'JSON',
  description: 'Arbitrary JSON value',
  serialize: value => value,
  parseValue: value => value,
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return Number(ast.value);
      case Kind.OBJECT: {
        const value = {};
        for (const field of ast.fields) {
          value[field.name.value] = GraphQLJSON.parseLiteral(field.value);
        }
        return value;
      }
      case Kind.LIST:
        return ast.values.map(value => GraphQLJSON.parseLiteral(value));
      case Kind.NULL:
        return null;
      default:
        return null;
    }
  }
});

export const schema = buildSchema(`
  type Query {
    plan(input: PlanInput!): PlanResult!
    generate(input: GenerateInput!): GenResult!
    models(filter: ModelFilter): [Model!]!
    graphNode(id: ID!): GraphNode
    graphNeighborhood(
      nodeId: ID!
      direction: GraphDirection = BOTH
      limit: Int = 25
      cursor: String
      labelFilters: [String!]
      propertyFilters: [GraphPropertyFilterInput!]
    ): GraphNeighborhood!
    graphFilteredPaths(input: GraphPathInput!): GraphPathConnection!
  }

  scalar JSON

  input PlanInput {
    objective: String!
    sources: [String!]
    requiresMultimodal: Boolean = false
    language: String = "en"
    maxTokens: Int = 2200
    costCapUsd: Float = 0.0
  }

  input GenerateInput {
    objective: String!
    toolSchemaJson: String
    attachments: [AttachmentRef!]
    requiresMultimodal: Boolean = false
    language: String = "en"
    caps: CapsInput
  }

  input AttachmentRef {
    uri: String!
    title: String
    type: String
  }

  input CapsInput {
    hardUsd: Float = 0.0
    softPct: Int = 80
    tokenCap: Int = 6000
    rpm: Int = 30
  }

  input ModelFilter {
    local: Boolean
    modality: String
    family: String
    license: String
  }

  type PlanResult {
    summary: String!
    backlog: String!
    adr: String!
    policy: String!
    evidenceId: ID!
  }

  type GenResult {
    content: String!
    citations: [Citation!]
    cost: Cost!
    model: Model!
    evidenceId: ID!
  }

  type Model {
    id: ID!
    family: String!
    license: String!
    modality: [String!]!
    ctx: Int!
    local: Boolean!
    description: String!
  }

  type Citation {
    uri: String!
    hash: String!
    title: String
    retrievedAt: String!
  }

  type Cost {
    tokensIn: Int!
    tokensOut: Int!
    usd: Float!
    latencyMs: Int!
  }

  enum GraphDirection {
    OUT
    IN
    BOTH
  }

  type GraphPageInfo {
    endCursor: String
    hasNextPage: Boolean!
  }

  type GraphNode {
    id: ID!
    labels: [String!]!
    properties: JSON
  }

  type GraphEdge {
    id: ID!
    type: String!
    startId: ID!
    endId: ID!
    properties: JSON
  }

  type GraphNeighborhood {
    node: GraphNode!
    neighbors: [GraphNode!]!
    edges: [GraphEdge!]!
    pageInfo: GraphPageInfo!
  }

  type GraphPath {
    nodes: [GraphNode!]!
    edges: [GraphEdge!]!
  }

  type GraphPathConnection {
    paths: [GraphPath!]!
    pageInfo: GraphPageInfo!
  }

  input GraphPropertyFilterInput {
    key: String!
    value: JSON!
  }

  input GraphPathInput {
    startId: ID!
    direction: GraphDirection = OUT
    maxHops: Int = 3
    limit: Int = 10
    cursor: String
    labelFilters: [String!]
    relationshipTypes: [String!]
    propertyFilters: [GraphPropertyFilterInput!]
  }
`);

export function buildRoot(resolvers) {
  return {
    JSON: GraphQLJSON,
    plan: resolvers.plan,
    generate: resolvers.generate,
    models: resolvers.models,
    graphNode: resolvers.graphNode,
    graphNeighborhood: resolvers.graphNeighborhood,
    graphFilteredPaths: resolvers.graphFilteredPaths
  };
}
