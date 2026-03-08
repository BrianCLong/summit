"use strict";
/**
 * Co-Presence Query Implementation
 *
 * Finds episodes where multiple entities were at the same place at the same time.
 * Uses a sliding window approach with spatial clustering.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeCoPresenceQuery = executeCoPresenceQuery;
exports.calculateCoPresenceStats = calculateCoPresenceStats;
const uuid_1 = require("uuid");
const geo_js_1 = require("../utils/geo.js");
const time_js_1 = require("../utils/time.js");
const DEFAULT_CONFIG = {
    timeBucketMs: 60000, // 1 minute
    minConfidence: 0.5,
    mergeAdjacentEpisodes: true,
    mergeGapMs: 300000, // 5 minutes
};
/**
 * Execute a co-presence query
 */
function executeCoPresenceQuery(index, query, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Validate query
    if (query.entityIds.length < 2) {
        throw new Error('Co-presence query requires at least 2 entity IDs');
    }
    // Get all entries for requested entities in time window
    const entityEntries = new Map();
    const entityIdSet = new Set(query.entityIds);
    for (const entityId of query.entityIds) {
        const entries = index.getEntityTimeline(entityId, query.timeWindow);
        // Filter by policy context
        const filtered = filterByPolicy(entries, query.context);
        if (filtered.length > 0) {
            entityEntries.set(entityId, filtered);
        }
    }
    // Need at least 2 entities with data
    if (entityEntries.size < 2) {
        return [];
    }
    // Find co-presence candidates using time bucketing
    const candidates = findCoPresenceCandidates(entityEntries, query.timeWindow, query.radius, cfg.timeBucketMs);
    // Convert candidates to episodes
    let episodes = candidatesToEpisodes(candidates, query.minOverlapDuration, query.minConfidence);
    // Merge adjacent episodes if configured
    if (cfg.mergeAdjacentEpisodes && episodes.length > 1) {
        episodes = mergeAdjacentEpisodes(episodes, cfg.mergeGapMs, query.radius);
    }
    // Sort by start time
    episodes.sort((a, b) => a.startTime - b.startTime);
    return episodes;
}
/**
 * Find co-presence candidates by bucketing time and checking spatial proximity
 */
function findCoPresenceCandidates(entityEntries, timeWindow, radius, timeBucketMs) {
    const candidates = [];
    // Create time buckets
    const bucketCount = Math.ceil((timeWindow.end - timeWindow.start) / timeBucketMs);
    for (let i = 0; i < bucketCount; i++) {
        const bucketStart = timeWindow.start + i * timeBucketMs;
        const bucketEnd = Math.min(bucketStart + timeBucketMs, timeWindow.end);
        const bucket = { start: bucketStart, end: bucketEnd };
        // Get entries in this bucket for each entity
        const bucketEntries = new Map();
        for (const [entityId, entries] of entityEntries) {
            const inBucket = entries.filter((e) => (0, time_js_1.intervalsOverlap)({ start: e.start, end: e.end }, bucket));
            if (inBucket.length > 0) {
                bucketEntries.set(entityId, inBucket);
            }
        }
        // Need at least 2 entities in bucket
        if (bucketEntries.size < 2) {
            continue;
        }
        // Check spatial proximity between all entity pairs
        const candidate = checkSpatialProximity(bucketEntries, radius, bucket);
        if (candidate && candidate.entityIds.size >= 2) {
            candidates.push(candidate);
        }
    }
    return candidates;
}
/**
 * Check if entities in a time bucket are spatially proximate
 */
function checkSpatialProximity(bucketEntries, radius, bucket) {
    const allEntries = [];
    for (const entries of bucketEntries.values()) {
        allEntries.push(...entries);
    }
    if (allEntries.length < 2) {
        return null;
    }
    // Calculate centroid of all points
    const coordinates = allEntries.map((e) => e.coordinate);
    const centroid = (0, geo_js_1.calculateCentroid)(coordinates);
    // Find entries within radius of centroid
    const withinRadius = [];
    let maxDistance = 0;
    for (const entry of allEntries) {
        const distance = (0, geo_js_1.haversineDistance)(centroid, entry.coordinate);
        if (distance <= radius) {
            withinRadius.push(entry);
            maxDistance = Math.max(maxDistance, distance);
        }
    }
    // Get unique entity IDs within radius
    const entityIds = new Set(withinRadius.map((e) => e.entityId));
    if (entityIds.size < 2) {
        return null;
    }
    // Calculate time ranges for each entity
    const timeRanges = [];
    for (const entry of withinRadius) {
        timeRanges.push({
            start: Math.max(entry.start, bucket.start),
            end: Math.min(entry.end, bucket.end),
        });
    }
    return {
        entityIds,
        entries: withinRadius,
        centroid,
        radius: maxDistance,
        timeRanges,
    };
}
/**
 * Convert candidates to co-presence episodes
 */
