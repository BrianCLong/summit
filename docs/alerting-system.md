# Comprehensive Alerting System (Foundation)

## 1. Overview

This document details the foundational elements of the comprehensive alerting system for the Summit/IntelGraph platform. This initial phase includes the database schema, GraphQL schema, and frontend components.

**Note:** This is a foundational PR. The backend implementation and integration with the frontend will be delivered in a follow-up PR.

## 2. Architecture

The alerting system will consist of three main components:

- **Database (PostgreSQL)**: New tables to store alert rules, alert history, and notification channel configurations.
- **Backend (Node.js/GraphQL)**: An API for managing alerts, a service for evaluating rules, and a service for sending notifications.
- **Frontend (React)**: A user interface for configuring rules, viewing alert history, and managing notification channels.

This PR implements the **Database Schema** and the **Frontend Components** (with mock data).

## 3. Database Schema

The following tables have been added to the PostgreSQL database:

- `alert_rules`: Stores the definitions for each alert, including the metric to monitor, the threshold, and the associated notification channel.
- `alert_history`: Records every instance an alert is triggered, its value, and its acknowledgment status.
- `notification_channels`: Holds the configuration for different notification methods, such as Slack webhooks or email addresses.

## 4. GraphQL Schema

The following GraphQL schema defines the API for the alerting system. **Note: The resolvers for this schema are not implemented in this PR.**

### Queries

- `alertRules`: Fetches all defined alert rules.
- `alertRule(id: ID!)`: Fetches a single alert rule by its ID.
- `alertHistory(ruleId: ID, limit: Int, offset: Int)`: Fetches the history of triggered alerts.
- `notificationChannels`: Fetches all configured notification channels.

### Mutations

- `createAlertRule(input: CreateAlertRuleInput!)`: Creates a new alert rule.
- `updateAlertRule(input: UpdateAlertRuleInput!)`: Updates an existing alert rule.
- `deleteAlertRule(id: ID!)`: Deletes an alert rule.
- `createNotificationChannel(input: CreateNotificationChannelInput!)`: Creates a new notification channel.
- `acknowledgeAlert(historyId: ID!)`: Marks a triggered alert as acknowledged.

## 5. Future Work

The following items will be implemented in a follow-up PR:

- **Backend Resolvers**: Implementation of the GraphQL resolvers to connect the API to the database.
- **Alert Evaluation Service**: The core logic for evaluating rules and triggering alerts.
- **Notification Service**: Integration with Slack, email, and webhooks to send notifications.
- **Frontend Integration**: Connecting the React components to the GraphQL API.
- **Real-time Updates**: Using WebSockets to provide live updates to the frontend.

## 6. Frontend Components

This PR includes the following React components, which are currently populated with mock data:

- `AlertsDashboard`: Displays a table of triggered alerts.
- `AlertRuleForm`: A form for creating and editing alert rules.
- `AlertingPage`: A page that combines the dashboard and form into a single UI.
