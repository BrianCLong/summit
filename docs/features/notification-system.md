# Notification System

## Overview

The Summit platform now delivers ingestion and machine learning job alerts through a unified notification system. In-app notifications, email, and SMS are coordinated from the Node.js backend with preferences stored in PostgreSQL and exposed over GraphQL. Frontend users can review alerts, mark them read, and tailor delivery channels directly within the application.

## Components

### Backend
- **Database tables**: `notifications` retains delivered events, while `notification_preferences` stores per-event channel choices including email and phone number metadata.
- **GraphQL schema**: Query `notifications`, `notificationPreferences`, and `unreadNotificationCount`. Mutations support updating preferences, marking alerts as read, and dispatching ingestion or ML job notifications. A subscription (`notificationUpdates`) streams real-time updates.
- **Dispatch service**: `NotificationDispatcher` resolves channel preferences, persists alerts, publishes subscription payloads, and integrates with SendGrid and Twilio when API credentials are present.

### Frontend
- **Notification center UI**: React component `NotificationSystem` renders toasts, a notification panel, and an inline preferences editor. The component issues GraphQL queries/mutations and listens for the subscription feed.
- **Preference management**: Users toggle in-app/email/SMS delivery and update contact details, which are persisted immediately via GraphQL mutations.

## Configuration

| Variable | Purpose |
| --- | --- |
| `SENDGRID_API_KEY` | Enables transactional email delivery via SendGrid. |
| `SENDGRID_SENDER` | Optional override for the from-address used in email alerts. |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Enables SMS delivery via Twilio. |
| `TWILIO_FROM_NUMBER` | Phone number used as the SMS sender. |

All variables are optional; when absent the dispatcher records notifications and emits in-app updates without attempting external delivery.

## Usage

1. Ensure PostgreSQL migrations are applied so the notification tables exist.
2. Configure SendGrid and/or Twilio credentials in the server environment if email/SMS delivery is required.
3. Launch the Summit stack. Users will see unread counts in the navigation bar and can open the notification panel to inspect alerts and adjust preferences.
4. Backend services can call the `notifyIngestionComplete` or `notifyMlJobStatus` GraphQL mutations (or reuse the dispatcher service) to publish events.

## Testing

- **Frontend**: Playwright scenario `client/tests/e2e/notifications.e2e.spec.ts` verifies that the UI loads alerts and persists preference updates.
- **Backend**: Execute the server Jest suite (`cd server && npm test`) to validate repository behaviour and service integration.
