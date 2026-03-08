"use strict";
/**
 * Trajectory Query Implementation
 *
 * Reconstructs movement trajectories for entities from point observations.
 * Supports simplification, speed/heading calculation, and segmentation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTrajectoryQuery = executeTrajectoryQuery;
exports.getTrajectorySegments = getTrajectorySegments;
exports.compareTrajectories = compareTrajectories;
const uuid_1 = require("uuid");
const geo_js_1 = require("../utils/geo.js");
const time_js_1 = require("../utils/time.js");
const DEFAULT_CONFIG = {
    maxGapMs: 300000, // 5 minutes
    minPoints: 2,
    maxSpeedMs: 100, // ~360 km/h
    interpolate: false,
    interpolationIntervalMs: 60000, // 1 minute
};
/**
 * Execute a trajectory query
 */
function executeTrajectoryQuery(index, query, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Get all entries for entity in time range
    let entries = index.getEntityTimeline(query.entityId, query.timeRange);
    // Filter by policy context
    entries = filterByPolicy(entries, query.context);
    if (entries.length < cfg.minPoints) {
        return null;
    }
    // Convert to trajectory points
    let points = entriesToPoints(entries, query.includeSpeed, query.includeHeading);
    // Filter out speed outliers
    points = filterSpeedOutliers(points, cfg.maxSpeedMs);
    if (points.length < cfg.minPoints) {
        return null;
    }
    // Simplify if tolerance specified
    if (query.simplifyTolerance !== undefined && query.simplifyTolerance > 0) {
        const simplified = simplifyTrajectory(points, query.simplifyTolerance);
        points = simplified;
    }
    // Calculate trajectory statistics
    const stats = calculateTrajectoryStats(points);
    // Build trajectory
    const trajectory = {
        id: (0, uuid_1.v4)(),
        entityId: query.entityId,
        points,
        startTime: points[0].timestamp,
        endTime: points[points.length - 1].timestamp,
        totalDistance: stats.totalDistance,
        averageSpeed: stats.averageSpeed,
        maxSpeed: stats.maxSpeed,
        boundingBox: stats.boundingBox,
        attributes: {},
        tenantId: query.context.tenantId,
        policyLabels: query.context.policyLabels,
        provenance: {
            source: 'spacetime-service',
            chain: [],
            confidence: stats.confidence,
        },
        createdAt: Date.now(),
    };
    return trajectory;
}
/**
 * Get multiple trajectory segments (split by gaps)
 */
function getTrajectorySegments(index, query, config = {}) {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    // Get all entries for entity in time range
    let entries = index.getEntityTimeline(query.entityId, query.timeRange);
    // Filter by policy context
    entries = filterByPolicy(entries, query.context);
    if (entries.length < cfg.minPoints) {
        return [];
    }
    // Split into sequences based on time gaps
    const sequences = (0, time_js_1.findSequences)(entries, cfg.maxGapMs);
    const trajectories = [];
    for (const sequence of sequences) {
        if (sequence.length < cfg.minPoints) {
            continue;
        }
        // Convert to points
        let points = entriesToPoints(sequence, query.includeSpeed, query.includeHeading);
        // Filter outliers
        points = filterSpeedOutliers(points, cfg.maxSpeedMs);
        if (points.length < cfg.minPoints) {
            continue;
        }
        // Simplify if requested
        if (query.simplifyTolerance !== undefined && query.simplifyTolerance > 0) {
            points = simplifyTrajectory(points, query.simplifyTolerance);
        }
        const stats = calculateTrajectoryStats(points);
        trajectories.push({
            id: (0, uuid_1.v4)(),
            entityId: query.entityId,
            points,
            startTime: points[0].timestamp,
            endTime: points[points.length - 1].timestamp,
            totalDistance: stats.totalDistance,
            averageSpeed: stats.averageSpeed,
            maxSpeed: stats.maxSpeed,
            boundingBox: stats.boundingBox,
            attributes: { segmentIndex: trajectories.length },
            tenantId: query.context.tenantId,
            policyLabels: query.context.policyLabels,
            provenance: {
                source: 'spacetime-service',
                chain: [],
                confidence: stats.confidence,
            },
            createdAt: Date.now(),
        });
    }
    return trajectories;
}
/**
 * Compare two trajectories for similarity
 */
function compareTrajectories(a, b) {
    // Calculate temporal overlap
    const overlapStart = Math.max(a.startTime, b.startTime);
    const overlapEnd = Math.min(a.endTime, b.endTime);
    const overlapDuration = Math.max(0, overlapEnd - overlapStart);
    const maxDuration = Math.max(a.endTime - a.startTime, b.endTime - b.startTime);
    const temporalOverlap = maxDuration > 0 ? overlapDuration / maxDuration : 0;
    if (temporalOverlap === 0) {
        return { spatialSimilarity: 0, temporalOverlap: 0, averageDistance: Infinity };
    }
    // Calculate spatial similarity using Frechet-like distance
    // Sample points from both trajectories at matching times
    const sampleTimes = [];
    const sampleInterval = overlapDuration / 10;
    for (let t = overlapStart; t <= overlapEnd; t += sampleInterval) {
        sampleTimes.push(t);
    }
    let totalDistance = 0;
    let validSamples = 0;
    for (const t of sampleTimes) {
        const pointA = interpolatePoint(a.points, t);
        const pointB = interpolatePoint(b.points, t);
        if (pointA && pointB) {
            totalDistance += (0, geo_js_1.haversineDistance)(pointA.coordinate, pointB.coordinate);
            validSamples++;
        }
    }
    const averageDistance = validSamples > 0 ? totalDistance / validSamples : Infinity;
    // Convert to similarity score (exponential decay)
    const spatialSimilarity = Math.exp(-averageDistance / 1000); // 1km scale
    return { spatialSimilarity, temporalOverlap, averageDistance };
}
/**
 * Convert spacetime entries to trajectory points
 */
