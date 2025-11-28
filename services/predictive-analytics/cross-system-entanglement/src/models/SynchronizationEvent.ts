export type EventType = 'STATE_CHANGE' | 'PERFORMANCE_SHIFT' | 'FAILURE_CASCADE';

export interface SynchronizationEvent {
  id: string;
  systems: string[];
  timestamp: Date;
  eventType: EventType;
  synchronizationScore: number;
  timeWindow: number;
  metrics: Record<string, number>;
}

export class SynchronizationEventBuilder {
  private event: Partial<SynchronizationEvent> = {};

  withSystems(systems: string[]): this {
    this.event.systems = systems;
    return this;
  }

  withTimestamp(timestamp: Date): this {
    this.event.timestamp = timestamp;
    return this;
  }

  withEventType(type: EventType): this {
    this.event.eventType = type;
    return this;
  }

  withSynchronizationScore(score: number): this {
    if (score < 0 || score > 1) {
      throw new Error('Synchronization score must be between 0 and 1');
    }
    this.event.synchronizationScore = score;
    return this;
  }

  withTimeWindow(windowMs: number): this {
    if (windowMs <= 0) {
      throw new Error('Time window must be positive');
    }
    this.event.timeWindow = windowMs;
    return this;
  }

  withMetrics(metrics: Record<string, number>): this {
    this.event.metrics = metrics;
    return this;
  }

  build(): SynchronizationEvent {
    if (!this.event.systems || this.event.systems.length < 2) {
      throw new Error('At least 2 systems required for synchronization event');
    }

    if (!this.event.timestamp) {
      this.event.timestamp = new Date();
    }

    if (!this.event.eventType) {
      throw new Error('Event type is required');
    }

    if (this.event.synchronizationScore === undefined) {
      throw new Error('Synchronization score is required');
    }

    if (!this.event.timeWindow) {
      throw new Error('Time window is required');
    }

    if (!this.event.metrics) {
      this.event.metrics = {};
    }

    return {
      id: this.generateId(),
      systems: this.event.systems,
      timestamp: this.event.timestamp,
      eventType: this.event.eventType,
      synchronizationScore: this.event.synchronizationScore,
      timeWindow: this.event.timeWindow,
      metrics: this.event.metrics,
    };
  }

  private generateId(): string {
    const timestamp = this.event.timestamp?.getTime() || Date.now();
    const systemsHash = this.event.systems!.sort().join('-');
    return `sync-event-${systemsHash}-${timestamp}`;
  }
}

export function createSynchronizationEvent(
  systems: string[],
  eventType: EventType,
  synchronizationScore: number,
  timeWindow: number,
  metrics: Record<string, number> = {},
): SynchronizationEvent {
  return new SynchronizationEventBuilder()
    .withSystems(systems)
    .withEventType(eventType)
    .withSynchronizationScore(synchronizationScore)
    .withTimeWindow(timeWindow)
    .withMetrics(metrics)
    .build();
}

export function calculateSynchronizationScore(
  eventTimestamps: Date[],
  timeWindow: number,
): number {
  if (eventTimestamps.length === 0) {
    return 0;
  }

  const timestamps = eventTimestamps.map((d) => d.getTime()).sort((a, b) => a - b);
  const minTime = timestamps[0];
  const maxTime = timestamps[timestamps.length - 1];
  const spread = maxTime - minTime;

  // Perfect synchronization (all events in same bucket) = 1.0
  // Events spread across full window = 0.0
  return Math.max(0, 1 - spread / timeWindow);
}

export function classifyEventType(metrics: Record<string, number>): EventType {
  // Simple heuristic-based classification
  const hasStateChange = Object.keys(metrics).some((key) =>
    key.toLowerCase().includes('state'),
  );
  const hasFailure = Object.keys(metrics).some((key) =>
    key.toLowerCase().includes('error') || key.toLowerCase().includes('failure'),
  );
  const hasPerformance = Object.keys(metrics).some((key) =>
    key.toLowerCase().includes('latency') || key.toLowerCase().includes('throughput'),
  );

  if (hasFailure) {
    return 'FAILURE_CASCADE';
  }

  if (hasStateChange) {
    return 'STATE_CHANGE';
  }

  if (hasPerformance) {
    return 'PERFORMANCE_SHIFT';
  }

  return 'STATE_CHANGE';
}

export function mergeMetrics(
  ...metricSets: Record<string, number>[]
): Record<string, number> {
  const merged: Record<string, number> = {};

  for (const metrics of metricSets) {
    for (const [key, value] of Object.entries(metrics)) {
      if (merged[key] !== undefined) {
        // Average if key exists
        merged[key] = (merged[key] + value) / 2;
      } else {
        merged[key] = value;
      }
    }
  }

  return merged;
}
