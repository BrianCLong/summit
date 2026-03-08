"use strict";
/**
 * Geo-Temporal Analytics Service
 *
 * High-level service combining repository access with analytics algorithms.
 * Provides business logic layer for trajectory, stay-point, co-presence,
 * and convoy detection.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoTemporalService = void 0;
const geotemporal_algorithms_js_1 = require("../analytics/geotemporal-algorithms.js");
/**
 * Geo-temporal analytics service
 */
class GeoTemporalService {
    repository;
    constructor(repository) {
        this.repository = repository;
    }
    /**
     * Get trajectory for a single entity
     *
     * @param entityId - Entity identifier
     * @param timeRange - Optional time range filter
     * @returns Sorted trajectory points
     */
    async getTrajectory(entityId, timeRange) {
        const observations = await this.repository.getObservationsForEntity(entityId, timeRange);
        return (0, geotemporal_algorithms_js_1.buildTrajectory)(observations);
    }
    /**
     * Get trajectory analysis with computed metrics
     *
     * @param entityId - Entity identifier
     * @param timeRange - Optional time range filter
     * @returns Trajectory with distance and speed metrics
     */
    async getTrajectoryAnalysis(entityId, timeRange) {
        const trajectory = await this.getTrajectory(entityId, timeRange);
        if (trajectory.length === 0) {
            throw new Error(`No trajectory data found for entity ${entityId}`);
        }
        const totalDistanceMeters = (0, geotemporal_algorithms_js_1.calculateTrajectoryDistance)(trajectory);
        const averageSpeedMetersPerSecond = (0, geotemporal_algorithms_js_1.calculateAverageSpeed)(trajectory);
        const startTime = trajectory[0].startTime;
        const endTime = trajectory[trajectory.length - 1].endTime;
        const durationMinutes = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60);
        return {
            entityId,
            points: trajectory,
            totalDistanceMeters,
            totalDurationMinutes: durationMinutes,
            averageSpeedMetersPerSecond,
            startTime,
            endTime,
        };
    }
    /**
     * Detect stay points for an entity
     *
     * @param entityId - Entity identifier
     * @param timeRange - Time range filter
     * @param params - Stay-point detection parameters
     * @returns Detected stay points
     */
    async getStayPoints(entityId, timeRange, params) {
        const trajectory = await this.getTrajectory(entityId, timeRange);
        return (0, geotemporal_algorithms_js_1.detectStayPoints)(trajectory, params);
    }
    /**
     * Detect co-presence intervals between entities
     *
     * @param entityIds - Array of entity identifiers
     * @param timeRange - Time range filter
     * @param params - Co-presence detection parameters
     * @returns Detected co-presence intervals
     */
    async getCoPresence(entityIds, timeRange, params) {
        this.validateTimeRange(timeRange);
        this.validateEntityLimit(entityIds, 100);
        const observations = await this.repository.getObservationsForEntities(entityIds, timeRange);
        return (0, geotemporal_algorithms_js_1.detectCoPresence)(observations, params);
    }
    /**
     * Detect convoys (groups moving together)
     *
     * @param entityIds - Array of entity identifiers (empty = all entities in timeRange)
     * @param timeRange - Time range filter
     * @param params - Convoy detection parameters
     * @returns Detected convoys
     */
    async getConvoys(entityIds, timeRange, params) {
        this.validateTimeRange(timeRange);
        if (entityIds.length > 0) {
            this.validateEntityLimit(entityIds, 100);
        }
        const options = entityIds.length > 0
            ? { entityIds, timeRange }
            : {
                timeRange,
                // Query all entities within timeRange
            };
        const observations = await this.repository.queryObservations(options);
        return (0, geotemporal_algorithms_js_1.detectConvoys)(observations, params);
    }
    /**
     * Validate time range is present and reasonable
     */
    validateTimeRange(timeRange) {
        if (!timeRange.from || !timeRange.to) {
            throw new Error('Both from and to times are required for time range');
        }
        const fromTime = new Date(timeRange.from).getTime();
        const toTime = new Date(timeRange.to).getTime();
        if (fromTime >= toTime) {
            throw new Error('Invalid time range: from must be before to');
        }
        // Max 1 year window (configurable)
        const maxWindowMs = 365 * 24 * 60 * 60 * 1000; // 1 year
        if (toTime - fromTime > maxWindowMs) {
            throw new Error('Time range exceeds maximum allowed window of 1 year');
        }
    }
    /**
     * Validate number of entities is within limits
     */
    validateEntityLimit(entityIds, maxEntities) {
        if (entityIds.length > maxEntities) {
            throw new Error(`Number of entities (${entityIds.length}) exceeds limit of ${maxEntities}`);
        }
    }
}
exports.GeoTemporalService = GeoTemporalService;
