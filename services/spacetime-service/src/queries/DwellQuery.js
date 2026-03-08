"use strict";
/**
 * Dwell Detection Query Implementation
 *
 * Detects periods where an entity remained stationary within a defined area
 * for a minimum duration. Useful for identifying stops, meetings, or loitering.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeDwellQuery = executeDwellQuery;
exports.detectAllDwellEpisodes = detectAllDwellEpisodes;
exports.calculateDwellStats = calculateDwellStats;
const uuid_1 = require("uuid");
const geo_js_1 = require("../utils/geo.js");
const time_js_1 = require("../utils/time.js");
const DEFAULT_CONFIG = {
    maxMovementRadius: 50, // 50 meters
    minObservations: 2,
    mergeAdjacent: true,
};
/**
 * Execute a dwell detection query
 */
function executeDwellQuery(index, query, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Get entity timeline
    const timeRange = query.timeRange ?? index.getTimeBounds() ?? { start: 0, end: Date.now() };
    let entries = index.getEntityTimeline(query.entityId, timeRange);
    // Filter by policy context
    entries = filterByPolicy(entries, query.context);
    if (entries.length < cfg.minObservations) {
        return [];
    }
    // Filter to entries within the area
    const bbox = (0, geo_js_1.geometryBoundingBox)(query.area);
    const inArea = entries.filter((entry) => {
        // Quick bbox check first
        if (entry.coordinate.latitude < bbox.minLat ||
            entry.coordinate.latitude > bbox.maxLat ||
            entry.coordinate.longitude < bbox.minLon ||
            entry.coordinate.longitude > bbox.maxLon) {
            return false;
        }
        // Then precise geometry check
        return (0, geo_js_1.pointInGeometry)(entry.coordinate, query.area);
    });
    if (inArea.length < cfg.minObservations) {
        return [];
    }
    // Find dwell sequences (continuous presence in area)
    const sequences = findDwellSequences(inArea, query.maxGapDuration, cfg.maxMovementRadius);
    // Convert sequences to dwell episodes
    let episodes = sequencesToEpisodes(sequences, query.entityId, query.minDuration, cfg.minObservations);
    // Merge adjacent episodes if configured
    if (cfg.mergeAdjacent && episodes.length > 1) {
        episodes = mergeAdjacentDwellEpisodes(episodes, query.maxGapDuration);
    }
    // Sort by start time
    episodes.sort((a, b) => a.startTime - b.startTime);
    return episodes;
}
/**
 * Detect all dwell episodes for an entity (without a specific area)
 * Uses clustering to find natural stopping points
 */
function detectAllDwellEpisodes(index, entityId, minDuration, context, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Get full entity timeline
    let entries = index.getEntityTimeline(entityId);
    // Filter by policy
    entries = filterByPolicy(entries, context);
    if (entries.length < cfg.minObservations) {
        return [];
    }
    // Find stationary clusters using temporal proximity and spatial density
    const clusters = findStationaryClusters(entries, cfg.maxMovementRadius, cfg.minObservations);
    const episodes = [];
    for (const cluster of clusters) {
        const duration = cluster.endTime - cluster.startTime;
        if (duration >= minDuration) {
            episodes.push({
                id: (0, uuid_1.v4)(),
                entityId,
                startTime: cluster.startTime,
                endTime: cluster.endTime,
                duration,
                centroid: cluster.centroid,
                pointCount: cluster.entries.length,
                confidence: calculateDwellConfidence(cluster.entries, cluster.centroid, cfg.maxMovementRadius),
            });
        }
    }
    return episodes;
}
/**
 * Calculate dwell statistics for an entity
 */
function calculateDwellStats(episodes) {
    if (episodes.length === 0) {
        return {
            totalDwellTime: 0,
            averageDwellDuration: 0,
            dwellCount: 0,
            longestDwell: 0,
            shortestDwell: 0,
            uniqueLocations: 0,
        };
    }
    const totalDwellTime = episodes.reduce((sum, e) => sum + e.duration, 0);
    const durations = episodes.map((e) => e.duration);
    // Count unique locations (cluster centroids within 100m)
    const uniqueLocations = countUniqueLocations(episodes.map((e) => e.centroid), 100);
    return {
        totalDwellTime,
        averageDwellDuration: totalDwellTime / episodes.length,
        dwellCount: episodes.length,
        longestDwell: Math.max(...durations),
        shortestDwell: Math.min(...durations),
        uniqueLocations,
    };
}
/**
 * Find sequences of entries that represent dwelling
 */
function findDwellSequences(entries, maxGapMs, maxMovementRadius) {
    if (entries.length === 0) {
        return [];
    }
    // First split by time gaps
    const timeSequences = (0, time_js_1.findSequences)(entries, maxGapMs);
    const dwellSequences = [];
    for (const sequence of timeSequences) {
        // Then check if movement is within threshold
        if (sequence.length === 1) {
            dwellSequences.push(sequence);
            continue;
        }
        const centroid = (0, geo_js_1.calculateCentroid)(sequence.map((e) => e.coordinate));
        const allWithinRadius = sequence.every((e) => (0, geo_js_1.haversineDistance)(centroid, e.coordinate) <= maxMovementRadius);
        if (allWithinRadius) {
            dwellSequences.push(sequence);
        }
        else {
            // Split by movement - find sub-sequences that are stationary
            const subSequences = splitByMovement(sequence, maxMovementRadius);
            dwellSequences.push(...subSequences);
        }
    }
    return dwellSequences;
}
/**
 * Split a sequence by excessive movement
 */
