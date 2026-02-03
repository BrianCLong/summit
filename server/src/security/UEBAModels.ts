import Redis from 'ioredis';
import logger from '../utils/logger.js';

export interface BehavioralProfile {
    entityId: string;
    entityType: 'user' | 'agent' | 'tenant';
    lastActive: string;
    actionCounts: Record<string, number>;
    hourlyDistribution: number[]; // 24-hour buckets
    geographicRegions: string[];
    typicalResources: string[];
    riskScore: number;
}

export interface ActivityEvent {
    entityId: string;
    entityType: 'user' | 'agent' | 'tenant';
    action: string;
    resource?: string;
    region?: string;
    timestamp: string;
    metadata?: any;
}

export class UEBAModels {
    private redis: Redis;

    constructor(redis?: Redis) {
        this.redis = redis || new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    }

    async updateProfile(event: ActivityEvent): Promise<BehavioralProfile> {
        const key = `ueba:profile:${event.entityType}:${event.entityId}`;
        const raw = await this.redis.get(key);
        let profile: BehavioralProfile;

        if (raw) {
            profile = JSON.parse(raw);
        } else {
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
            if (profile.typicalResources.length > 50) profile.typicalResources.shift();
        }

        profile.lastActive = event.timestamp;

        await this.redis.set(key, JSON.stringify(profile));
        return profile;
    }

    async analyzeAnomaly(event: ActivityEvent): Promise<{ isAnomaly: boolean; score: number; reasons: string[] }> {
        const key = `ueba:profile:${event.entityType}:${event.entityId}`;
        const raw = await this.redis.get(key);
        if (!raw) return { isAnomaly: false, score: 0, reasons: [] };

        const profile: BehavioralProfile = JSON.parse(raw);
        const reasons: string[] = [];
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
