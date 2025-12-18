/**
 * Event correlation utilities
 */

import { ThreatEvent } from '../types/events';
import { createHash } from 'crypto';

/**
 * Generate correlation ID based on event characteristics
 */
export function generateCorrelationId(event: ThreatEvent): string {
  const correlationKey = [
    event.category,
    event.sourceIp || '',
    event.userId || '',
    event.entityId || '',
    Math.floor(event.timestamp.getTime() / (5 * 60 * 1000)) // 5-minute windows
  ].join('|');

  return createHash('sha256').update(correlationKey).digest('hex').substring(0, 16);
}

/**
 * Calculate similarity score between two events
 */
export function calculateEventSimilarity(event1: ThreatEvent, event2: ThreatEvent): number {
  let similarityScore = 0;
  let factors = 0;

  // Category match
  if (event1.category === event2.category) {
    similarityScore += 1;
  }
  factors++;

  // Severity match
  if (event1.severity === event2.severity) {
    similarityScore += 0.5;
  }
  factors++;

  // Source match
  if (event1.source === event2.source) {
    similarityScore += 0.5;
  }
  factors++;

  // IP match
  if (event1.sourceIp && event2.sourceIp && event1.sourceIp === event2.sourceIp) {
    similarityScore += 1;
  }
  if (event1.sourceIp || event2.sourceIp) factors++;

  // User match
  if (event1.userId && event2.userId && event1.userId === event2.userId) {
    similarityScore += 1;
  }
  if (event1.userId || event2.userId) factors++;

  // Entity match
  if (event1.entityId && event2.entityId && event1.entityId === event2.entityId) {
    similarityScore += 1;
  }
  if (event1.entityId || event2.entityId) factors++;

  // Time proximity (within 1 hour)
  const timeDiff = Math.abs(event1.timestamp.getTime() - event2.timestamp.getTime());
  const oneHour = 3600000;
  if (timeDiff < oneHour) {
    similarityScore += 1 - (timeDiff / oneHour);
  }
  factors++;

  // Indicator overlap
  const indicators1 = new Set(event1.indicators);
  const indicators2 = new Set(event2.indicators);
  const intersection = new Set([...indicators1].filter(x => indicators2.has(x)));
  const union = new Set([...indicators1, ...indicators2]);

  if (union.size > 0) {
    similarityScore += intersection.size / union.size;
    factors++;
  }

  // MITRE technique overlap
  if (event1.mitreAttackTechniques && event2.mitreAttackTechniques) {
    const techniques1 = new Set(event1.mitreAttackTechniques);
    const techniques2 = new Set(event2.mitreAttackTechniques);
    const techniqueIntersection = new Set([...techniques1].filter(x => techniques2.has(x)));
    const techniqueUnion = new Set([...techniques1, ...techniques2]);

    if (techniqueUnion.size > 0) {
      similarityScore += techniqueIntersection.size / techniqueUnion.size;
      factors++;
    }
  }

  return factors > 0 ? similarityScore / factors : 0;
}

/**
 * Group related events based on correlation
 */
