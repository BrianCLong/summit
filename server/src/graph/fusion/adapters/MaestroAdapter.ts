import { FusionPayload, FusionEntity } from '../types.js';

export interface Adapter {
  convert(data: any, tenantId: string): FusionPayload;
}

export class MaestroAdapter implements Adapter {
  convert(runEvent: any, tenantId: string): FusionPayload {
    // Example: converting a Maestro Run Start event
    const runId = runEvent.runId;

    const entities: FusionEntity[] = [
      {
        externalId: runId,
        entityType: 'Run',
        name: `Run ${runId}`,
        attributes: {
          status: runEvent.status,
          goal: runEvent.goal
        },
        associatedDate: runEvent.timestamp
      }
    ];

    // Check for actor
    if (runEvent.triggeredBy) {
      entities.push({
        externalId: runEvent.triggeredBy, // e.g., user email or ID
        entityType: 'Actor',
        name: runEvent.triggeredBy, // simplistic
        attributes: { role: 'trigger' }
      });
    }

    // Relationships
    const relationships = [];
    if (runEvent.triggeredBy) {
      relationships.push({
        sourceExternalId: runEvent.triggeredBy,
        targetExternalId: runId,
        edgeType: 'RELATES_TO',
        attributes: { role: 'initiator' }
      });
    }

    // Add implicit RUN_OF tenant edge if tenant is known?
    // Usually handled by context, but we can explicit link if we had a Tenant Entity.

    return {
      source: 'maestro',
      tenantId,
      entities,
      relationships
    };
  }
}