function candidatesToEpisodes(candidates, minOverlapDuration, minConfidence) {
    const episodes = [];
    for (const candidate of candidates) {
        // Calculate overlap duration
        const mergedRanges = (0, time_js_1.mergeIntervals)(candidate.timeRanges);
        const totalDuration = mergedRanges.reduce((sum, r) => sum + (r.end - r.start), 0);
        if (totalDuration < minOverlapDuration) {
            continue;
        }
        // Calculate confidence based on:
        // - Number of observations per entity
        // - Spatial spread (tighter = higher confidence)
        // - Temporal density
        const entriesPerEntity = new Map();
        for (const entry of candidate.entries) {
            entriesPerEntity.set(entry.entityId, (entriesPerEntity.get(entry.entityId) || 0) + 1);
        }
        const minEntriesPerEntity = Math.min(...entriesPerEntity.values());
        const observationScore = Math.min(1, minEntriesPerEntity / 3); // 3+ observations = full score
        const spatialScore = 1 - candidate.radius / 1000; // Penalty for spread > 1km
        const normalizedSpatialScore = Math.max(0, Math.min(1, spatialScore));
        const confidence = 0.5 * observationScore + 0.5 * normalizedSpatialScore;
        if (confidence < minConfidence) {
            continue;
        }
        // Determine time bounds
        let startTime = Infinity;
        let endTime = -Infinity;
        for (const range of mergedRanges) {
            startTime = Math.min(startTime, range.start);
            endTime = Math.max(endTime, range.end);
        }
        episodes.push({
            id: (0, uuid_1.v4)(),
            entityIds: Array.from(candidate.entityIds),
            startTime,
            endTime,
            duration: totalDuration,
            centroid: candidate.centroid,
            radius: candidate.radius,
            confidence,
            overlapCount: candidate.entries.length,
            metadata: {
                entriesPerEntity: Object.fromEntries(entriesPerEntity),
                mergedRangeCount: mergedRanges.length,
            },
        });
    }
    return episodes;
}
/**
 * Merge adjacent episodes that are close in time and space
 */
function mergeAdjacentEpisodes(episodes, maxGapMs, maxRadius) {
    if (episodes.length <= 1) {
        return episodes;
    }
    // Sort by start time
    const sorted = [...episodes].sort((a, b) => a.startTime - b.startTime);
    const merged = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
        const current = sorted[i];
        const last = merged[merged.length - 1];
        // Check if should merge
        const timeGap = current.startTime - last.endTime;
        const spatialDistance = (0, geo_js_1.haversineDistance)(last.centroid, current.centroid);
        const sameEntities = current.entityIds.length === last.entityIds.length &&
            current.entityIds.every((id) => last.entityIds.includes(id));
        if (sameEntities &&
            timeGap <= maxGapMs &&
            spatialDistance <= maxRadius) {
            // Merge into last
            last.endTime = current.endTime;
            last.duration = last.endTime - last.startTime;
            last.overlapCount += current.overlapCount;
            last.confidence = (last.confidence + current.confidence) / 2;
            // Recalculate centroid
            last.centroid = (0, geo_js_1.calculateCentroid)([last.centroid, current.centroid]);
            last.radius = Math.max(last.radius, current.radius, spatialDistance / 2);
        }
        else {
            merged.push(current);
        }
    }
    return merged;
}
/**
 * Filter entries by policy context
 */
function filterByPolicy(entries, context) {
    return entries.filter((entry) => {
        // Must match tenant
        if (entry.tenantId !== context.tenantId) {
            return false;
        }
        // Check policy labels (entry must have all required labels)
        if (context.policyLabels.length > 0) {
            const entryLabels = new Set(entry.policyLabels);
            return context.policyLabels.every((label) => entryLabels.has(label));
        }
        return true;
    });
}
/**
 * Calculate statistics for co-presence results
 */
function calculateCoPresenceStats(episodes) {
    if (episodes.length === 0) {
        return {
            totalEpisodes: 0,
            totalDuration: 0,
            averageDuration: 0,
            uniqueEntityPairs: 0,
            averageConfidence: 0,
        };
    }
    const totalDuration = episodes.reduce((sum, e) => sum + e.duration, 0);
    const avgConfidence = episodes.reduce((sum, e) => sum + e.confidence, 0) / episodes.length;
    // Count unique entity pairs
    const pairs = new Set();
    for (const episode of episodes) {
        const sortedIds = [...episode.entityIds].sort();
        for (let i = 0; i < sortedIds.length; i++) {
            for (let j = i + 1; j < sortedIds.length; j++) {
                pairs.add(`${sortedIds[i]}:${sortedIds[j]}`);
            }
        }
    }
    return {
        totalEpisodes: episodes.length,
        totalDuration,
        averageDuration: totalDuration / episodes.length,
        uniqueEntityPairs: pairs.size,
        averageConfidence: avgConfidence,
    };
}
