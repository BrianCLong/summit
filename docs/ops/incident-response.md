# Incident Response Plan

## Severity Levels

| Level     | Description                                               | Response Time | Owner                   |
| --------- | --------------------------------------------------------- | ------------- | ----------------------- |
| **SEV-1** | Critical Outage (Data Loss, Security Breach, Global Down) | 15 mins       | On-Call Engineer + Exec |
| **SEV-2** | Major Degradation (Core feature broken, High Latency)     | 1 hour        | On-Call Engineer        |
| **SEV-3** | Minor Issue (Non-blocking bug, internal tool down)        | 24 hours      | Team Lead               |

## Roles

- **Incident Commander (IC)**: Coordinates response, communicates updates.
- **Tech Lead**: Investigates root cause.
- **Scribe**: Logs events and timeline.

## Workflow

1.  **Detect**: Alert fires or user reports issue.
2.  **Acknowledge**: On-call engineer ACKs the alert.
3.  **Triange**: Determine SEV level.
4.  **Mitigate**: Focus on restoring service (Rollback, Scale, Disable Feature).
5.  **Resolve**: Fix the root cause.
6.  **Review**: Conduct Post-Incident Review (PIR).

## Communication

- **Public Status Page**: Update for SEV-1/SEV-2.
- **Internal Channel**: `#incidents` on Slack.
