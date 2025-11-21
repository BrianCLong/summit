/**
 * GraphQL Schema for Notifications Hub
 *
 * Provides API for:
 * - Querying notifications
 * - Managing preferences
 * - Testing notification delivery
 * - Viewing metrics and health
 */

export const notificationsTypeDefs = `#graphql
  # ========================================
  # Enums
  # ========================================

  enum EventType {
    # Alerting & SLO
    ALERT_TRIGGERED
    ALERT_RESOLVED
    ALERT_ESCALATED
    SLO_VIOLATION
    SLO_ERROR_BUDGET_DEPLETED

    # Pipeline & Orchestration
    PIPELINE_STARTED
    PIPELINE_COMPLETED
    PIPELINE_FAILED
    WORKFLOW_APPROVAL_REQUIRED
    WORKFLOW_APPROVED
    WORKFLOW_REJECTED

    # Two-Person Control / Authority
    AUTHORITY_APPROVAL_REQUIRED
    AUTHORITY_APPROVED
    AUTHORITY_REJECTED
    AUTHORITY_DISSENT
    AUTHORITY_TIMEOUT

    # Copilot & AI
    COPILOT_RUN_STARTED
    COPILOT_RUN_COMPLETED
    COPILOT_RUN_FAILED
    COPILOT_ESCALATION
    COPILOT_ANOMALY_DETECTED

    # Investigation & Evidence
    INVESTIGATION_CREATED
    INVESTIGATION_UPDATED
    INVESTIGATION_SHARED
    EVIDENCE_ADDED
    ENTITY_DISCOVERED
    ENTITY_RISK_CHANGED

    # Security & Compliance
    SECURITY_ALERT
    POLICY_VIOLATION
    ACCESS_DENIED
    CLEARANCE_VIOLATION
    LICENSE_VIOLATION

    # System & Infrastructure
    SYSTEM_HEALTH_DEGRADED
    SYSTEM_MAINTENANCE_SCHEDULED
    GOLDEN_PATH_BROKEN
    DEPLOYMENT_COMPLETED
    DEPLOYMENT_FAILED

    # Budget & Cost
    BUDGET_THRESHOLD_EXCEEDED
    BUDGET_DEPLETED
    COST_ANOMALY

    # User & Collaboration
    USER_MENTIONED
    COLLABORATION_INVITE
    REPORT_READY
  }

  enum EventSeverity {
    CRITICAL
    HIGH
    MEDIUM
    LOW
    INFO
  }

  enum NotificationChannel {
    EMAIL
    CHAT
    WEBHOOK
  }

  enum NotificationStatus {
    PENDING
    PROCESSING
    DELIVERED
    FAILED
    EXPIRED
  }

  # ========================================
  # Types
  # ========================================

  type EventActor {
    id: String!
    type: String!
    name: String!
    email: String
  }

  type EventSubject {
    type: String!
    id: String!
    name: String
    url: String
  }

  type EventContext {
    tenantId: String!
    projectId: String
    environment: String
    tags: JSON
  }

  type NotificationEvent {
    id: String!
    type: EventType!
    severity: EventSeverity!
    status: NotificationStatus!
    actor: EventActor!
    subject: EventSubject!
    context: EventContext!
    title: String!
    message: String!
    payload: JSON
    timestamp: DateTime!
    expiresAt: DateTime
  }

  type NotificationResult {
    recipientId: String!
    channel: NotificationChannel!
    success: Boolean!
    messageId: String
    error: String
    deliveredAt: DateTime
  }

  type NotificationJob {
    id: String!
    event: NotificationEvent!
    status: NotificationStatus!
    results: [NotificationResult!]
    createdAt: DateTime!
    processedAt: DateTime
    error: String
  }

  type ChannelPreference {
    enabled: Boolean!
    minSeverity: EventSeverity
    eventTypes: [EventType!]
    batchingEnabled: Boolean
    batchingWindowMinutes: Int
  }

  type QuietHoursConfig {
    enabled: Boolean!
    start: String!
    end: String!
    timezone: String!
  }

  type NotificationPreferences {
    userId: String!
    email: ChannelPreference
    chat: ChannelPreference
    webhook: ChannelPreference
    quietHours: QuietHoursConfig
    severityThresholds: JSON
    eventTypeFilters: NotificationFilters
  }

  type NotificationFilters {
    include: [EventType!]
    exclude: [EventType!]
  }

  type ChannelMetrics {
    sent: Int!
    delivered: Int!
    failed: Int!
  }

  type NotificationMetrics {
    totalEvents: Int!
    totalNotifications: Int!
    totalDelivered: Int!
    totalFailed: Int!
    byChannel: JSON!
    bySeverity: JSON!
    byEventType: JSON!
    averageLatencyMs: Float!
  }

  type ReceiverHealth {
    email: Boolean
    chat: Boolean
    webhook: Boolean
  }

  type AdapterHealth {
    alerting: Boolean!
    pipeline: Boolean!
    copilot: Boolean!
    authority: Boolean!
    investigation: Boolean!
  }

  type NotificationHealth {
    receivers: ReceiverHealth!
    adapters: AdapterHealth!
    healthy: Boolean!
  }

  type MessageTemplate {
    id: String!
    eventType: EventType!
    title: String!
    shortMessage: String!
    message: String!
    callToAction: String
  }

  type TestNotificationResult {
    success: Boolean!
    jobId: String
    error: String
  }

  # ========================================
  # Inputs
  # ========================================

  input ChannelPreferenceInput {
    enabled: Boolean!
    minSeverity: EventSeverity
    eventTypes: [EventType!]
    batchingEnabled: Boolean
    batchingWindowMinutes: Int
  }

  input QuietHoursInput {
    enabled: Boolean!
    start: String!
    end: String!
    timezone: String
  }

  input NotificationFiltersInput {
    include: [EventType!]
    exclude: [EventType!]
  }

  input NotificationPreferencesInput {
    email: ChannelPreferenceInput
    chat: ChannelPreferenceInput
    webhook: ChannelPreferenceInput
    quietHours: QuietHoursInput
    severityThresholds: JSON
    eventTypeFilters: NotificationFiltersInput
  }

  input TestNotificationInput {
    eventType: EventType!
    severity: EventSeverity!
    title: String!
    message: String!
    channels: [NotificationChannel!]
    recipient: String
  }

  # ========================================
  # Queries
  # ========================================

  extend type Query {
    """
    Get notification preferences for a user
    """
    notificationPreferences(userId: String): NotificationPreferences!

    """
    Get notification job by ID
    """
    notificationJob(id: String!): NotificationJob

    """
    Get recent notification jobs
    """
    notificationJobs(
      limit: Int
      offset: Int
      status: NotificationStatus
    ): [NotificationJob!]!

    """
    Get notification metrics
    """
    notificationMetrics: NotificationMetrics!

    """
    Get health status of notification system
    """
    notificationHealth: NotificationHealth!

    """
    List available notification templates
    """
    notificationTemplates: [MessageTemplate!]!

    """
    Get template for a specific event type
    """
    notificationTemplate(eventType: EventType!): MessageTemplate
  }

  # ========================================
  # Mutations
  # ========================================

  extend type Mutation {
    """
    Update notification preferences for the current user
    """
    updateNotificationPreferences(
      input: NotificationPreferencesInput!
    ): NotificationPreferences!

    """
    Enable or disable a notification channel
    """
    setNotificationChannel(
      channel: NotificationChannel!
      enabled: Boolean!
    ): NotificationPreferences!

    """
    Set minimum severity for a channel
    """
    setChannelMinSeverity(
      channel: NotificationChannel!
      severity: EventSeverity!
    ): NotificationPreferences!

    """
    Configure quiet hours
    """
    setQuietHours(
      enabled: Boolean!
      start: String
      end: String
      timezone: String
    ): NotificationPreferences!

    """
    Exclude an event type from notifications
    """
    excludeEventType(eventType: EventType!): NotificationPreferences!

    """
    Include a previously excluded event type
    """
    includeEventType(eventType: EventType!): NotificationPreferences!

    """
    Reset notification preferences to defaults
    """
    resetNotificationPreferences: NotificationPreferences!

    """
    Send a test notification
    """
    sendTestNotification(input: TestNotificationInput!): TestNotificationResult!
  }

  # ========================================
  # Subscriptions
  # ========================================

  extend type Subscription {
    """
    Subscribe to notification events for the current user
    """
    notificationReceived: NotificationEvent!

    """
    Subscribe to notification job status changes
    """
    notificationJobUpdated(jobId: String!): NotificationJob!
  }
`;
