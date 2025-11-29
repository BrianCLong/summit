/**
 * Temporal Utility Functions
 *
 * All timestamps are in UTC milliseconds (Unix epoch).
 * All durations are in milliseconds unless otherwise specified.
 */

import type { TimeWindow, Interval, TimeEvent } from '../types/index.js';

/**
 * Check if two time intervals overlap
 */
export function intervalsOverlap(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  return a.start <= b.end && a.end >= b.start;
}

/**
 * Calculate the overlap duration between two intervals
 * @returns Overlap duration in milliseconds, 0 if no overlap
 */
export function overlapDuration(
  a: { start: number; end: number },
  b: { start: number; end: number },
): number {
  if (!intervalsOverlap(a, b)) {
    return 0;
  }

  const overlapStart = Math.max(a.start, b.start);
  const overlapEnd = Math.min(a.end, b.end);

  return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Calculate the intersection of two time intervals
 * @returns The intersection interval or null if no overlap
 */
export function intervalIntersection(
  a: { start: number; end: number },
  b: { start: number; end: number },
): { start: number; end: number } | null {
  if (!intervalsOverlap(a, b)) {
    return null;
  }

  return {
    start: Math.max(a.start, b.start),
    end: Math.min(a.end, b.end),
  };
}

/**
 * Calculate the union of multiple overlapping intervals
 * @returns Array of merged intervals (non-overlapping)
 */
export function mergeIntervals(
  intervals: Array<{ start: number; end: number }>,
): Array<{ start: number; end: number }> {
  if (intervals.length === 0) {
    return [];
  }

  // Sort by start time
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastMerged = merged[merged.length - 1];

    if (current.start <= lastMerged.end) {
      // Overlapping or adjacent, merge
      lastMerged.end = Math.max(lastMerged.end, current.end);
    } else {
      // No overlap, add new interval
      merged.push({ ...current });
    }
  }

  return merged;
}

/**
 * Find gaps between intervals
 * @returns Array of gap intervals
 */
export function findGaps(
  intervals: Array<{ start: number; end: number }>,
  bounds?: { start: number; end: number },
): Array<{ start: number; end: number }> {
  if (intervals.length === 0) {
    return bounds ? [bounds] : [];
  }

  const merged = mergeIntervals(intervals);
  const gaps: Array<{ start: number; end: number }> = [];

  // Gap before first interval
  if (bounds && bounds.start < merged[0].start) {
    gaps.push({ start: bounds.start, end: merged[0].start });
  }

  // Gaps between intervals
  for (let i = 1; i < merged.length; i++) {
    gaps.push({ start: merged[i - 1].end, end: merged[i].start });
  }

  // Gap after last interval
  if (bounds && bounds.end > merged[merged.length - 1].end) {
    gaps.push({ start: merged[merged.length - 1].end, end: bounds.end });
  }

  return gaps;
}

/**
 * Check if a timestamp falls within a time window
 */
export function timestampInWindow(timestamp: number, window: TimeWindow): boolean {
  return timestamp >= window.start && timestamp <= window.end;
}

/**
 * Check if an interval is fully contained within a time window
 */
export function intervalInWindow(
  interval: { start: number; end: number },
  window: TimeWindow,
): boolean {
  return interval.start >= window.start && interval.end <= window.end;
}

/**
 * Check if an interval intersects with a time window
 */
export function intervalIntersectsWindow(
  interval: { start: number; end: number },
  window: TimeWindow,
): boolean {
  return intervalsOverlap(interval, window);
}

/**
 * Calculate coverage of a time window by a set of intervals
 * @returns Coverage ratio between 0 and 1
 */
