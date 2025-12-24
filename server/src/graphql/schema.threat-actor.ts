import { gql } from 'graphql-tag';

export const threatActorTypeDefs = gql`
  type ThreatActor implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    name: String!
    aliases: [String!]
    description: String
    firstSeen: String
    lastSeen: String
    sophistication: String
    motivation: [String!]

    # Relationships
    ttps: [TTP!]!
    infrastructure: [Infrastructure!]!
    attributions: [Attribution!]!
    relatedActors: [ThreatActor!]!
    behaviors: [Behavior!]!
  }

  type TTP implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    techniqueId: String!
    name: String!
    tactic: String
  }

  type Infrastructure implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    type: String! # IP, Domain, SSL, etc.
    value: String!
    firstSeen: String
    lastSeen: String
  }

  type Behavior {
    id: ID!
    signature: String!
    description: String
    severity: String
  }

  type Attribution {
    campaign: Campaign!
    confidence: Float!
  }

  type Campaign implements Entity {
    id: ID!
    tenant: ID!
    labels: [String!]!
    score: Float
    metadata: JSON
    name: String!
    objective: String
  }

  type AdversaryRelationship {
    actor: ThreatActor!
    overlapScore: Int!
    sharedItems: [String!]!
  }

  extend type Query {
    threatActor(id: ID!): ThreatActor
    threatActors(limit: Int = 25): [ThreatActor!]!
    analyzeActorRelationships(id: ID!): [AdversaryRelationship!]!
  }

  extend type Mutation {
    createThreatActor(input: ThreatActorInput!): ThreatActor!
    updateThreatActor(id: ID!, input: ThreatActorInput!): ThreatActor!
    addBehavior(actorId: ID!, behavior: BehaviorInput!): Behavior!
    linkTTP(actorId: ID!, ttpId: ID!): TTP!
    linkInfrastructure(actorId: ID!, infraId: ID!): Infrastructure!
    addAttribution(actorId: ID!, campaignId: ID!, confidence: Float!): Attribution!
    calculateConfidence(actorId: ID!, evidenceIds: [ID!]!): Float!
  }

  input ThreatActorInput {
    id: ID
    name: String!
    aliases: [String!]
    description: String
    sophistication: String
    motivation: [String!]
    tenant: ID!
  }

  input BehaviorInput {
    signature: String!
    description: String
    severity: String
  }
`;
