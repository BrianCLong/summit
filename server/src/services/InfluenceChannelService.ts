import { EventEmitter } from 'events';
import logger from '../utils/logger';

export interface ChannelProfile {
  reach: number; // e.g., active user count or potential audience size
  velocity: number; // e.g., posts per minute
  susceptibility: number; // 0-1 score indicating vulnerability to manipulation
  lastUpdated: Date;
}

export interface InfluenceChannel {
  id: string;
  name: string;
  platform: 'FORUM' | 'MESSAGING' | 'VIDEO' | 'SOCIAL' | 'OTHER';
  url?: string;
  profile: ChannelProfile;
  status: 'ACTIVE' | 'MONITORING' | 'FLAGGED';
}

export interface ActivityMetric {
  channelId: string;
  timestamp: Date;
  postCount: number;
  engagementCount: number;
  sentimentScore?: number;
}

export interface AnomalyEvent {
  channelId: string;
  type: 'VELOCITY_SPIKE' | 'SENTIMENT_SHIFT' | 'SUSCEPTIBILITY_RISE';
  severity: number;
  timestamp: Date;
  details: string;
}

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
export class InfluenceChannelService extends EventEmitter {
  private channels: Map<string, InfluenceChannel> = new Map();
  private activityHistory: Map<string, ActivityMetric[]> = new Map();
  private readonly ANOMALY_THRESHOLD = 3.0; // Z-score threshold

  constructor() {
    super();
  }

  /**
   * Catalogs a new influence channel or updates an existing one.
   */
  public async catalogChannel(
    id: string,
    name: string,
    platform: InfluenceChannel['platform'],
    initialProfile?: Partial<ChannelProfile>,
    url?: string
  ): Promise<InfluenceChannel> {
    const existing = this.channels.get(id);

    const profile: ChannelProfile = {
      reach: initialProfile?.reach ?? existing?.profile.reach ?? 0,
      velocity: initialProfile?.velocity ?? existing?.profile.velocity ?? 0,
      susceptibility: initialProfile?.susceptibility ?? existing?.profile.susceptibility ?? 0.5,
      lastUpdated: new Date(),
    };

    const channel: InfluenceChannel = {
      id,
      name,
      platform,
      url,
      profile,
      status: existing?.status ?? 'ACTIVE',
    };

    this.channels.set(id, channel);
    logger.info(`Cataloged influence channel: ${name} (${id})`);
    return channel;
  }

  /**
   * Retrieves a channel by ID.
   */
  public async getChannel(id: string): Promise<InfluenceChannel | undefined> {
    return this.channels.get(id);
  }

  /**
   * Updates the metadata profile of a channel.
   */
  public async updateChannelProfile(
    channelId: string,
    updates: Partial<ChannelProfile>
  ): Promise<InfluenceChannel> {
    const channel = this.channels.get(channelId);
    if (!channel) {
      throw new Error(`Channel with ID ${channelId} not found.`);
    }

    const updatedProfile: ChannelProfile = {
      ...channel.profile,
      ...updates,
      lastUpdated: new Date(),
    };

    channel.profile = updatedProfile;
    this.channels.set(channelId, channel);
    logger.info(`Updated profile for channel: ${channelId}`);
    return channel;
  }

  /**
   * Records activity metrics and checks for anomalies.
   * This mimics "real-time" monitoring ingestion.
   */
  public async monitorActivity(metric: ActivityMetric): Promise<void> {
    if (!this.channels.has(metric.channelId)) {
       throw new Error(`Cannot monitor unknown channel: ${metric.channelId}`);
    }

    // Store metric
    if (!this.activityHistory.has(metric.channelId)) {
      this.activityHistory.set(metric.channelId, []);
    }
    const history = this.activityHistory.get(metric.channelId)!;
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
  private async updateVelocityFromMetrics(channelId: string, history: ActivityMetric[]) {
    // Simple implementation: average posts per minute over the last window
    // Assuming metrics come in at regular intervals or we calculate rate
    // For this prototype, let's just use the latest metric's post count if it represents a rate,
    // or calculate an average of the last few entries.

    const windowSize = 5;
    const recent = history.slice(-windowSize);
    if (recent.length === 0) return;

    const avgPosts = recent.reduce((sum, m) => sum + m.postCount, 0) / recent.length;

    await this.updateChannelProfile(channelId, { velocity: avgPosts });
  }

  /**
   * Scans history for anomalous activity spikes using Z-score.
   */
  private async scanForAnomalies(channelId: string): Promise<void> {
    const history = this.activityHistory.get(channelId);
    if (!history || history.length < 10) return; // Need baseline

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
  private detectZScoreAnomaly(baselineData: number[], value: number): boolean {
    if (baselineData.length === 0) return false;

    const mean = baselineData.reduce((a, b) => a + b, 0) / baselineData.length;
    const std = Math.sqrt(
      baselineData.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / baselineData.length
    );

    if (std === 0) return value !== mean; // If no variance, any difference is technically an anomaly, but careful with noise.

    const zScore = (value - mean) / std;
    return Math.abs(zScore) > this.ANOMALY_THRESHOLD;
  }

  private emitAnomaly(channelId: string, type: AnomalyEvent['type'], value: number, timestamp: Date) {
    const anomaly: AnomalyEvent = {
      channelId,
      type,
      severity: 1, // Simplified severity
      timestamp,
      details: `Detected anomaly with value ${value}`,
    };

    logger.warn(`Anomaly detected on channel ${channelId}: ${type}`);
    this.emit('anomaly', anomaly);
  }

  // Method to manually clear data (useful for testing)
  public _resetForTesting() {
      this.channels.clear();
      this.activityHistory.clear();
  }
}
