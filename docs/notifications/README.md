# Notifications, Alerts & Communication Channels

This directory contains the documentation and standards for the CompanyOS Notification System.

## Mission
To ensure important information reaches the right people at the right time, without causing alert fatigue.

## Artifacts

*   [**Taxonomy**](./TAXONOMY.md): Definitions of alert types, severity levels, and routing rules.
*   [**Notification Flows**](./FLOWS.md): Detailed examples of how events travel through the system (Incidents, Approvals, Security).
*   [**Quality Checklist**](./QUALITY_CHECKLIST.md): Standards for creating new alerts. "Is this alert justified?"

## Architecture Implementation

The implementation resides in `server/src/notifications-hub/`.

### Key Components

*   **Canonical Event**: The standard envelope for all messages.
*   **Notification Hub**: The central router and dispatcher.
*   **Adapters**: Transform domain events (Pipeline, Alerting) into Canonical Events.
*   **Receivers**: Delivery agents (Email, Slack, Webhook, etc.).

## Quick Links

*   [Source Code](../../server/src/notifications-hub/)
*   [Architecture Diagram](../../server/src/notifications-hub/README.md)
