"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InfluenceChannelService = void 0;
const events_1 = require("events");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
/**
 * Influence Channel Profiling Service
 *
 * Sprint 21:
 * - Catalogs main channels used for influence.
 * - Builds metadata profiles (reach, velocity, susceptibility).
 * - Automates monitoring for anomalous activity spikes.
 *
 * Note: This service currently uses in-memory storage for prototyping purposes.
 * Production implementation would require database schema updates for
 * `InfluenceChannel`, `ChannelProfile`, and `ActivityMetric`.
 */
class InfluenceChannelService extends events_1.EventEmitter {
    channels = new Map();
    activityHistory = new Map();
    ANOMALY_THRESHOLD = 3.0; // Z-score threshold
    constructor() {
        super();
    }
    /**
     * Catalogs a new influence channel or updates an existing one.
     */
    async catalogChannel(id, name, platform, initialProfile, url) {
        const existing = this.channels.get(id);
        const profile = {
            reach: initialProfile?.reach ?? existing?.profile.reach ?? 0,
            velocity: initialProfile?.velocity ?? existing?.profile.velocity ?? 0,
            susceptibility: initialProfile?.susceptibility ?? existing?.profile.susceptibility ?? 0.5,
            lastUpdated: new Date(),
        };
        const channel = {
            id,
            name,
            platform,
            url,
            profile,
            status: existing?.status ?? 'ACTIVE',
        };
        this.channels.set(id, channel);
        logger_js_1.default.info(`Cataloged influence channel: ${name} (${id})`);
        return channel;
    }
    /**
     * Retrieves a channel by ID.
     */
    async getChannel(id) {
        return this.channels.get(id);
    }
    /**
     * Updates the metadata profile of a channel.
     */
    async updateChannelProfile(channelId, updates) {
        const channel = this.channels.get(channelId);
        if (!channel) {
            throw new Error(`Channel with ID ${channelId} not found.`);
        }
        const updatedProfile = {
            ...channel.profile,
            ...updates,
            lastUpdated: new Date(),
        };
        channel.profile = updatedProfile;
        this.channels.set(channelId, channel);
        logger_js_1.default.info(`Updated profile for channel: ${channelId}`);
        return channel;
    }
    /**
     * Records activity metrics and checks for anomalies.
     * This mimics "real-time" monitoring ingestion.
     */
    async monitorActivity(metric) {
        if (!this.channels.has(metric.channelId)) {
            throw new Error(`Cannot monitor unknown channel: ${metric.channelId}`);
        }
        // Store metric
        if (!this.activityHistory.has(metric.channelId)) {
            this.activityHistory.set(metric.channelId, []);
        }
        const history = this.activityHistory.get(metric.channelId);
        history.push(metric);
        // Prune history (keep last 1000 points for prototype)
        if (history.length > 1000) {
            history.shift();
        }
        // Check for anomalies
        await this.scanForAnomalies(metric.channelId);
        // Update velocity in profile
        await this.updateVelocityFromMetrics(metric.channelId, history);
    }
    /**
     * Internal method to update velocity based on recent metrics.
     */
    async updateVelocityFromMetrics(channelId, history) {
        // Simple implementation: average posts per minute over the last window
        // Assuming metrics come in at regular intervals or we calculate rate
        // For this prototype, let's just use the latest metric's post count if it represents a rate,
        // or calculate an average of the last few entries.
        const windowSize = 5;
        const recent = history.slice(-windowSize);
        if (recent.length === 0)
            return;
        const avgPosts = recent.reduce((sum, m) => sum + m.postCount, 0) / recent.length;
        await this.updateChannelProfile(channelId, { velocity: avgPosts });
    }
    /**
     * Scans history for anomalous activity spikes using Z-score.
     */
    async scanForAnomalies(channelId) {
        const history = this.activityHistory.get(channelId);
        if (!history || history.length < 10)
            return; // Need baseline
        const latest = history[history.length - 1];
        // Check Velocity (Post Count) Anomaly
        const postCounts = history.slice(0, -1).map(h => h.postCount); // Exclude latest for baseline
        if (this.detectZScoreAnomaly(postCounts, latest.postCount)) {
            this.emitAnomaly(channelId, 'VELOCITY_SPIKE', latest.postCount, latest.timestamp);
        }
        // Check Engagement Anomaly
        const engagementCounts = history.slice(0, -1).map(h => h.engagementCount);
        if (this.detectZScoreAnomaly(engagementCounts, latest.engagementCount)) {
            // Just logging/emitting generally, could have specific types
            // Re-using VELOCITY_SPIKE for general activity spikes or adding new type
        }
    }
    /**
     * Calculates Z-score and compares against threshold.
     */
    detectZScoreAnomaly(baselineData, value) {
        if (baselineData.length === 0)
            return false;
        const mean = baselineData.reduce((a, b) => a + b, 0) / baselineData.length;
        const std = Math.sqrt(baselineData.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / baselineData.length);
        if (std === 0)
            return value !== mean; // If no variance, any difference is technically an anomaly, but careful with noise.
        const zScore = (value - mean) / std;
        return Math.abs(zScore) > this.ANOMALY_THRESHOLD;
    }
    emitAnomaly(channelId, type, value, timestamp) {
        const anomaly = {
            channelId,
            type,
            severity: 1, // Simplified severity
            timestamp,
            details: `Detected anomaly with value ${value}`,
        };
        logger_js_1.default.warn(`Anomaly detected on channel ${channelId}: ${type}`);
        this.emit('anomaly', anomaly);
    }
    // Method to manually clear data (useful for testing)
    _resetForTesting() {
        this.channels.clear();
        this.activityHistory.clear();
    }
}
exports.InfluenceChannelService = InfluenceChannelService;
