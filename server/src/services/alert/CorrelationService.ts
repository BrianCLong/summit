import { AlertEvent, Incident } from '../../types/alerts.js';
import crypto from 'crypto';

export class CorrelationService {
  private eventsByKey: Map<string, AlertEvent[]> = new Map();
  private windowMs: number;

  constructor(windowMs: number = 5 * 60 * 1000) {
    this.windowMs = windowMs;
  }

  public correlate(events: AlertEvent[]): Incident[] {
    for (const e of events) {
      const key = this.getCorrelationKey(e);
      if (!this.eventsByKey.has(key)) {
        this.eventsByKey.set(key, []);
      }
      this.eventsByKey.get(key)!.push(e);
    }

    const incidents: Incident[] = [];

    for (const [key, list] of this.eventsByKey) {
      // Sort by timestamp
      list.sort((a, b) => a.timestamp - b.timestamp);

      let bucket: AlertEvent[] = [];
      if (list.length === 0) continue;

      let start = list[0].timestamp;

      for (const ev of list) {
        if (ev.timestamp - start > this.windowMs) {
          if (bucket.length > 0) {
            incidents.push(this.makeIncident(key, bucket));
          }
          bucket = [];
          start = ev.timestamp;
        }
        bucket.push(ev);
      }
      if (bucket.length > 0) {
        incidents.push(this.makeIncident(key, bucket));
      }
    }

    // Clear processed events or manage state in a real persistent way
    // For now, we clear the map to simulate processing a batch
    this.eventsByKey.clear();

    return incidents;
  }

  private getCorrelationKey(event: AlertEvent): string {
    // Simple key based on sorted entities. In prod, use normalized IDs.
    return event.entities ? event.entities.sort().join('|') : 'global';
  }

  private makeIncident(key: string, events: AlertEvent[]): Incident {
    const start = events[0].timestamp;
    const end = events[events.length - 1].timestamp;
    let severity: Incident['severity'] = 'low';

    if (events.length >= 5) severity = 'critical';
    else if (events.length >= 3) severity = 'high';
    else if (events.length === 2) severity = 'medium';

    return {
      id: crypto.randomUUID(),
      key,
      start,
      end,
      events,
      severity
    };
  }
}

export const correlationService = new CorrelationService();
