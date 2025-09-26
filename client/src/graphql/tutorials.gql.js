import { gql } from '@apollo/client';

export const GET_TUTORIAL_PROGRESS = gql`
  query GetTutorialProgress($tutorialId: String!) {
    tutorialProgress(tutorialId: $tutorialId) {
      tutorialId
      completed
      completedAt
    }
  }
`;

export const GET_TUTORIAL_CHECKLIST = gql`
  query GetTutorialChecklist {
    tutorialChecklist {
      tutorialId
      completed
      completedAt
    }
  }
`;

export const COMPLETE_TUTORIAL = gql`
  mutation CompleteTutorial($tutorialId: String!) {
    completeTutorial(tutorialId: $tutorialId) {
      tutorialId
      completed
      completedAt
    }
  }
`;

export const RESET_TUTORIAL = gql`
  mutation ResetTutorial($tutorialId: String!) {
    resetTutorial(tutorialId: $tutorialId) {
      tutorialId
      completed
      completedAt
    }
  }
`;