function splitByMovement(entries, maxRadius) {
    if (entries.length <= 1) {
        return entries.length === 1 ? [[entries[0]]] : [];
    }
    const sequences = [];
    let currentSequence = [entries[0]];
    let currentCentroid = entries[0].coordinate;
    for (let i = 1; i < entries.length; i++) {
        const entry = entries[i];
        const distance = (0, geo_js_1.haversineDistance)(currentCentroid, entry.coordinate);
        if (distance <= maxRadius) {
            currentSequence.push(entry);
            // Update centroid
            currentCentroid = (0, geo_js_1.calculateCentroid)(currentSequence.map((e) => e.coordinate));
        }
        else {
            // Start new sequence
            if (currentSequence.length > 0) {
                sequences.push(currentSequence);
            }
            currentSequence = [entry];
            currentCentroid = entry.coordinate;
        }
    }
    if (currentSequence.length > 0) {
        sequences.push(currentSequence);
    }
    return sequences;
}
/**
 * Find stationary clusters in a timeline
 */
function findStationaryClusters(entries, maxRadius, minPoints) {
    const clusters = [];
    let i = 0;
    while (i < entries.length) {
        const clusterEntries = [entries[i]];
        let centroid = entries[i].coordinate;
        let j = i + 1;
        while (j < entries.length) {
            const candidate = entries[j];
            const distance = (0, geo_js_1.haversineDistance)(centroid, candidate.coordinate);
            if (distance <= maxRadius) {
                clusterEntries.push(candidate);
                centroid = (0, geo_js_1.calculateCentroid)(clusterEntries.map((e) => e.coordinate));
                j++;
            }
            else {
                break;
            }
        }
        if (clusterEntries.length >= minPoints) {
            clusters.push({
                entries: clusterEntries,
                centroid,
                startTime: clusterEntries[0].start,
                endTime: clusterEntries[clusterEntries.length - 1].end,
            });
        }
        i = j;
    }
    return clusters;
}
/**
 * Convert dwell sequences to episodes
 */
function sequencesToEpisodes(sequences, entityId, minDuration, minObservations) {
    const episodes = [];
    for (const sequence of sequences) {
        if (sequence.length < minObservations) {
            continue;
        }
        const startTime = sequence[0].start;
        const endTime = sequence[sequence.length - 1].end;
        const duration = endTime - startTime;
        if (duration < minDuration) {
            continue;
        }
        const centroid = (0, geo_js_1.calculateCentroid)(sequence.map((e) => e.coordinate));
        episodes.push({
            id: (0, uuid_1.v4)(),
            entityId,
            startTime,
            endTime,
            duration,
            centroid,
            pointCount: sequence.length,
            confidence: calculateDwellConfidence(sequence, centroid, 50),
        });
    }
    return episodes;
}
/**
 * Merge adjacent dwell episodes at the same location
 */
function mergeAdjacentDwellEpisodes(episodes, maxGapMs) {
    if (episodes.length <= 1) {
        return episodes;
    }
    const sorted = [...episodes].sort((a, b) => a.startTime - b.startTime);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];
        const timeGap = current.startTime - last.endTime;
        const spatialDistance = (0, geo_js_1.haversineDistance)(last.centroid, current.centroid);
        // Merge if close in time and space
        if (timeGap <= maxGapMs && spatialDistance <= 100) {
            last.endTime = current.endTime;
            last.duration = last.endTime - last.startTime;
            last.pointCount += current.pointCount;
            last.centroid = (0, geo_js_1.calculateCentroid)([last.centroid, current.centroid]);
            last.confidence = (last.confidence + current.confidence) / 2;
        }
        else {
            merged.push(current);
        }
    }
    return merged;
}
/**
 * Calculate confidence score for a dwell episode
 */
function calculateDwellConfidence(entries, centroid, maxRadius) {
    if (entries.length === 0) {
        return 0;
    }
    // Calculate spatial spread
    let totalDistance = 0;
    for (const entry of entries) {
        totalDistance += (0, geo_js_1.haversineDistance)(centroid, entry.coordinate);
    }
    const avgDistance = totalDistance / entries.length;
    const spatialScore = Math.max(0, 1 - avgDistance / maxRadius);
    // Calculate temporal density
    const duration = entries[entries.length - 1].end - entries[0].start;
    const pointsPerMinute = duration > 0 ? (entries.length * 60000) / duration : 0;
    const temporalScore = Math.min(1, pointsPerMinute / 2); // 2 points/min = full score
    // Observation count score
    const countScore = Math.min(1, entries.length / 5); // 5+ observations = full score
    return 0.4 * spatialScore + 0.3 * temporalScore + 0.3 * countScore;
}
/**
 * Count unique locations within a radius
 */
function countUniqueLocations(coordinates, radiusMeters) {
    if (coordinates.length === 0) {
        return 0;
    }
    const unique = [];
    for (const coord of coordinates) {
        const isNearExisting = unique.some((u) => (0, geo_js_1.haversineDistance)(u, coord) <= radiusMeters);
        if (!isNearExisting) {
            unique.push(coord);
        }
    }
    return unique.length;
}
/**
 * Filter entries by policy context
 */
function filterByPolicy(entries, context) {
    return entries.filter((entry) => {
        if (entry.tenantId !== context.tenantId) {
            return false;
        }
        if (context.policyLabels.length > 0) {
            const entryLabels = new Set(entry.policyLabels);
            return context.policyLabels.every((label) => entryLabels.has(label));
        }
        return true;
    });
}
