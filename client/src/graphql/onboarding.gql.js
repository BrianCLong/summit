import { gql } from '@apollo/client';

export const ONBOARDING_PROGRESS = gql`
  query OnboardingProgress($userId: ID!) {
    onboardingProgress(userId: $userId) {
      userId
      currentStepKey
      completed
      completedAt
      steps {
        key
        title
        description
        status
        completed
        data
        updatedAt
        completedAt
      }
    }
  }
`;

export const UPSERT_ONBOARDING_STEP = gql`
  mutation UpsertOnboardingStep($input: OnboardingStepInput!) {
    upsertOnboardingStep(input: $input) {
      userId
      currentStepKey
      completed
      completedAt
      steps {
        key
        title
        description
        status
        completed
        data
        updatedAt
        completedAt
      }
    }
  }
`;

export const RESET_ONBOARDING_PROGRESS = gql`
  mutation ResetOnboardingProgress($userId: ID!) {
    resetOnboardingProgress(userId: $userId)
  }
`;
