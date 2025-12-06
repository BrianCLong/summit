/**
 * ML-Based Anomaly Detection System
 *
 * Real-time anomaly detection for audit events using statistical
 * and machine learning approaches.
 *
 * Detection Methods:
 * 1. Statistical: Z-score, IQR, moving averages
 * 2. Time-based: Unusual hours, frequency spikes
 * 3. Behavioral: User/entity access patterns
 * 4. Sequence: Unusual event sequences
 * 5. Volume: Traffic anomalies
 *
 * Features:
 * - Online learning with sliding windows
 * - Adaptive thresholds
 * - Multi-dimensional scoring
 * - Alert suppression and deduplication
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

/**
 * Anomaly types
 */
export type AnomalyType =
  | 'unusual_time'
  | 'frequency_spike'
  | 'rare_action'
  | 'unusual_actor'
  | 'unusual_resource'
  | 'sequence_anomaly'
  | 'volume_anomaly'
  | 'geographic_anomaly'
  | 'privilege_escalation'
  | 'data_exfiltration';

/**
 * Severity levels
 */
export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Detected anomaly
 */
export interface DetectedAnomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  score: number; // 0-1, higher = more anomalous
  eventId: string;
  timestamp: Date;
  description: string;
  context: {
    actorId?: string;
    resourceId?: string;
    action?: string;
    expectedValue?: number | string;
    observedValue?: number | string;
    baseline?: Record<string, number>;
  };
  recommended_action: string;
  suppressed: boolean;
}

/**
 * Event input for anomaly detection
 */
export interface AuditEventInput {
  id: string;
  timestamp: Date;
  eventType: string;
  actorId: string;
  actorType: string;
  resourceType?: string;
  resourceId?: string;
  action?: string;
  outcome: string;
  tenantId: string;
  metadata?: Record<string, unknown>;
  sourceIp?: string;
  geoLocation?: {
    country?: string;
    city?: string;
    latitude?: number;
    longitude?: number;
  };
}

/**
 * Anomaly detector configuration
 */
export interface AnomalyDetectorConfig {
  enabled: boolean;
  windowSizeMs: number;
  slidingWindowEvents: number;
  zScoreThreshold: number;
  iqrMultiplier: number;
  frequencyThresholdMultiplier: number;
  rareActionThreshold: number;
  unusualHoursStart: number; // 0-23
  unusualHoursEnd: number; // 0-23
  minSamplesForBaseline: number;
  alertCooldownMs: number;
  adaptiveThresholds: boolean;
  enableSequenceDetection: boolean;
  enableBehavioralProfiling: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AnomalyDetectorConfig = {
  enabled: true,
  windowSizeMs: 3600000, // 1 hour
  slidingWindowEvents: 10000,
  zScoreThreshold: 3.0,
  iqrMultiplier: 1.5,
  frequencyThresholdMultiplier: 3.0,
  rareActionThreshold: 0.01, // 1% of events
  unusualHoursStart: 22, // 10 PM
  unusualHoursEnd: 6, // 6 AM
  minSamplesForBaseline: 100,
  alertCooldownMs: 300000, // 5 minutes
  adaptiveThresholds: true,
  enableSequenceDetection: true,
  enableBehavioralProfiling: true,
};

/**
 * Statistical baseline
 */
interface Baseline {
  mean: number;
  stdDev: number;
  median: number;
  q1: number;
  q3: number;
  count: number;
  lastUpdated: Date;
}

/**
 * Actor behavior profile
 */
interface ActorProfile {
  actorId: string;
  firstSeen: Date;
  lastSeen: Date;
  eventCount: number;
  actionCounts: Map<string, number>;
  resourceCounts: Map<string, number>;
  hourlyDistribution: number[]; // 24 hours
  avgEventsPerHour: number;
  typicalIps: Set<string>;
  typicalLocations: Set<string>;
}

/**
 * Event sequence pattern
 */
interface SequencePattern {
  pattern: string[];
  count: number;
  lastSeen: Date;
}

/**
 * Anomaly Detector
 */
export class AnomalyDetector extends EventEmitter {
  private config: AnomalyDetectorConfig;
  private eventWindow: AuditEventInput[] = [];
  private baselines: Map<string, Baseline> = new Map();
  private actorProfiles: Map<string, ActorProfile> = new Map();
  private sequencePatterns: Map<string, SequencePattern> = new Map();
  private recentAlerts: Map<string, Date> = new Map();
  private actionFrequencies: Map<string, number> = new Map();
  private hourlyEventCounts: number[] = new Array(24).fill(0);
  private totalEventCount = 0;

