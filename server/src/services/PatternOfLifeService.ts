
import { ProvenanceEntry } from '../provenance/ledger';

export interface Pattern {
  id: string;
  type: 'periodicity' | 'sequence' | 'burst' | 'time_distribution';
  confidence: number; // 0.0 to 1.0
  description: string;
  metadata: Record<string, any>;
  detectedAt: Date;
}

export interface PeriodicityMetadata {
  actionType: string;
  intervalSeconds: number;
  variance: number;
  eventCount: number;
}

export interface SequenceMetadata {
  sequence: string[];
  occurrenceCount: number;
}

export interface TimeDistributionMetadata {
  activeHours: number[]; // 0-23
  activeDays: number[]; // 0-6 (Sun-Sat)
}

export class PatternOfLifeService {
  /**
   * Main entry point to detect all supported patterns in a stream of events.
   * Events should ideally be sorted by timestamp.
   */
  detectPatterns(events: ProvenanceEntry[]): Pattern[] {
    if (!events || events.length === 0) {
      return [];
    }

    // Ensure events are sorted by timestamp
    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const patterns: Pattern[] = [];

    patterns.push(...this.detectPeriodicity(sortedEvents));
    patterns.push(...this.detectSequences(sortedEvents));
    patterns.push(...this.detectTimeDistribution(sortedEvents));

    return patterns;
  }

  /**
   * Detects periodic behavior for specific action types.
   * e.g., "User logins every 24 hours" or "System heartbeat every 60 seconds"
   */
  detectPeriodicity(events: ProvenanceEntry[]): Pattern[] {
    const patterns: Pattern[] = [];
    const eventsByType = this.groupEventsByType(events);

    for (const [type, typeEvents] of eventsByType.entries()) {
      if (typeEvents.length < 3) continue; // Need at least 3 events to establish a period

      const timestamps = typeEvents.map((e) => new Date(e.timestamp).getTime());
      const intervals: number[] = [];

      for (let i = 1; i < timestamps.length; i++) {
        intervals.push((timestamps[i] - timestamps[i - 1]) / 1000); // seconds
      }

      // Calculate mean interval and variance
      const meanInterval =
        intervals.reduce((a, b) => a + b, 0) / intervals.length;

      if (meanInterval < 1) continue; // Ignore very high frequency noise for now

      const variance =
        intervals.reduce((a, b) => a + Math.pow(b - meanInterval, 2), 0) /
        intervals.length;
      const stdDev = Math.sqrt(variance);

      // Coefficient of Variation (CV) = stdDev / mean
      // A low CV indicates strong periodicity.
      // We'll use a threshold of 0.1 (10% deviation) for "high confidence".
      const cv = stdDev / meanInterval;

      if (cv < 0.2) {
        // We have a periodic pattern
        const confidence = Math.max(0, 1 - cv * 5); // 0.2 CV -> 0 confidence, 0 CV -> 1 confidence

        patterns.push({
          id: `periodicity-${type}-${Date.now()}`,
          type: 'periodicity',
          confidence,
          description: `Regular activity '${type}' detected every ${meanInterval.toFixed(
            1
          )} seconds (+/- ${stdDev.toFixed(1)}s)`,
          metadata: {
            actionType: type,
            intervalSeconds: meanInterval,
            variance,
            eventCount: typeEvents.length,
          } as PeriodicityMetadata,
          detectedAt: new Date(),
        });
      }
    }

    return patterns;
  }

  /**
   * Detects repeated sequences of actions.
   * Uses a simple N-gram approach.
   */
  detectSequences(events: ProvenanceEntry[]): Pattern[] {
    const patterns: Pattern[] = [];
    const actionSequence = events.map((e) => e.actionType);

    // We'll look for sequences of length 2 to 5
    for (let n = 2; n <= 5; n++) {
      if (actionSequence.length < n * 2) break; // Need at least 2 occurrences

      const ngrams = new Map<string, number>();

      for (let i = 0; i <= actionSequence.length - n; i++) {
        const gram = actionSequence.slice(i, i + n).join('|');
        ngrams.set(gram, (ngrams.get(gram) || 0) + 1);
      }

      for (const [gram, count] of ngrams.entries()) {
        // Threshold: sequence must appear at least 3 times
        if (count >= 3) {
           // Calculate a simple confidence based on frequency relative to total length
           // This is a heuristic.
           const confidence = Math.min(0.95, count / (actionSequence.length / n));

           const sequenceParts = gram.split('|');

           patterns.push({
             id: `sequence-${gram}-${Date.now()}`,
             type: 'sequence',
             confidence,
             description: `Repeated sequence detected: ${sequenceParts.join(
               ' -> '
             )} (${count} times)`,
             metadata: {
               sequence: sequenceParts,
               occurrenceCount: count,
             } as SequenceMetadata,
             detectedAt: new Date(),
           });
        }
      }
    }

    // Filter out sub-sequences if they are part of larger sequences with same count?
    // For MVP, we return all detected n-grams.

    return patterns;
  }

  /**
   * Analyzes time-of-day and day-of-week distribution.
   */
  detectTimeDistribution(events: ProvenanceEntry[]): Pattern[] {
    if (events.length < 10) return [];

    const hours = new Array(24).fill(0);
    const days = new Array(7).fill(0);

    events.forEach(e => {
        const d = new Date(e.timestamp);
        hours[d.getHours()]++;
        days[d.getDay()]++;
    });

    const activeHours = hours
        .map((count, hour) => ({ hour, count }))
        .filter(h => h.count > 0)
        .sort((a, b) => b.count - a.count) // Descending by activity
        .map(h => h.hour);

    const activeDays = days
        .map((count, day) => ({ day, count }))
        .filter(d => d.count > 0)
        .sort((a, b) => b.count - a.count)
        .map(d => d.day);

    // Check if activity is highly concentrated (e.g., 9-5)
    // Simple heuristic: if 80% of events happen in < 50% of the active windows

    return [{
        id: `time-dist-${Date.now()}`,
        type: 'time_distribution',
        confidence: 1.0, // This is just a statistical fact, so high confidence
        description: `Activity concentrated in ${activeHours.slice(0, 3).join(', ')}:00 hours on days ${activeDays.slice(0, 3).join(', ')}`,
        metadata: {
            activeHours,
            activeDays
        } as TimeDistributionMetadata,
        detectedAt: new Date()
    }];
  }

  private groupEventsByType(
    events: ProvenanceEntry[]
  ): Map<string, ProvenanceEntry[]> {
    const groups = new Map<string, ProvenanceEntry[]>();
    for (const e of events) {
      if (!groups.has(e.actionType)) {
        groups.set(e.actionType, []);
      }
      groups.get(e.actionType)!.push(e);
    }
    return groups;
  }
}
