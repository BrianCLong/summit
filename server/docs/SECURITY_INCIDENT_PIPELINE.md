# Security Incident Pipeline

This pipeline automates the triage and forensics capture process when a security event occurs.

## Components

- **SecurityIncidentPipeline**: The core service that orchestrates the response.
- **AlertTriageV2Service**: Calculates a risk score for the event.
- **Neo4jService**: Dumps relevant graph data (actor/resource neighborhood).
- **AdvancedAuditSystem**: Captures relevant audit logs.

## Workflow

1.  **Event Trigger**: The pipeline `processEvent` method is called with a `SecurityEvent` object.
2.  **Triage**: The event is scored using `AlertTriageV2Service`.
3.  **Threshold Check**: If the score is below a threshold (e.g., 0.4), the pipeline stops.
4.  **Incident Creation**: A `SecurityIncident` record is created (status: `new`).
5.  **Forensics Capture**:
    *   **Logs**: Recent logs for the actor/resource are fetched from `AdvancedAuditSystem` (simulated).
    *   **DB Snapshot**: Relevant database rows (Actor, Resource) are serialized to JSON.
    *   **Graph Dump**: A 2-hop neighborhood of the actor/resource is dumped from Neo4j.
6.  **Evidence Attachment**: The captured evidence paths/IDs are attached to the incident record.
7.  **Owner Assignment**: An owner is assigned (mock implementation: on-call analyst).
8.  **Alerting**: An alert is raised (mock implementation: log warning).

## Usage

```typescript
import { SecurityIncidentPipeline } from './services/SecurityIncidentPipeline';
import { AlertTriageV2Service } from './services/AlertTriageV2Service';
import { Neo4jService } from './db/neo4j';
import { AdvancedAuditSystem } from './audit/advanced-audit-system';
import { PrismaClient } from '@prisma/client';
import { Redis } from 'ioredis';
import winston from 'winston';

// Initialize dependencies
const prisma = new PrismaClient();
const redis = new Redis();
const logger = winston.createLogger({ ... });
const neo4j = new Neo4jService();
const auditSystem = new AdvancedAuditSystem();
const triageService = new AlertTriageV2Service(prisma, redis, logger);

// Initialize pipeline
const pipeline = new SecurityIncidentPipeline(
  prisma,
  redis,
  logger,
  neo4j,
  auditSystem,
  triageService
);

// Trigger event
const event = {
  id: 'evt-123',
  type: 'suspicious_login',
  severity: 'high',
  timestamp: new Date(),
  tenantId: 'tenant-1',
  actorId: 'user-007',
  details: { ip: '192.168.1.100' }
};

pipeline.processEvent(event).then(incident => {
  console.log('Incident created:', incident);
});
```

## Integration Points

-   **Event Bus**: Listen for security events on the main event bus and call `processEvent`.
-   **Webhooks**: Expose an endpoint (e.g., `/api/security/events`) to trigger the pipeline from external systems.
-   **Scheduled Jobs**: Run periodic checks on high-risk users and trigger events if anomalies are found.
