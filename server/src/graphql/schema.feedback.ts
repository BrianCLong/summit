import { gql } from 'graphql-tag';

export const feedbackTypeDefs = gql`
  enum FeedbackCategory {
    BUG
    FEATURE
    OTHER
  }

  enum FeedbackStatus {
    NEW
    IN_REVIEW
    RESOLVED
    ARCHIVED
  }

  type FeedbackSubmission {
    id: ID!
    tenantId: String
    userId: String
    userEmail: String
    category: FeedbackCategory!
    title: String!
    description: String
    status: FeedbackStatus!
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type FeedbackConnection {
    total: Int!
    items: [FeedbackSubmission!]!
  }

  input SubmitFeedbackInput {
    category: FeedbackCategory!
    title: String!
    description: String
    contact: String
    metadata: JSON
  }

  input FeedbackFilterInput {
    status: FeedbackStatus
    category: FeedbackCategory
    limit: Int
    offset: Int
  }

  input UpdateFeedbackStatusInput {
    id: ID!
    status: FeedbackStatus!
  }

  extend type Query {
    feedbackSubmissions(filter: FeedbackFilterInput): FeedbackConnection!
  }

  extend type Mutation {
    submitFeedback(input: SubmitFeedbackInput!): FeedbackSubmission!
    updateFeedbackStatus(input: UpdateFeedbackStatusInput!): FeedbackSubmission!
  }
`;

export default feedbackTypeDefs;
