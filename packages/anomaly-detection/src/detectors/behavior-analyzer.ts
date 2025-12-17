/**
 * User and Entity Behavior Analytics (UBA/EBA)
 */

import { IBehaviorAnalyzer } from '@intelgraph/threat-detection-core';
import { AnomalyScore, BehaviorProfile } from '@intelgraph/threat-detection-core';
import { calculateZScore, ensembleAnomalyScore } from '@intelgraph/threat-detection-core';
import Redis from 'ioredis';

export interface BehaviorAnalyzerConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  learningPeriodDays: number; // Days to learn baseline behavior
  minSamplesForBaseline: number; // Minimum samples before detection
  adaptiveThresholds: boolean; // Adjust thresholds based on behavior
  contextualAnalysis: boolean; // Consider time of day, day of week, etc.
}

export class BehaviorAnalyzer implements IBehaviorAnalyzer {
  private redis: Redis;
  private config: BehaviorAnalyzerConfig;
  private readonly PROFILE_PREFIX = 'behavior:profile:';
  private readonly ACTIVITY_PREFIX = 'behavior:activity:';

  constructor(config: BehaviorAnalyzerConfig) {
    this.config = config;
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db || 0
    });
  }

  async analyzeBehavior(entityId: string, event: any): Promise<AnomalyScore> {
    // Get or create profile
    const profile = await this.getProfile(entityId);

    if (!profile) {
      // Create new profile
      await this.createProfile(entityId, event);
      return {
        score: 0,
        method: 'behavioral',
        features: {},
        explanation: 'Learning phase: establishing baseline behavior'
      };
    }

    // Check if still in learning phase
    const isLearning = await this.isLearningPhase(entityId);
    if (isLearning) {
      await this.updateProfile(entityId, event);
      return {
        score: 0,
        method: 'behavioral',
        features: {},
        explanation: 'Learning phase: collecting behavior data'
      };
    }

    // Analyze behavior against baseline
    const anomalyScores = await this.detectBehavioralAnomalies(profile, event);

    // Update profile with new behavior
    await this.updateProfile(entityId, event);

    return anomalyScores;
  }

  async getProfile(entityId: string): Promise<BehaviorProfile | null> {
    const key = `${this.PROFILE_PREFIX}${entityId}`;
    const profileData = await this.redis.get(key);

    if (!profileData) {
      return null;
    }

    const profile = JSON.parse(profileData);

    // Convert date strings back to Date objects
    profile.learningStartDate = new Date(profile.learningStartDate);
    profile.lastUpdated = new Date(profile.lastUpdated);

    return profile;
  }

  async updateProfile(entityId: string, event: any): Promise<void> {
    const profile = await this.getProfile(entityId);
    if (!profile) return;

    // Extract behavioral metrics from event
    const metrics = this.extractMetrics(event);

    // Update baseline metrics using exponential moving average
    const alpha = 0.1; // Smoothing factor

    if (metrics.requestRate !== undefined) {
      profile.baselineMetrics.avgRequestsPerHour =
        profile.baselineMetrics.avgRequestsPerHour * (1 - alpha) +
        metrics.requestRate * alpha;
    }

    if (metrics.dataTransferred !== undefined) {
      profile.baselineMetrics.avgDataTransferred =
        profile.baselineMetrics.avgDataTransferred * (1 - alpha) +
        metrics.dataTransferred * alpha;
    }

    // Update access patterns
    if (metrics.accessPattern) {
      const patterns = new Set(profile.baselineMetrics.commonAccessPatterns);
      patterns.add(metrics.accessPattern);

      // Keep only top 50 patterns
      if (patterns.size > 50) {
        const patternArray = Array.from(patterns);
        profile.baselineMetrics.commonAccessPatterns = patternArray.slice(-50);
      } else {
        profile.baselineMetrics.commonAccessPatterns = Array.from(patterns);
      }
    }

    // Update temporal patterns
    const hour = new Date(event.timestamp).getHours();
    const dayOfWeek = new Date(event.timestamp).getDay();

    profile.activityPattern.hourly[hour] =
      (profile.activityPattern.hourly[hour] || 0) * (1 - alpha) + alpha;

    profile.activityPattern.daily[dayOfWeek] =
      (profile.activityPattern.daily[dayOfWeek] || 0) * (1 - alpha) + alpha;

    // Update location if available
    if (metrics.location) {
      const locations = new Set(profile.baselineMetrics.geographicLocations);
      locations.add(metrics.location);
      profile.baselineMetrics.geographicLocations = Array.from(locations);
    }

    // Update user agent if available
    if (metrics.userAgent) {
      const agents = new Set(profile.baselineMetrics.commonUserAgents || []);
      agents.add(metrics.userAgent);

      if (agents.size > 20) {
        const agentArray = Array.from(agents);
        profile.baselineMetrics.commonUserAgents = agentArray.slice(-20);
      } else {
        profile.baselineMetrics.commonUserAgents = Array.from(agents);
      }
    }

    // Update adaptive thresholds if enabled
    if (this.config.adaptiveThresholds) {
      this.updateAdaptiveThresholds(profile, metrics);
    }

    profile.lastUpdated = new Date();
    profile.sampleSize++;

    // Save updated profile
    const key = `${this.PROFILE_PREFIX}${entityId}`;
    await this.redis.set(key, JSON.stringify(profile), 'EX', 90 * 24 * 3600); // 90 days TTL
  }

  async isLearningPhase(entityId: string): Promise<boolean> {
    const profile = await this.getProfile(entityId);
    if (!profile) return true;

    const learningPeriodMs = this.config.learningPeriodDays * 24 * 3600 * 1000;
    const elapsedTime = Date.now() - profile.learningStartDate.getTime();

    return (
      elapsedTime < learningPeriodMs ||
      profile.sampleSize < this.config.minSamplesForBaseline
    );
  }

  private async createProfile(entityId: string, event: any): Promise<void> {
    const metrics = this.extractMetrics(event);

    const profile: BehaviorProfile = {
      entityId,
      entityType: event.entityType || 'user',
      baselineMetrics: {
        avgRequestsPerHour: metrics.requestRate || 0,
        avgDataTransferred: metrics.dataTransferred || 0,
        commonAccessPatterns: metrics.accessPattern ? [metrics.accessPattern] : [],
        typicalAccessTimes: [],
        geographicLocations: metrics.location ? [metrics.location] : [],
        commonUserAgents: metrics.userAgent ? [metrics.userAgent] : [],
        commonEndpoints: metrics.endpoint ? [metrics.endpoint] : []
      },
      activityPattern: {
        hourly: new Array(24).fill(0),
        daily: new Array(7).fill(0),
        weekly: []
      },
      learningStartDate: new Date(),
      lastUpdated: new Date(),
      sampleSize: 1,
      thresholds: {
        requestRateThreshold: 100, // Initial threshold
        dataTransferThreshold: 10 * 1024 * 1024, // 10MB
        locationChangeThreshold: 3,
        anomalyScoreThreshold: 0.7
      }
    };

    const key = `${this.PROFILE_PREFIX}${entityId}`;
    await this.redis.set(key, JSON.stringify(profile), 'EX', 90 * 24 * 3600);
  }

  private async detectBehavioralAnomalies(
    profile: BehaviorProfile,
    event: any
  ): Promise<AnomalyScore> {
    const metrics = this.extractMetrics(event);
    const anomalyScores: Record<string, number> = {};
    const scores: number[] = [];

    // Request rate anomaly
    if (metrics.requestRate !== undefined) {
      const zScore = calculateZScore(
        metrics.requestRate,
        profile.baselineMetrics.avgRequestsPerHour,
        profile.baselineMetrics.avgRequestsPerHour * 0.5 // Assume 50% std dev
      );
      const requestAnomalyScore = Math.min(1, Math.abs(zScore) / 3);
      anomalyScores['requestRate'] = requestAnomalyScore;
      scores.push(requestAnomalyScore);
    }

    // Data transfer anomaly
    if (metrics.dataTransferred !== undefined) {
      const zScore = calculateZScore(
        metrics.dataTransferred,
        profile.baselineMetrics.avgDataTransferred,
        profile.baselineMetrics.avgDataTransferred * 0.5
      );
      const dataAnomalyScore = Math.min(1, Math.abs(zScore) / 3);
      anomalyScores['dataTransfer'] = dataAnomalyScore;
      scores.push(dataAnomalyScore);
    }

    // Temporal anomaly (time of day)
    if (this.config.contextualAnalysis) {
      const hour = new Date(event.timestamp).getHours();
      const typicalActivity = profile.activityPattern.hourly[hour] || 0;
      const temporalScore = typicalActivity < 0.1 ? 0.8 : 0; // High anomaly if unusual time
      anomalyScores['temporal'] = temporalScore;
      scores.push(temporalScore);
    }

    // Location anomaly
    if (metrics.location) {
      const isKnownLocation = profile.baselineMetrics.geographicLocations.includes(
        metrics.location
      );
      const locationScore = isKnownLocation ? 0 : 0.7;
      anomalyScores['location'] = locationScore;
      scores.push(locationScore);
    }

    // User agent anomaly
    if (metrics.userAgent) {
      const knownAgents = profile.baselineMetrics.commonUserAgents || [];
      const isKnownAgent = knownAgents.includes(metrics.userAgent);
      const agentScore = isKnownAgent ? 0 : 0.5;
      anomalyScores['userAgent'] = agentScore;
      scores.push(agentScore);
    }

    // Access pattern anomaly
    if (metrics.accessPattern) {
      const isKnownPattern = profile.baselineMetrics.commonAccessPatterns.includes(
        metrics.accessPattern
      );
      const patternScore = isKnownPattern ? 0 : 0.6;
      anomalyScores['accessPattern'] = patternScore;
      scores.push(patternScore);
    }

    // Combine scores
    const overallScore = ensembleAnomalyScore(scores, 'weighted', [
      0.25, // requestRate
      0.25, // dataTransfer
      0.15, // temporal
      0.20, // location
      0.10, // userAgent
      0.05  // accessPattern
    ]);

    return {
      score: overallScore,
      method: 'behavioral',
      features: anomalyScores,
      explanation: this.generateBehavioralExplanation(anomalyScores, overallScore)
    };
  }

  private extractMetrics(event: any): {
    requestRate?: number;
    dataTransferred?: number;
    accessPattern?: string;
    location?: string;
    userAgent?: string;
    endpoint?: string;
  } {
    return {
      requestRate: event.requestRate || event.requestsPerHour,
      dataTransferred: event.bytesTransferred || event.dataSize,
      accessPattern: event.endpoint || event.action,
      location: event.geoLocation || event.country || event.city,
      userAgent: event.userAgent,
      endpoint: event.endpoint || event.resource
    };
  }

  private updateAdaptiveThresholds(profile: BehaviorProfile, metrics: any): void {
    // Adjust thresholds based on observed behavior
    if (metrics.requestRate !== undefined) {
      const newThreshold = profile.baselineMetrics.avgRequestsPerHour * 3;
      profile.thresholds.requestRateThreshold = Math.max(
        profile.thresholds.requestRateThreshold * 0.9 + newThreshold * 0.1,
        50 // Minimum threshold
      );
    }

    if (metrics.dataTransferred !== undefined) {
      const newThreshold = profile.baselineMetrics.avgDataTransferred * 5;
      profile.thresholds.dataTransferThreshold = Math.max(
        profile.thresholds.dataTransferThreshold * 0.9 + newThreshold * 0.1,
        1024 * 1024 // 1MB minimum
      );
    }
  }

  private generateBehavioralExplanation(
    scores: Record<string, number>,
    overallScore: number
  ): string {
    const anomalies = Object.entries(scores)
      .filter(([_, score]) => score > 0.5)
      .sort(([_, a], [__, b]) => b - a);

    if (anomalies.length === 0) {
      return 'Behavior within normal parameters';
    }

    const descriptions = {
      requestRate: 'unusual request frequency',
      dataTransfer: 'abnormal data transfer volume',
      temporal: 'access at unusual time',
      location: 'new geographic location',
      userAgent: 'unknown user agent/device',
      accessPattern: 'unusual access pattern'
    };

    const anomalyList = anomalies
      .map(([key, score]) => descriptions[key as keyof typeof descriptions] || key)
      .join(', ');

    return `Behavioral anomalies detected: ${anomalyList}`;
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}