function entriesToPoints(entries, includeSpeed, includeHeading) {
    const points = [];
    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const point = {
            coordinate: entry.coordinate,
            timestamp: entry.start,
            attributes: { ...entry.attributes },
        };
        if (includeSpeed && i > 0) {
            const prev = entries[i - 1];
            const distance = (0, geo_js_1.haversineDistance)(prev.coordinate, entry.coordinate);
            const timeDelta = (entry.start - prev.start) / 1000;
            if (timeDelta > 0) {
                point.speed = distance / timeDelta;
            }
        }
        if (includeHeading && i > 0) {
            const prev = entries[i - 1];
            point.heading = (0, geo_js_1.calculateBearing)(prev.coordinate, entry.coordinate);
        }
        points.push(point);
    }
    return points;
}
/**
 * Filter points with unrealistic speeds
 */
function filterSpeedOutliers(points, maxSpeed) {
    if (points.length <= 1) {
        return points;
    }
    const filtered = [points[0]];
    for (let i = 1; i < points.length; i++) {
        const prev = filtered[filtered.length - 1];
        const curr = points[i];
        const distance = (0, geo_js_1.haversineDistance)(prev.coordinate, curr.coordinate);
        const timeDelta = (curr.timestamp - prev.timestamp) / 1000;
        if (timeDelta > 0) {
            const speed = distance / timeDelta;
            if (speed <= maxSpeed) {
                filtered.push(curr);
            }
        }
        else if (timeDelta === 0 && distance === 0) {
            // Duplicate point, keep it
            filtered.push(curr);
        }
    }
    return filtered;
}
/**
 * Simplify trajectory using Douglas-Peucker algorithm
 */
function simplifyTrajectory(points, tolerance) {
    if (points.length <= 2) {
        return points;
    }
    const coordinates = points.map((p) => p.coordinate);
    const simplified = (0, geo_js_1.simplifyPath)(coordinates, tolerance);
    // Map back to trajectory points
    const result = [];
    let coordIndex = 0;
    for (const point of points) {
        if (coordIndex < simplified.length) {
            const simplifiedCoord = simplified[coordIndex];
            if (point.coordinate.latitude === simplifiedCoord.latitude &&
                point.coordinate.longitude === simplifiedCoord.longitude) {
                result.push(point);
                coordIndex++;
            }
        }
    }
    return result;
}
/**
 * Calculate trajectory statistics
 */
function calculateTrajectoryStats(points) {
    if (points.length === 0) {
        return {
            totalDistance: 0,
            averageSpeed: 0,
            maxSpeed: 0,
            boundingBox: { minLat: 0, maxLat: 0, minLon: 0, maxLon: 0 },
            confidence: 0,
        };
    }
    const coordinates = points.map((p) => p.coordinate);
    const totalDistance = (0, geo_js_1.calculatePathDistance)(coordinates);
    const duration = (points[points.length - 1].timestamp - points[0].timestamp) / 1000;
    const averageSpeed = duration > 0 ? totalDistance / duration : 0;
    let maxSpeed = 0;
    for (const point of points) {
        if (point.speed !== undefined && point.speed > maxSpeed) {
            maxSpeed = point.speed;
        }
    }
    const boundingBox = (0, geo_js_1.calculateBoundingBox)(coordinates);
    // Confidence based on point density and consistency
    const avgPointInterval = duration / (points.length - 1);
    const intervalConsistency = Math.min(1, 60 / avgPointInterval); // Prefer ~1 point/min
    const pointDensity = Math.min(1, points.length / 10); // 10+ points = full score
    const confidence = 0.5 * intervalConsistency + 0.5 * pointDensity;
    return {
        totalDistance,
        averageSpeed,
        maxSpeed,
        boundingBox,
        confidence,
    };
}
/**
 * Interpolate a point at a specific timestamp
 */
function interpolatePoint(points, timestamp) {
    if (points.length === 0) {
        return null;
    }
    // Find surrounding points
    let before = null;
    let after = null;
    for (const point of points) {
        if (point.timestamp <= timestamp) {
            before = point;
        }
        if (point.timestamp >= timestamp && !after) {
            after = point;
            break;
        }
    }
    if (!before && !after) {
        return null;
    }
    if (!before) {
        return after;
    }
    if (!after) {
        return before;
    }
    if (before.timestamp === after.timestamp) {
        return before;
    }
    // Linear interpolation
    const ratio = (timestamp - before.timestamp) / (after.timestamp - before.timestamp);
    return {
        coordinate: {
            latitude: before.coordinate.latitude +
                (after.coordinate.latitude - before.coordinate.latitude) * ratio,
            longitude: before.coordinate.longitude +
                (after.coordinate.longitude - before.coordinate.longitude) * ratio,
            elevation: before.coordinate.elevation !== undefined &&
                after.coordinate.elevation !== undefined
                ? before.coordinate.elevation +
                    (after.coordinate.elevation - before.coordinate.elevation) * ratio
                : undefined,
        },
        timestamp,
        attributes: {},
    };
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
