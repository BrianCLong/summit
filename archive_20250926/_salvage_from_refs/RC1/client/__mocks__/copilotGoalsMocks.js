import { gql } from '@apollo/client';

export const GET_GOALS = gql`
  query CopilotGoals($investigationId: ID) {
    copilotGoals(investigationId: $investigationId) {
      id
      text
      createdAt
    }
  }
`;

export const GET_INVESTIGATIONS = gql`
  query Investigations {
    investigations { id title }
  }
`;

export const CREATE_GOAL = gql`
  mutation CreateCopilotGoal($text: String!, $investigationId: ID) {
    createCopilotGoal(text: $text, investigationId: $investigationId) {
      id
      text
      createdAt
    }
  }
`;

export const mocks = [
  {
    request: {
      query: GET_INVESTIGATIONS,
    },
    result: {
      data: {
        investigations: [
          { id: '1', title: 'Investigation Alpha' },
          { id: '2', title: 'Investigation Beta' },
        ],
      },
    },
  },
  {
    request: {
      query: GET_GOALS,
      variables: { investigationId: null },
    },
    result: {
      data: {
        copilotGoals: [
          { id: 'g1', text: 'Existing Goal 1', createdAt: '2023-01-01T10:00:00Z' },
          { id: 'g2', text: 'Existing Goal 2', createdAt: '2023-01-02T11:00:00Z' },
        ],
      },
    },
  },
  {
    request: {
      query: CREATE_GOAL,
      variables: { text: 'Test goal', investigationId: null },
    },
    result: {
      data: {
        createCopilotGoal: { id: 'g3', text: 'Test goal', createdAt: '2023-01-03T12:00:00Z' },
      },
    },
  },
  {
    request: {
      query: GET_GOALS,
      variables: { investigationId: null },
    },
    result: {
      data: {
        copilotGoals: [
          { id: 'g3', text: 'Test goal', createdAt: '2023-01-03T12:00:00Z' },
          { id: 'g1', text: 'Existing Goal 1', createdAt: '2023-01-01T10:00:00Z' },
          { id: 'g2', text: 'Existing Goal 2', createdAt: '2023-01-02T11:00:00Z' },
        ],
      },
    },
  },
];