export function correlateEvents(
  events: ThreatEvent[],
  similarityThreshold: number = 0.7
): ThreatEvent[][] {
  const groups: ThreatEvent[][] = [];
  const processed = new Set<string>();

  for (const event of events) {
    if (processed.has(event.id)) continue;

    const group: ThreatEvent[] = [event];
    processed.add(event.id);

    for (const otherEvent of events) {
      if (processed.has(otherEvent.id)) continue;

      const similarity = calculateEventSimilarity(event, otherEvent);
      if (similarity >= similarityThreshold) {
        group.push(otherEvent);
        processed.add(otherEvent.id);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Detect event sequences (multi-stage attacks)
 */
export function detectEventSequence(
  events: ThreatEvent[],
  pattern: {
    stages: {
      category?: string;
      techniques?: string[];
      minSeverity?: string;
    }[];
    maxTimeBetweenStages?: number; // milliseconds
  }
): {
  matched: boolean;
  matchedEvents: ThreatEvent[];
  confidence: number;
} {
  if (events.length < pattern.stages.length) {
    return { matched: false, matchedEvents: [], confidence: 0 };
  }

  const sortedEvents = [...events].sort((a, b) =>
    a.timestamp.getTime() - b.timestamp.getTime()
  );

  const matchedEvents: ThreatEvent[] = [];
  let stageIndex = 0;

  for (const event of sortedEvents) {
    if (stageIndex >= pattern.stages.length) break;

    const stage = pattern.stages[stageIndex];
    let stageMatches = true;

    if (stage.category && event.category !== stage.category) {
      stageMatches = false;
    }

    if (stage.techniques && event.mitreAttackTechniques) {
      const hasMatchingTechnique = stage.techniques.some(t =>
        event.mitreAttackTechniques!.includes(t)
      );
      if (!hasMatchingTechnique) {
        stageMatches = false;
      }
    }

    if (stageMatches) {
      // Check time window if not first stage
      if (matchedEvents.length > 0 && pattern.maxTimeBetweenStages) {
        const lastEvent = matchedEvents[matchedEvents.length - 1];
        const timeDiff = event.timestamp.getTime() - lastEvent.timestamp.getTime();

        if (timeDiff > pattern.maxTimeBetweenStages) {
          // Reset sequence
          matchedEvents.length = 0;
          stageIndex = 0;
          continue;
        }
      }

      matchedEvents.push(event);
      stageIndex++;
    }
  }

  const matched = matchedEvents.length === pattern.stages.length;
  const confidence = matched ? matchedEvents.length / pattern.stages.length : 0;

  return { matched, matchedEvents, confidence };
}

/**
 * Generate alert fingerprint for deduplication
 */
export function generateAlertFingerprint(event: ThreatEvent): string {
  const fingerprintKey = [
    event.category,
    event.severity,
    event.sourceIp || 'none',
    event.userId || 'none',
    event.description.substring(0, 100), // First 100 chars
    event.indicators.sort().join(',')
  ].join('|');

  return createHash('sha256').update(fingerprintKey).digest('hex');
}

/**
 * Temporal correlation - detect patterns over time
 */
export function detectTemporalPattern(
  events: ThreatEvent[],
  options: {
    windowSize: number; // milliseconds
    minEvents: number;
    category?: string;
  }
): {
  detected: boolean;
  windows: {
    start: Date;
    end: Date;
    events: ThreatEvent[];
    frequency: number;
  }[];
} {
  const windows: {
    start: Date;
    end: Date;
    events: ThreatEvent[];
    frequency: number;
  }[] = [];

  if (events.length === 0) {
    return { detected: false, windows };
  }

  const sortedEvents = [...events]
    .filter(e => !options.category || e.category === options.category)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  let windowStart = sortedEvents[0].timestamp.getTime();
  let windowEnd = windowStart + options.windowSize;
  let windowEvents: ThreatEvent[] = [];

  for (const event of sortedEvents) {
    const eventTime = event.timestamp.getTime();

    if (eventTime <= windowEnd) {
      windowEvents.push(event);
    } else {
      // Process current window
      if (windowEvents.length >= options.minEvents) {
        windows.push({
          start: new Date(windowStart),
          end: new Date(windowEnd),
          events: [...windowEvents],
          frequency: windowEvents.length / (options.windowSize / 1000) // events per second
        });
      }

      // Start new window
      windowStart = eventTime;
      windowEnd = windowStart + options.windowSize;
      windowEvents = [event];
    }
  }

  // Process last window
  if (windowEvents.length >= options.minEvents) {
    windows.push({
      start: new Date(windowStart),
      end: new Date(windowEnd),
      events: windowEvents,
      frequency: windowEvents.length / (options.windowSize / 1000)
    });
  }

  return {
    detected: windows.length > 0,
    windows
  };
}

/**
 * Spatial correlation - detect patterns across entities
 */
export function detectSpatialPattern(
  events: ThreatEvent[],
  options: {
    minAffectedEntities: number;
    entityField: 'userId' | 'sourceIp' | 'entityId';
  }
): {
  detected: boolean;
  affectedEntities: Set<string>;
  eventsByEntity: Map<string, ThreatEvent[]>;
} {
  const eventsByEntity = new Map<string, ThreatEvent[]>();

  for (const event of events) {
    const entityId = event[options.entityField];
    if (!entityId) continue;

    if (!eventsByEntity.has(entityId)) {
      eventsByEntity.set(entityId, []);
    }
    eventsByEntity.get(entityId)!.push(event);
  }

  const affectedEntities = new Set(eventsByEntity.keys());
  const detected = affectedEntities.size >= options.minAffectedEntities;

  return {
    detected,
    affectedEntities,
    eventsByEntity
  };
}
