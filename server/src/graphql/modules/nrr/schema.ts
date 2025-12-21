import { gql } from 'apollo-server-express';

export const nrrTypeDefs = gql`
  type NRRMetric {
    tenantId: ID!
    period: String!
    newArr: Float!
    expansionArr: Float!
    contractionArr: Float!
    churnArr: Float!
    netArr: Float!
    nrrPercentage: Float!
  }

  type ExpansionLever {
    id: ID!
    name: String!
    type: String!
    description: String
    isActive: Boolean!
  }

  type NRRCohort {
    id: ID!
    name: String!
    segment: String!
    industry: String
    plan: String
    nrrTarget: Float!
    owner: String
  }

  type CustomerGrowthPlan {
    id: ID!
    tenantId: ID!
    currentStage: String!
    desiredOutcomes: [String!]!
    blockers: [String!]!
    nextMilestoneDate: DateTime
    status: String!
  }

  input CreateGrowthPlanInput {
    tenantId: ID!
    currentStage: String!
    desiredOutcomes: [String!]!
    blockers: [String!]
    nextMilestoneDate: DateTime
    status: String
  }

  extend type Query {
    nrrMetrics(tenantId: ID!, period: String!): NRRMetric
    expansionLevers: [ExpansionLever!]!
    nrrCohorts: [NRRCohort!]!
    customerGrowthPlan(tenantId: ID!): CustomerGrowthPlan
  }

  extend type Mutation {
    createCustomerGrowthPlan(input: CreateGrowthPlanInput!): CustomerGrowthPlan
  }
`;
