import { gql } from 'graphql-tag';

export const onboardingTypeDefs = gql`
  enum OnboardingStepStatus {
    NOT_STARTED
    IN_PROGRESS
    COMPLETED
  }

  type OnboardingStep {
    key: String!
    title: String!
    description: String!
    status: OnboardingStepStatus!
    completed: Boolean!
    data: JSON
    updatedAt: DateTime
    completedAt: DateTime
  }

  type OnboardingProgress {
    userId: ID!
    steps: [OnboardingStep!]!
    currentStepKey: String
    completed: Boolean!
    completedAt: DateTime
  }

  input OnboardingStepInput {
    userId: ID!
    stepKey: String!
    status: OnboardingStepStatus
    completed: Boolean!
    data: JSON
  }

  extend type Query {
    onboardingProgress(userId: ID!): OnboardingProgress!
  }

  extend type Mutation {
    upsertOnboardingStep(input: OnboardingStepInput!): OnboardingProgress!
    resetOnboardingProgress(userId: ID!): Boolean!
  }
`;

export default onboardingTypeDefs;
