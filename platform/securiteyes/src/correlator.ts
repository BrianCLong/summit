import { SuspiciousEvent, Incident } from './types.js';
import { randomUUID } from 'crypto';
import { GraphPersistenceAdapter } from '@intelgraph/core';
import { evaluateGovernancePolicy } from '@intelgraph/governance-kernel';

export class IncidentCorrelator {
  constructor(private graphAdapter: GraphPersistenceAdapter) {}

  async correlate(events: SuspiciousEvent[]): Promise<Incident | null> {
    if (events.length === 0) return null;

    // Simple strategy: Group all incoming events into one incident for v1
    const severity = events.some(e => e.severity === 'HIGH' || e.severity === 'CRITICAL')
      ? 'HIGH'
      : 'MEDIUM';

    // Governance Check: Escalation
    const govDecision = evaluateGovernancePolicy('defensive_security', {
      tenantId: 'system', // or derive from event
      action: 'CREATE_INCIDENT',
      resource: 'Incident',
      params: { eventCount: events.length }
    });

    if (govDecision.outcome === 'DENIED') {
      console.warn('Incident creation blocked by governance policy');
      return null;
    }

    const incident: Incident = {
      id: randomUUID(),
      title: `Security Incident: ${events[0].type}`,
      events,
      status: 'OPEN',
      severity,
      createdAt: new Date()
    };

    // Graph Ingest
    await this.graphAdapter.addNode({
      id: incident.id,
      label: 'Incident',
      properties: { title: incident.title, severity: incident.severity }
    });

    for (const event of events) {
      await this.graphAdapter.addEdge({
        id: randomUUID(),
        from: incident.id,
        to: event.id, // Assuming event is in graph? Or just link logically.
        type: 'LINKED_EVENT',
        properties: { relationship: 'CONTAINS' }
      });
    }

    return incident;
  }
}
