"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UEBAModels = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class UEBAModels {
    redis;
    constructor(redis) {
        this.redis = redis || new ioredis_1.default(process.env.REDIS_URL || 'redis://localhost:6379');
    }
    async updateProfile(event) {
        const key = `ueba:profile:${event.entityType}:${event.entityId}`;
        const raw = await this.redis.get(key);
        let profile;
        if (raw) {
            profile = JSON.parse(raw);
        }
        else {
            profile = {
                entityId: event.entityId,
                entityType: event.entityType,
                lastActive: event.timestamp,
                actionCounts: {},
                hourlyDistribution: new Array(24).fill(0),
                geographicRegions: [],
                typicalResources: [],
                riskScore: 0
            };
        }
        // Update counts
        profile.actionCounts[event.action] = (profile.actionCounts[event.action] || 0) + 1;
        // Update hourly distribution
        const hour = new Date(event.timestamp).getHours();
        profile.hourlyDistribution[hour]++;
        // Update regions
        if (event.region && !profile.geographicRegions.includes(event.region)) {
            profile.geographicRegions.push(event.region);
        }
        // Update resources (limited to top 50 for performance)
        if (event.resource && !profile.typicalResources.includes(event.resource)) {
            profile.typicalResources.push(event.resource);
            if (profile.typicalResources.length > 50)
                profile.typicalResources.shift();
        }
        profile.lastActive = event.timestamp;
        await this.redis.set(key, JSON.stringify(profile));
        return profile;
    }
    async analyzeAnomaly(event) {
        const key = `ueba:profile:${event.entityType}:${event.entityId}`;
        const raw = await this.redis.get(key);
        if (!raw)
            return { isAnomaly: false, score: 0, reasons: [] };
        const profile = JSON.parse(raw);
        const reasons = [];
        let score = 0;
        // 1. Hourly Anomaly (e.g., activity at 3 AM when 90% of activity is 9-5)
        const hour = new Date(event.timestamp).getHours();
        const totalActivity = profile.hourlyDistribution.reduce((a, b) => a + b, 0);
        if (totalActivity > 50) {
            const hourFrequency = profile.hourlyDistribution[hour] / totalActivity;
            if (hourFrequency < 0.01) {
                score += 30;
                reasons.push(`Atypical activity hour: ${hour}`);
            }
        }
        // 2. Resource Anomaly
        if (event.resource && !profile.typicalResources.includes(event.resource)) {
            score += 20;
            reasons.push(`Atypical resource access: ${event.resource}`);
        }
        // 3. Geographic Anomaly
        if (event.region && !profile.geographicRegions.includes(event.region)) {
            score += 40;
            reasons.push(`Atypical geographic region: ${event.region}`);
        }
        // 4. Action Velocity Anomaly (simple check)
        const recentActionCount = profile.actionCounts[event.action] || 0;
        if (recentActionCount > 1000) { // Threshold for suspicious high-volume action
            score += 15;
            reasons.push(`High action velocity: ${event.action}`);
        }
        return {
            isAnomaly: score > 60,
            score,
            reasons
        };
    }
}
exports.UEBAModels = UEBAModels;