export function calculateCoverage(
  intervals: Array<{ start: number; end: number }>,
  window: TimeWindow,
): number {
  const windowDuration = window.end - window.start;
  if (windowDuration <= 0) {
    return 0;
  }

  // Clip intervals to window and merge
  const clipped = intervals
    .map((interval) => ({
      start: Math.max(interval.start, window.start),
      end: Math.min(interval.end, window.end),
    }))
    .filter((interval) => interval.end > interval.start);

  const merged = mergeIntervals(clipped);

  const coveredDuration = merged.reduce(
    (sum, interval) => sum + (interval.end - interval.start),
    0,
  );

  return coveredDuration / windowDuration;
}

/**
 * Split a time window into equal-sized buckets
 */
export function splitTimeWindow(
  window: TimeWindow,
  bucketCount: number,
): TimeWindow[] {
  if (bucketCount <= 0) {
    throw new Error('Bucket count must be positive');
  }

  const duration = window.end - window.start;
  const bucketSize = duration / bucketCount;
  const buckets: TimeWindow[] = [];

  for (let i = 0; i < bucketCount; i++) {
    buckets.push({
      start: window.start + i * bucketSize,
      end: window.start + (i + 1) * bucketSize,
    });
  }

  // Ensure last bucket ends exactly at window.end
  buckets[buckets.length - 1].end = window.end;

  return buckets;
}

/**
 * Group events by time bucket
 */
export function groupEventsByBucket<T extends { timestamp: number }>(
  events: T[],
  buckets: TimeWindow[],
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();

  for (let i = 0; i < buckets.length; i++) {
    grouped.set(i, []);
  }

  for (const event of events) {
    for (let i = 0; i < buckets.length; i++) {
      if (timestampInWindow(event.timestamp, buckets[i])) {
        grouped.get(i)!.push(event);
        break;
      }
    }
  }

  return grouped;
}

/**
 * Calculate temporal density (events per unit time)
 * @returns Events per millisecond
 */
export function temporalDensity(
  events: Array<{ timestamp: number }>,
  window: TimeWindow,
): number {
  const windowDuration = window.end - window.start;
  if (windowDuration <= 0) {
    return 0;
  }

  const eventsInWindow = events.filter((e) =>
    timestampInWindow(e.timestamp, window),
  ).length;

  return eventsInWindow / windowDuration;
}

/**
 * Find sequences of events that occur within a maximum gap time
 */
export function findSequences<T extends { timestamp: number }>(
  events: T[],
  maxGapMs: number,
): T[][] {
  if (events.length === 0) {
    return [];
  }

  // Sort by timestamp
  const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
  const sequences: T[][] = [[sorted[0]]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastSequence = sequences[sequences.length - 1];
    const lastEvent = lastSequence[lastSequence.length - 1];

    if (current.timestamp - lastEvent.timestamp <= maxGapMs) {
      // Continue current sequence
      lastSequence.push(current);
    } else {
      // Start new sequence
      sequences.push([current]);
    }
  }

  return sequences;
}

/**
 * Convert interval duration to human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

/**
 * Create time window for "last N" queries
 */
export function lastNWindow(
  n: number,
  unit: 'ms' | 's' | 'm' | 'h' | 'd',
  referenceTime?: number,
): TimeWindow {
  const now = referenceTime ?? Date.now();

  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const duration = n * multipliers[unit];

  return {
    start: now - duration,
    end: now,
  };
}

/**
 * Validate time window constraints
 */
export function validateTimeWindow(
  window: TimeWindow,
  maxSpanMs: number,
): { valid: boolean; error?: string } {
  if (window.end < window.start) {
    return { valid: false, error: 'End time must be >= start time' };
  }

  const span = window.end - window.start;
  if (span > maxSpanMs) {
    return {
      valid: false,
      error: `Time span ${formatDuration(span)} exceeds maximum ${formatDuration(maxSpanMs)}`,
    };
  }

  return { valid: true };
}

/**
 * Align timestamp to bucket boundary
 */
export function alignToBucket(
  timestamp: number,
  bucketSizeMs: number,
  floor: boolean = true,
): number {
  if (floor) {
    return Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
  }
  return Math.ceil(timestamp / bucketSizeMs) * bucketSizeMs;
}