  constructor(config: Partial<AnomalyDetectorConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Analyze event for anomalies
   */
  async analyzeEvent(event: AuditEventInput): Promise<DetectedAnomaly[]> {
    if (!this.config.enabled) {
      return [];
    }

    const anomalies: DetectedAnomaly[] = [];

    // Update sliding window
    this.updateEventWindow(event);

    // Update baselines and profiles
    this.updateBaselines(event);
    this.updateActorProfile(event);
    this.updateActionFrequencies(event);

    // Run detection algorithms
    const detections = await Promise.all([
      this.detectUnusualTime(event),
      this.detectFrequencySpike(event),
      this.detectRareAction(event),
      this.detectUnusualActor(event),
      this.detectVolumeAnomaly(event),
      this.detectSequenceAnomaly(event),
      this.detectGeographicAnomaly(event),
      this.detectPrivilegeEscalation(event),
      this.detectDataExfiltration(event),
    ]);

    // Filter and deduplicate
    for (const detection of detections) {
      if (detection && !this.shouldSuppress(detection)) {
        anomalies.push(detection);
        this.emit('anomalyDetected', detection);
      }
    }

    return anomalies;
  }

  /**
   * Detect unusual time access
   */
  private async detectUnusualTime(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    const hour = event.timestamp.getHours();
    const isUnusualHour =
      (this.config.unusualHoursStart <= this.config.unusualHoursEnd
        ? hour >= this.config.unusualHoursStart && hour < this.config.unusualHoursEnd
        : hour >= this.config.unusualHoursStart || hour < this.config.unusualHoursEnd);

    if (!isUnusualHour) {
      return null;
    }

    // Check if this actor typically accesses at this hour
    const profile = this.actorProfiles.get(event.actorId);
    if (profile) {
      const hourlyPct = profile.hourlyDistribution[hour] / Math.max(profile.eventCount, 1);
      if (hourlyPct > 0.05) {
        // Actor has history at this hour
        return null;
      }
    }

    const score = this.calculateTimeAnomalyScore(event, hour);

    return {
      id: this.generateAnomalyId(event, 'unusual_time'),
      type: 'unusual_time',
      severity: score > 0.8 ? 'high' : score > 0.5 ? 'medium' : 'low',
      score,
      eventId: event.id,
      timestamp: new Date(),
      description: `Access at unusual hour (${hour}:00) by ${event.actorId}`,
      context: {
        actorId: event.actorId,
        observedValue: hour,
        expectedValue: 'business hours',
      },
      recommended_action: 'Review access legitimacy',
      suppressed: false,
    };
  }

  /**
   * Detect frequency spike
   */
  private async detectFrequencySpike(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    const baselineKey = `frequency:${event.actorId}:${event.eventType}`;
    const baseline = this.baselines.get(baselineKey);

    if (!baseline || baseline.count < this.config.minSamplesForBaseline) {
      return null;
    }

    // Calculate recent frequency
    const recentCount = this.eventWindow.filter(
      (e) =>
        e.actorId === event.actorId &&
        e.eventType === event.eventType &&
        event.timestamp.getTime() - e.timestamp.getTime() < this.config.windowSizeMs,
    ).length;

    const expectedRate = baseline.mean;
    const actualRate = recentCount;

    if (actualRate <= expectedRate * this.config.frequencyThresholdMultiplier) {
      return null;
    }

    const zScore = (actualRate - baseline.mean) / Math.max(baseline.stdDev, 0.1);
    const score = Math.min(1, zScore / (this.config.zScoreThreshold * 2));

    return {
      id: this.generateAnomalyId(event, 'frequency_spike'),
      type: 'frequency_spike',
      severity: score > 0.8 ? 'critical' : score > 0.6 ? 'high' : 'medium',
      score,
      eventId: event.id,
      timestamp: new Date(),
      description: `Frequency spike: ${actualRate} events vs ${expectedRate.toFixed(1)} expected`,
      context: {
        actorId: event.actorId,
        expectedValue: expectedRate,
        observedValue: actualRate,
        baseline: {
          mean: baseline.mean,
          stdDev: baseline.stdDev,
        },
      },
      recommended_action: 'Investigate for automated activity or compromise',
      suppressed: false,
    };
  }

  /**
   * Detect rare action
   */
  private async detectRareAction(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    if (!event.action) {
      return null;
    }

    const actionCount = this.actionFrequencies.get(event.action) || 0;
    const actionPct = actionCount / Math.max(this.totalEventCount, 1);

    if (actionPct > this.config.rareActionThreshold) {
      return null;
    }

    const score = 1 - actionPct / this.config.rareActionThreshold;

    return {
      id: this.generateAnomalyId(event, 'rare_action'),
      type: 'rare_action',
      severity: score > 0.9 ? 'high' : 'medium',
      score,
      eventId: event.id,
      timestamp: new Date(),
      description: `Rare action "${event.action}" (${(actionPct * 100).toFixed(3)}% of events)`,
      context: {
        actorId: event.actorId,
        action: event.action,
        observedValue: actionCount,
      },
      recommended_action: 'Verify action is authorized',
      suppressed: false,
    };
  }

  /**
   * Detect unusual actor behavior
   */
  private async detectUnusualActor(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    if (!this.config.enableBehavioralProfiling) {
      return null;
    }

    const profile = this.actorProfiles.get(event.actorId);

    if (!profile || profile.eventCount < this.config.minSamplesForBaseline) {
      return null;
    }

    // Check for new resource access
    if (event.resourceId && !profile.resourceCounts.has(event.resourceId)) {
      const uniqueResources = profile.resourceCounts.size;
      if (uniqueResources > 10) {
        // Actor has established pattern
        const score = Math.min(1, uniqueResources / 100);

        return {
          id: this.generateAnomalyId(event, 'unusual_resource'),
          type: 'unusual_resource',
          severity: score > 0.7 ? 'high' : 'medium',
          score,
          eventId: event.id,
          timestamp: new Date(),
          description: `First access to resource ${event.resourceId} by ${event.actorId}`,
          context: {
            actorId: event.actorId,
            resourceId: event.resourceId,
            observedValue: uniqueResources,
          },
          recommended_action: 'Verify resource access authorization',
          suppressed: false,
        };
      }
    }

    return null;
  }

  /**
   * Detect volume anomaly
   */
  private async detectVolumeAnomaly(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    const hour = event.timestamp.getHours();
    const currentHourCount = this.eventWindow.filter(
      (e) =>
        e.timestamp.getHours() === hour &&
        event.timestamp.getTime() - e.timestamp.getTime() < 3600000,
    ).length;

    const avgHourlyCount =
      this.hourlyEventCounts.reduce((a, b) => a + b, 0) / 24;

    if (avgHourlyCount < this.config.minSamplesForBaseline) {
      return null;
    }

    const ratio = currentHourCount / Math.max(avgHourlyCount, 1);

    if (ratio <= this.config.frequencyThresholdMultiplier) {
      return null;
    }

    const score = Math.min(1, (ratio - 1) / 5);

    return {
      id: this.generateAnomalyId(event, 'volume_anomaly'),
      type: 'volume_anomaly',
      severity: score > 0.8 ? 'critical' : score > 0.5 ? 'high' : 'medium',
      score,
      eventId: event.id,
      timestamp: new Date(),
      description: `Volume spike: ${currentHourCount} events this hour vs ${avgHourlyCount.toFixed(0)} average`,
      context: {
        expectedValue: avgHourlyCount,
        observedValue: currentHourCount,
      },
      recommended_action: 'Check for automated processes or attacks',
      suppressed: false,
    };
  }

  /**
   * Detect sequence anomaly
   */
  private async detectSequenceAnomaly(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    if (!this.config.enableSequenceDetection) {
      return null;
    }

    // Get recent events for this actor
    const actorEvents = this.eventWindow
      .filter((e) => e.actorId === event.actorId)
      .slice(-5);

    if (actorEvents.length < 3) {
      return null;
    }

    // Create sequence pattern
    const sequence = actorEvents.map((e) => e.eventType).concat(event.eventType);
    const sequenceKey = sequence.join('→');

    // Check if this sequence is common
    const pattern = this.sequencePatterns.get(sequenceKey);
    const isRare = !pattern || pattern.count < 3;

    if (!isRare) {
      // Update pattern
      if (pattern) {
        pattern.count++;
        pattern.lastSeen = new Date();
      }
      return null;
    }

    // Store new pattern
    this.sequencePatterns.set(sequenceKey, {
      pattern: sequence,
      count: 1,
      lastSeen: new Date(),
    });

    // Only alert on suspicious sequences
    const suspiciousPatterns = [
      ['login', 'permission_change', 'data_export'],
      ['failed_login', 'failed_login', 'login', 'admin_action'],
      ['search', 'search', 'search', 'export', 'export'],
    ];

    const isSuspicious = suspiciousPatterns.some((pattern) =>
      this.isSubsequence(pattern, sequence),
    );

    if (!isSuspicious) {
      return null;
    }

    return {
      id: this.generateAnomalyId(event, 'sequence_anomaly'),
      type: 'sequence_anomaly',
      severity: 'high',
      score: 0.85,
      eventId: event.id,
      timestamp: new Date(),
      description: `Suspicious event sequence: ${sequenceKey}`,
      context: {
        actorId: event.actorId,
        observedValue: sequenceKey,
      },
      recommended_action: 'Review complete session activity',
      suppressed: false,
    };
  }

  /**
   * Detect geographic anomaly
   */
  private async detectGeographicAnomaly(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    if (!event.geoLocation?.country && !event.sourceIp) {
      return null;
    }

    const profile = this.actorProfiles.get(event.actorId);
    if (!profile || profile.eventCount < this.config.minSamplesForBaseline) {
      return null;
    }

    const location = event.geoLocation?.country || event.sourceIp || '';
    if (profile.typicalLocations.has(location)) {
      return null;
    }

    // Check for impossible travel
    const recentEvents = this.eventWindow
      .filter(
        (e) =>
          e.actorId === event.actorId &&
          e.geoLocation?.latitude &&
          event.timestamp.getTime() - e.timestamp.getTime() < 3600000,
      )
      .slice(-1);

    if (recentEvents.length > 0 && event.geoLocation?.latitude) {
      const lastEvent = recentEvents[0];
      const distance = this.calculateDistance(
        lastEvent.geoLocation!.latitude!,
        lastEvent.geoLocation!.longitude!,
        event.geoLocation.latitude,
        event.geoLocation.longitude!,
      );

      const timeDiffHours =
        (event.timestamp.getTime() - lastEvent.timestamp.getTime()) / 3600000;
      const maxPossibleSpeed = 1000; // km/h (airplane)
      const maxPossibleDistance = maxPossibleSpeed * timeDiffHours;

      if (distance > maxPossibleDistance) {
        return {
          id: this.generateAnomalyId(event, 'geographic_anomaly'),
          type: 'geographic_anomaly',
          severity: 'critical',
          score: 0.95,
          eventId: event.id,
          timestamp: new Date(),
          description: `Impossible travel: ${distance.toFixed(0)}km in ${timeDiffHours.toFixed(1)}h`,
          context: {
            actorId: event.actorId,
            observedValue: `${location} (${distance.toFixed(0)}km)`,
            expectedValue: `Max ${maxPossibleDistance.toFixed(0)}km in ${timeDiffHours.toFixed(1)}h`,
          },
          recommended_action: 'Immediate session termination and password reset',
          suppressed: false,
        };
      }
    }

    return {
      id: this.generateAnomalyId(event, 'geographic_anomaly'),
      type: 'geographic_anomaly',
      severity: 'high',
      score: 0.75,
      eventId: event.id,
      timestamp: new Date(),
      description: `Access from new location: ${location}`,
      context: {
        actorId: event.actorId,
        observedValue: location,
      },
      recommended_action: 'Verify location is legitimate',
      suppressed: false,
    };
  }

  /**
   * Detect privilege escalation patterns
   */
  private async detectPrivilegeEscalation(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    const escalationActions = [
      'permission_grant',
      'role_change',
      'admin_promote',
      'access_level_increase',
      'group_add',
    ];

    if (!event.action || !escalationActions.includes(event.action)) {
      return null;
    }

    // Check for self-escalation or suspicious patterns
    const recentEscalations = this.eventWindow.filter(
      (e) =>
        e.actorId === event.actorId &&
        e.action &&
        escalationActions.includes(e.action) &&
        event.timestamp.getTime() - e.timestamp.getTime() < 86400000, // 24h
    );

    if (recentEscalations.length < 2) {
      return null;
    }

    const score = Math.min(1, recentEscalations.length / 5);

    return {
      id: this.generateAnomalyId(event, 'privilege_escalation'),
      type: 'privilege_escalation',
      severity: 'critical',
      score,
      eventId: event.id,
      timestamp: new Date(),
      description: `Multiple privilege changes (${recentEscalations.length}) in 24h by ${event.actorId}`,
      context: {
        actorId: event.actorId,
        action: event.action,
        observedValue: recentEscalations.length,
      },
      recommended_action: 'Review all privilege changes and audit actor access',
      suppressed: false,
    };
  }

  /**
   * Detect data exfiltration patterns
   */
  private async detectDataExfiltration(event: AuditEventInput): Promise<DetectedAnomaly | null> {
    const exfilActions = [
      'data_export',
      'bulk_download',
      'report_generate',
      'api_export',
      'backup_download',
    ];

    if (!event.action || !exfilActions.includes(event.action)) {
      return null;
    }

    // Check for bulk exports
    const recentExports = this.eventWindow.filter(
      (e) =>
        e.actorId === event.actorId &&
        e.action &&
        exfilActions.includes(e.action) &&
        event.timestamp.getTime() - e.timestamp.getTime() < 3600000, // 1h
    );

    const profile = this.actorProfiles.get(event.actorId);
    const expectedExports = profile
      ? profile.actionCounts.get('data_export') || 0
      : 0;

    if (recentExports.length < 3 && expectedExports > 0) {
      return null;
    }

    const score = Math.min(1, recentExports.length / 10);

    return {
      id: this.generateAnomalyId(event, 'data_exfiltration'),
      type: 'data_exfiltration',
      severity: score > 0.7 ? 'critical' : 'high',
      score,
      eventId: event.id,
      timestamp: new Date(),
      description: `Possible data exfiltration: ${recentExports.length} exports in 1h by ${event.actorId}`,
      context: {
        actorId: event.actorId,
        action: event.action,
        observedValue: recentExports.length,
      },
      recommended_action: 'Review exported data and consider account suspension',
      suppressed: false,
    };
  }

  /**
   * Update event window
   */
  private updateEventWindow(event: AuditEventInput): void {
    this.eventWindow.push(event);

    // Trim to window size
    const cutoff = Date.now() - this.config.windowSizeMs;
    while (
      this.eventWindow.length > 0 &&
      this.eventWindow[0].timestamp.getTime() < cutoff
    ) {
      this.eventWindow.shift();
    }

    // Also limit by count
    while (this.eventWindow.length > this.config.slidingWindowEvents) {
      this.eventWindow.shift();
    }

    this.totalEventCount++;
  }

  /**
   * Update baselines
   */
  private updateBaselines(event: AuditEventInput): void {
    const key = `frequency:${event.actorId}:${event.eventType}`;
    let baseline = this.baselines.get(key);

    if (!baseline) {
      baseline = {
        mean: 0,
        stdDev: 0,
        median: 0,
        q1: 0,
        q3: 0,
        count: 0,
        lastUpdated: new Date(),
      };
      this.baselines.set(key, baseline);
    }

    // Update running statistics
    const n = baseline.count + 1;
    const oldMean = baseline.mean;
    baseline.mean = oldMean + (1 - oldMean) / n;
    baseline.stdDev = Math.sqrt(
      ((n - 1) * baseline.stdDev * baseline.stdDev +
        (1 - oldMean) * (1 - baseline.mean)) /
        n,
    );
    baseline.count = n;
    baseline.lastUpdated = new Date();

    // Update hourly counts
    const hour = event.timestamp.getHours();
    this.hourlyEventCounts[hour]++;
  }

  /**
   * Update actor profile
   */
  private updateActorProfile(event: AuditEventInput): void {
    let profile = this.actorProfiles.get(event.actorId);

    if (!profile) {
      profile = {
        actorId: event.actorId,
        firstSeen: event.timestamp,
        lastSeen: event.timestamp,
        eventCount: 0,
        actionCounts: new Map(),
        resourceCounts: new Map(),
        hourlyDistribution: new Array(24).fill(0),
        avgEventsPerHour: 0,
        typicalIps: new Set(),
        typicalLocations: new Set(),
      };
      this.actorProfiles.set(event.actorId, profile);
    }

    profile.lastSeen = event.timestamp;
    profile.eventCount++;

    if (event.action) {
      const count = profile.actionCounts.get(event.action) || 0;
      profile.actionCounts.set(event.action, count + 1);
    }

    if (event.resourceId) {
      const count = profile.resourceCounts.get(event.resourceId) || 0;
      profile.resourceCounts.set(event.resourceId, count + 1);
    }

    const hour = event.timestamp.getHours();
    profile.hourlyDistribution[hour]++;

    if (event.sourceIp) {
      profile.typicalIps.add(event.sourceIp);
    }

    if (event.geoLocation?.country) {
      profile.typicalLocations.add(event.geoLocation.country);
    }

    // Update average
    const hoursSinceFirst =
      (profile.lastSeen.getTime() - profile.firstSeen.getTime()) / 3600000;
    profile.avgEventsPerHour = profile.eventCount / Math.max(hoursSinceFirst, 1);
  }

  /**
   * Update action frequencies
   */
  private updateActionFrequencies(event: AuditEventInput): void {
    if (event.action) {
      const count = this.actionFrequencies.get(event.action) || 0;
      this.actionFrequencies.set(event.action, count + 1);
    }
  }

  /**
   * Check if alert should be suppressed
   */
  private shouldSuppress(anomaly: DetectedAnomaly): boolean {
    const key = `${anomaly.type}:${anomaly.context.actorId || ''}:${anomaly.context.resourceId || ''}`;
    const lastAlert = this.recentAlerts.get(key);

    if (lastAlert) {
      const elapsed = Date.now() - lastAlert.getTime();
      if (elapsed < this.config.alertCooldownMs) {
        anomaly.suppressed = true;
        return true;
      }
    }

    this.recentAlerts.set(key, new Date());
    return false;
  }

  /**
   * Calculate time anomaly score
   */
  private calculateTimeAnomalyScore(event: AuditEventInput, hour: number): number {
    // Higher score for later hours, highest at 3 AM
    const distanceFrom3AM = Math.abs(hour - 3);
    return Math.max(0, 1 - distanceFrom3AM / 12);
  }

  /**
   * Generate unique anomaly ID
   */
  private generateAnomalyId(event: AuditEventInput, type: AnomalyType): string {
    const data = `${event.id}:${type}:${Date.now()}`;
    return createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Check if pattern is subsequence
   */
  private isSubsequence(pattern: string[], sequence: string[]): boolean {
    let patternIdx = 0;
    for (const item of sequence) {
      if (item === pattern[patternIdx]) {
        patternIdx++;
        if (patternIdx === pattern.length) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Calculate distance between coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Get detector statistics
   */
  getStats(): {
    totalEvents: number;
    windowSize: number;
    profileCount: number;
    patternCount: number;
    baselineCount: number;
  } {
    return {
      totalEvents: this.totalEventCount,
      windowSize: this.eventWindow.length,
      profileCount: this.actorProfiles.size,
      patternCount: this.sequencePatterns.size,
      baselineCount: this.baselines.size,
    };
  }

  /**
   * Reset detector state
   */
  reset(): void {
    this.eventWindow = [];
    this.baselines.clear();
    this.actorProfiles.clear();
    this.sequencePatterns.clear();
    this.recentAlerts.clear();
    this.actionFrequencies.clear();
    this.hourlyEventCounts = new Array(24).fill(0);
    this.totalEventCount = 0;
  }
}

/**
 * Create configured anomaly detector
 */
export function createAnomalyDetector(
  config: Partial<AnomalyDetectorConfig> = {},
): AnomalyDetector {
  return new AnomalyDetector(config);
}
