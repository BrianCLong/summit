// server/src/security/soc/correlation.ts

import { randomUUID } from 'crypto';
import { IncidentCandidate } from './models';
import { socStore } from './store';

// Based on the schema from docs/audit/audit-trail.md
export interface AuditEvent {
  actor: { id: string; ip_address: string };
  action: string;
  resource: { id: string; owner: string };
  classification: 'public' | 'internal' | 'confidential' | 'restricted';
  policy_version: string;
  decision_id: string;
  trace_id: string;
  timestamp: string; // ISO 8601 string
  customer: string;
  metadata: Record<string, any>;
}

const TIME_WINDOW_MS = 1000 * 60 * 5; // 5 minutes

export class CorrelationEngine {
  /**
   * Processes a batch of audit events and creates IncidentCandidates.
   * @param events - The audit events to process.
   */
  public processEvents(events: AuditEvent[]): void {
    const eventsByTraceId = this.groupEventsBy(events, 'trace_id');
    this.correlateByTraceId(eventsByTraceId);

    const eventsByActor = this.groupEventsBy(events, 'actor.id');
    this.correlateByActor(eventsByActor);
  }

  private groupEventsBy(events: AuditEvent[], key: string): Map<string, AuditEvent[]> {
    const grouped = new Map<string, AuditEvent[]>();
    for (const event of events) {
      const value = key.split('.').reduce((o, i) => o[i], event as any);
      if (typeof value === 'string') {
        if (!grouped.has(value)) {
          grouped.set(value, []);
        }
        grouped.get(value)!.push(event);
      }
    }
    return grouped;
  }

  private correlateByTraceId(groupedEvents: Map<string, AuditEvent[]>): void {
    for (const [traceId, events] of groupedEvents.entries()) {
      if (events.length > 1) {
        this.createIncidentCandidate(
          `Multiple events in trace ${traceId}`,
          events,
          { correlationKey: 'trace_id', traceId }
        );
      }
    }
  }

  private correlateByActor(groupedEvents: Map<string, AuditEvent[]>): void {
    for (const [actorId, events] of groupedEvents.entries()) {
      const deniedEvents = events
        .filter((e) => e.metadata?.decision === 'deny')
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      if (deniedEvents.length > 1) {
        // Correlate all denied events within the time window
        const correlatedEvents: AuditEvent[] = [];
        let startTime = new Date(deniedEvents[0].timestamp).getTime();

        for (const event of deniedEvents) {
          const eventTime = new Date(event.timestamp).getTime();
          if (eventTime - startTime < TIME_WINDOW_MS) {
            correlatedEvents.push(event);
          } else {
            // If the time window is exceeded, create an incident with the correlated events and start a new window
            if (correlatedEvents.length > 1) {
              this.createIncidentCandidate(
                `Multiple failed actions by actor ${actorId}`,
                correlatedEvents,
                { correlationKey: 'actor.id', actorId }
              );
            }
            correlatedEvents.length = 0; // Clear the array
            correlatedEvents.push(event);
            startTime = eventTime;
          }
        }

        // Create an incident for any remaining correlated events
        if (correlatedEvents.length > 1) {
          this.createIncidentCandidate(
            `Multiple failed actions by actor ${actorId}`,
            correlatedEvents,
            { correlationKey: 'actor.id', actorId }
          );
        }
      }
    }
  }

  private createIncidentCandidate(summary: string, events: AuditEvent[], rationale: Record<string, any>): void {
    const candidate: IncidentCandidate = {
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      severity: this.calculateSeverity(events),
      status: 'new',
      summary,
      evidenceRefs: events.map((e) => e.decision_id),
      entityRefs: [...new Set(events.map((e) => e.actor.id))],
      rationale,
    };
    socStore.addIncidentCandidate(candidate);
  }

  private calculateSeverity(events: AuditEvent[]): IncidentCandidate['severity'] {
    const denyCount = events.filter((e) => e.metadata?.decision === 'deny').length;
    const highClassificationCount = events.filter((e) => ['confidential', 'restricted'].includes(e.classification)).length;

    if (denyCount > 5 || highClassificationCount > 2) {
      return 'critical';
    }
    if (denyCount > 2 || highClassificationCount > 0) {
      return 'high';
    }
    if (denyCount > 0) {
      return 'medium';
    }
    return 'low';
  }
}
