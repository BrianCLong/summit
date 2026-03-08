"use strict";
/**
 * Temporal Utility Functions
 *
 * All timestamps are in UTC milliseconds (Unix epoch).
 * All durations are in milliseconds unless otherwise specified.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.intervalsOverlap = intervalsOverlap;
exports.overlapDuration = overlapDuration;
exports.intervalIntersection = intervalIntersection;
exports.mergeIntervals = mergeIntervals;
exports.findGaps = findGaps;
exports.timestampInWindow = timestampInWindow;
exports.intervalInWindow = intervalInWindow;
exports.intervalIntersectsWindow = intervalIntersectsWindow;
exports.calculateCoverage = calculateCoverage;
exports.splitTimeWindow = splitTimeWindow;
exports.groupEventsByBucket = groupEventsByBucket;
exports.temporalDensity = temporalDensity;
exports.findSequences = findSequences;
exports.formatDuration = formatDuration;
exports.lastNWindow = lastNWindow;
exports.validateTimeWindow = validateTimeWindow;
exports.alignToBucket = alignToBucket;
/**
 * Check if two time intervals overlap
 */
function intervalsOverlap(a, b) {
    return a.start <= b.end && a.end >= b.start;
}
/**
 * Calculate the overlap duration between two intervals
 * @returns Overlap duration in milliseconds, 0 if no overlap
 */
function overlapDuration(a, b) {
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
function intervalIntersection(a, b) {
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
function mergeIntervals(intervals) {
    if (intervals.length === 0) {
        return [];
    }
    // Sort by start time
    const sorted = [...intervals].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const lastMerged = merged[merged.length - 1];
        if (current.start <= lastMerged.end) {
            // Overlapping or adjacent, merge
            lastMerged.end = Math.max(lastMerged.end, current.end);
        }
        else {
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
function findGaps(intervals, bounds) {
    if (intervals.length === 0) {
        return bounds ? [bounds] : [];
    }
    const merged = mergeIntervals(intervals);
    const gaps = [];
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
function timestampInWindow(timestamp, window) {
    return timestamp >= window.start && timestamp <= window.end;
}
/**
 * Check if an interval is fully contained within a time window
 */
function intervalInWindow(interval, window) {
    return interval.start >= window.start && interval.end <= window.end;
}
/**
 * Check if an interval intersects with a time window
 */
function intervalIntersectsWindow(interval, window) {
    return intervalsOverlap(interval, window);
}
/**
 * Calculate coverage of a time window by a set of intervals
 * @returns Coverage ratio between 0 and 1
 */
function calculateCoverage(intervals, window) {
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
    const coveredDuration = merged.reduce((sum, interval) => sum + (interval.end - interval.start), 0);
    return coveredDuration / windowDuration;
}
/**
 * Split a time window into equal-sized buckets
 */
function splitTimeWindow(window, bucketCount) {
    if (bucketCount <= 0) {
        throw new Error('Bucket count must be positive');
    }
    const duration = window.end - window.start;
    const bucketSize = duration / bucketCount;
    const buckets = [];
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
function groupEventsByBucket(events, buckets) {
    const grouped = new Map();
    for (let i = 0; i < buckets.length; i++) {
        grouped.set(i, []);
    }
    for (const event of events) {
        for (let i = 0; i < buckets.length; i++) {
            if (timestampInWindow(event.timestamp, buckets[i])) {
                grouped.get(i).push(event);
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
function temporalDensity(events, window) {
    const windowDuration = window.end - window.start;
    if (windowDuration <= 0) {
        return 0;
    }
    const eventsInWindow = events.filter((e) => timestampInWindow(e.timestamp, window)).length;
    return eventsInWindow / windowDuration;
}
/**
 * Find sequences of events that occur within a maximum gap time
 */
function findSequences(events, maxGapMs) {
    if (events.length === 0) {
        return [];
    }
    // Sort by timestamp
    const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);
    const sequences = [[sorted[0]]];
    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const lastSequence = sequences[sequences.length - 1];
        const lastEvent = lastSequence[lastSequence.length - 1];
        if (current.timestamp - lastEvent.timestamp <= maxGapMs) {
            // Continue current sequence
            lastSequence.push(current);
        }
        else {
            // Start new sequence
            sequences.push([current]);
        }
    }
    return sequences;
}
/**
 * Convert interval duration to human-readable string
 */
function formatDuration(ms) {
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
function lastNWindow(n, unit, referenceTime) {
    const now = referenceTime ?? Date.now();
    const multipliers = {
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
function validateTimeWindow(window, maxSpanMs) {
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
function alignToBucket(timestamp, bucketSizeMs, floor = true) {
    if (floor) {
        return Math.floor(timestamp / bucketSizeMs) * bucketSizeMs;
    }
    return Math.ceil(timestamp / bucketSizeMs) * bucketSizeMs;
}
