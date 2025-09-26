import { gql } from 'graphql-tag';

export const notificationTypeDefs = gql`
  enum NotificationEventType {
    INGESTION_COMPLETE
    ML_JOB_STATUS
    CUSTOM
  }

  enum NotificationSeverity {
    info
    warning
    error
    success
  }

  type NotificationChannels {
    inApp: Boolean!
    email: Boolean!
    sms: Boolean!
  }

  type NotificationPreference {
    id: ID!
    eventType: NotificationEventType!
    channels: NotificationChannels!
    email: String
    phoneNumber: String
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Notification {
    id: ID!
    type: NotificationEventType!
    title: String!
    message: String!
    severity: NotificationSeverity!
    timestamp: DateTime!
    actionId: String
    investigationId: String
    metadata: JSON
    expiresAt: DateTime
    readAt: DateTime
    status: String!
  }

  input NotificationChannelsInput {
    inApp: Boolean = true
    email: Boolean = false
    sms: Boolean = false
  }

  input NotificationPreferenceInput {
    eventType: NotificationEventType!
    channels: NotificationChannelsInput!
    email: String
    phoneNumber: String
  }

  extend type Query {
    notificationPreferences: [NotificationPreference!]!
    notifications(limit: Int = 20, onlyUnread: Boolean = false): [Notification!]!
    unreadNotificationCount: Int!
  }

  extend type Mutation {
    updateNotificationPreference(input: NotificationPreferenceInput!): NotificationPreference!
    markNotificationRead(id: ID!): Notification!
    notifyIngestionComplete(ingestionId: ID!, message: String!, title: String, metadata: JSON): Notification!
    notifyMlJobStatus(jobId: ID!, status: String!, message: String!, metadata: JSON): Notification!
  }

  extend type Subscription {
    notificationUpdates: Notification!
  }
`;

export default notificationTypeDefs;
