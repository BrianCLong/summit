import { buildSchema } from 'graphql';

export const schema = buildSchema(`
  type Query {
    plan(input: PlanInput!): PlanResult!
    generate(input: GenerateInput!): GenResult!
    models(filter: ModelFilter): [Model!]!
  }

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
`);

export function buildRoot(resolvers) {
  return {
    plan: resolvers.plan,
    generate: resolvers.generate,
    models: resolvers.models,
  };
}
