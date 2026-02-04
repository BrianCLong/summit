import { gql } from 'graphql-tag';

export const foundryTypeDefs = gql`
  """
  A generic asset managed by an Intelligence Foundry.
  Can be a document, image, or dataset used for training or context.
  """
  type FoundryAsset {
    id: ID!
    name: String!
    type: String!
    owner: String!
    """
    Rights management and licensing terms.
    """
    rights: JSON
    """
    Link to provenance lineage.
    """
    lineageId: ID
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  """
  An AI model managed within a Foundry.
  """
  type FoundryModel {
    id: ID!
    name: String!
    version: String!
    baseModel: String
    """
    Assets used to train or fine-tune this model.
    """
    trainingAssets: [FoundryAsset!]!
    """
    Governance policy applied to this model.
    """
    policy: FoundryPolicy
    createdAt: DateTime!
  }

  """
  Governance policy for a Foundry.
  """
  type FoundryPolicy {
    id: ID!
    name: String!
    rules: JSON!
    enforcementLevel: String!
  }

  """
  An autonomous agent operating within a Foundry.
  """
  type FoundryAgent {
    id: ID!
    name: String!
    model: FoundryModel!
    """
    Capabilities allowed for this agent.
    """
    capabilities: [String!]!
    """
    Constraints enforced on this agent.
    """
    constraints: JSON
    createdAt: DateTime!
  }

  """
  Evidence produced by a Foundry Agent.
  """
  type FoundryEvidence {
    id: ID!
    agent: FoundryAgent!
    input: JSON!
    output: JSON!
    """
    Full execution graph ID.
    """
    executionGraphId: ID!
    timestamp: DateTime!
    """
    Cryptographic signature or hash.
    """
    signature: String
  }

  """
  An Intelligence Foundry instance.
  """
  type IntelligenceFoundry {
    id: ID!
    name: String!
    domain: String!
    description: String
    assets(limit: Int): [FoundryAsset!]!
    models(limit: Int): [FoundryModel!]!
    agents(limit: Int): [FoundryAgent!]!
  }

  extend type Query {
    intelligenceFoundry(id: ID!): IntelligenceFoundry
    intelligenceFoundries(limit: Int): [IntelligenceFoundry!]!
    foundryAsset(id: ID!): FoundryAsset
    foundryModel(id: ID!): FoundryModel
    foundryAgent(id: ID!): FoundryAgent
    foundryEvidence(id: ID!): FoundryEvidence
  }

  extend type Mutation {
    createIntelligenceFoundry(name: String!, domain: String!): IntelligenceFoundry!
    registerFoundryAsset(foundryId: ID!, name: String!, type: String!, owner: String!): FoundryAsset!
    createFoundryModel(foundryId: ID!, name: String!, baseModel: String): FoundryModel!
    deployFoundryAgent(foundryId: ID!, modelId: ID!, name: String!): FoundryAgent!
    recordFoundryEvidence(agentId: ID!, input: JSON!, output: JSON!): FoundryEvidence!
  }
`;
