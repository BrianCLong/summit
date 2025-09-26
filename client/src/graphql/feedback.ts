import { gql } from '@apollo/client';

export const SUBMIT_FEEDBACK_MUTATION = gql`
  mutation SubmitFeedback($input: SubmitFeedbackInput!) {
    submitFeedback(input: $input) {
      id
      status
      category
      title
      description
      createdAt
    }
  }
`;

export const FEEDBACK_SUBMISSIONS_QUERY = gql`
  query FeedbackSubmissions($filter: FeedbackFilterInput) {
    feedbackSubmissions(filter: $filter) {
      total
      items {
        id
        category
        title
        description
        status
        userEmail
        userId
        createdAt
        metadata
      }
    }
  }
`;

export const UPDATE_FEEDBACK_STATUS_MUTATION = gql`
  mutation UpdateFeedbackStatus($input: UpdateFeedbackStatusInput!) {
    updateFeedbackStatus(input: $input) {
      id
      status
      updatedAt
    }
  }
`;
