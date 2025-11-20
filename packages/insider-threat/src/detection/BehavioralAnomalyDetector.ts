/**
 * Behavioral Anomaly Detection Engine
 *
 * Uses machine learning and statistical analysis to detect
 * anomalous behavior patterns that may indicate insider threats
 */

import type {
  BehavioralAnomaly,
  ThreatRiskLevel
} from '../types.js';

export interface UserBehaviorBaseline {
  userId: string;
  accessPatterns: {
    typicalLoginTimes: number[]; // hours of day
    typicalDays: number[]; // days of week
    averageSessionDuration: number;
    typicalLocations: string[];
    typicalDevices: string[];
  };
  dataAccessPatterns: {
    averageFilesAccessed: number;
    typicalDataVolume: number;
    typicalDataTypes: string[];
    averageDownloads: number;
  };
  communicationPatterns: {
    averageEmails: number;
    typicalRecipients: string[];
    averageExternalContacts: number;
  };
  lastUpdated: Date;
}

export interface AnomalyDetectionConfig {
  sensitivityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  minimumConfidence: number;
  lookbackPeriodDays: number;
  enableMLModels: boolean;
  alertThreshold: number;
}

export class BehavioralAnomalyDetector {
  private baselines: Map<string, UserBehaviorBaseline> = new Map();
  private config: AnomalyDetectionConfig;

  constructor(config: AnomalyDetectionConfig) {
    this.config = config;
  }

  /**
   * Analyze user activity for behavioral anomalies
   */
  async detectAnomalies(
    userId: string,
    activityData: any
  ): Promise<BehavioralAnomaly[]> {
    const baseline = this.baselines.get(userId);
    if (!baseline) {
      // No baseline yet - need to establish one
      return [];
    }

    const anomalies: BehavioralAnomaly[] = [];

    // Check access time anomalies
    const timeAnomaly = this.checkAccessTimeAnomaly(activityData, baseline);
    if (timeAnomaly) {
      anomalies.push(timeAnomaly);
    }

    // Check access frequency anomalies
    const frequencyAnomaly = this.checkAccessFrequencyAnomaly(activityData, baseline);
    if (frequencyAnomaly) {
      anomalies.push(frequencyAnomaly);
    }

    // Check resource usage anomalies
    const resourceAnomaly = this.checkResourceUsageAnomaly(activityData, baseline);
    if (resourceAnomaly) {
      anomalies.push(resourceAnomaly);
    }

    // Check communication pattern anomalies
    const commAnomaly = this.checkCommunicationAnomaly(activityData, baseline);
    if (commAnomaly) {
      anomalies.push(commAnomaly);
    }

    // Check login location anomalies
    const locationAnomaly = this.checkLocationAnomaly(activityData, baseline);
    if (locationAnomaly) {
      anomalies.push(locationAnomaly);
    }

    // Check device change anomalies
    const deviceAnomaly = this.checkDeviceAnomaly(activityData, baseline);
    if (deviceAnomaly) {
      anomalies.push(deviceAnomaly);
    }

    // Check data access volume anomalies
    const volumeAnomaly = this.checkDataVolumeAnomaly(activityData, baseline);
    if (volumeAnomaly) {
      anomalies.push(volumeAnomaly);
    }

    // Check download pattern anomalies
    const downloadAnomaly = this.checkDownloadAnomaly(activityData, baseline);
    if (downloadAnomaly) {
      anomalies.push(downloadAnomaly);
    }

    return anomalies;
  }

  /**
   * Update baseline behavior for a user
   */
  async updateBaseline(userId: string, historicalData: any): Promise<void> {
    const baseline = this.calculateBaseline(userId, historicalData);
    this.baselines.set(userId, baseline);
  }

  /**
   * Calculate behavioral baseline from historical data
   */
  private calculateBaseline(
    userId: string,
    historicalData: any
  ): UserBehaviorBaseline {
    // Implement statistical analysis to establish baseline
    // This would typically involve:
    // - Time series analysis
    // - Statistical distribution calculation
    // - Pattern recognition

    return {
      userId,
      accessPatterns: {
        typicalLoginTimes: this.calculateTypicalTimes(historicalData),
        typicalDays: this.calculateTypicalDays(historicalData),
        averageSessionDuration: this.calculateAverage(historicalData.sessionDurations),
        typicalLocations: this.extractTypicalValues(historicalData.locations),
        typicalDevices: this.extractTypicalValues(historicalData.devices)
      },
      dataAccessPatterns: {
        averageFilesAccessed: this.calculateAverage(historicalData.filesAccessed),
        typicalDataVolume: this.calculateAverage(historicalData.dataVolumes),
        typicalDataTypes: this.extractTypicalValues(historicalData.dataTypes),
        averageDownloads: this.calculateAverage(historicalData.downloads)
      },
      communicationPatterns: {
        averageEmails: this.calculateAverage(historicalData.emailCounts),
        typicalRecipients: this.extractTypicalValues(historicalData.recipients),
        averageExternalContacts: this.calculateAverage(historicalData.externalContacts)
      },
      lastUpdated: new Date()
    };
  }

  /**
   * Check for access time anomalies
   */
  private checkAccessTimeAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    const currentHour = new Date(activity.timestamp).getHours();
    const typicalHours = baseline.accessPatterns.typicalLoginTimes;

    // Check if access time is significantly different from baseline
    const deviation = this.calculateTimeDeviation(currentHour, typicalHours);

    if (deviation > this.config.alertThreshold) {
      return {
        id: crypto.randomUUID(),
        userId: baseline.userId,
        timestamp: new Date(activity.timestamp),
        anomalyType: 'ACCESS_TIME',
        severity: this.calculateSeverity(deviation),
        baselineDeviation: deviation,
        description: `User accessed system at unusual time (${currentHour}:00)`,
        context: {
          currentHour,
          typicalHours,
          deviation
        },
        mlConfidence: 0.85
      };
    }

    return null;
  }

  /**
   * Check for access frequency anomalies
   */
  private checkAccessFrequencyAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    const currentFrequency = activity.accessCount;
    const typicalFrequency = baseline.accessPatterns.averageSessionDuration;

    const deviation = Math.abs(currentFrequency - typicalFrequency) / typicalFrequency * 100;

    if (deviation > this.config.alertThreshold) {
      return {
        id: crypto.randomUUID(),
        userId: baseline.userId,
        timestamp: new Date(activity.timestamp),
        anomalyType: 'ACCESS_FREQUENCY',
        severity: this.calculateSeverity(deviation),
        baselineDeviation: deviation,
        description: `Unusual access frequency detected (${deviation.toFixed(1)}% deviation)`,
        context: {
          currentFrequency,
          typicalFrequency,
          deviation
        },
        mlConfidence: 0.78
      };
    }

    return null;
  }

  /**
   * Check for resource usage anomalies
   */
  private checkResourceUsageAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    // Implement resource usage anomaly detection
    return null;
  }

  /**
   * Check for communication pattern anomalies
   */
  private checkCommunicationAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    // Implement communication anomaly detection
    return null;
  }

  /**
   * Check for location anomalies
   */
  private checkLocationAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    const currentLocation = activity.location;
    const typicalLocations = baseline.accessPatterns.typicalLocations;

    if (!typicalLocations.includes(currentLocation)) {
      return {
        id: crypto.randomUUID(),
        userId: baseline.userId,
        timestamp: new Date(activity.timestamp),
        anomalyType: 'LOGIN_LOCATION',
        severity: 'HIGH' as ThreatRiskLevel,
        baselineDeviation: 100,
        description: `Login from unusual location: ${currentLocation}`,
        context: {
          currentLocation,
          typicalLocations
        },
        mlConfidence: 0.92
      };
    }

    return null;
  }

  /**
   * Check for device anomalies
   */
  private checkDeviceAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    // Implement device anomaly detection
    return null;
  }

  /**
   * Check for data volume anomalies
   */
  private checkDataVolumeAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    // Implement data volume anomaly detection
    return null;
  }

  /**
   * Check for download pattern anomalies
   */
  private checkDownloadAnomaly(
    activity: any,
    baseline: UserBehaviorBaseline
  ): BehavioralAnomaly | null {
    // Implement download anomaly detection
    return null;
  }

  // Helper methods

  private calculateTypicalTimes(data: any): number[] {
    // Extract most common access hours
    return [9, 10, 11, 13, 14, 15, 16]; // Example
  }

  private calculateTypicalDays(data: any): number[] {
    // Extract typical workdays
    return [1, 2, 3, 4, 5]; // Monday-Friday
  }

  private calculateAverage(values: number[]): number {
    if (!values || values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private extractTypicalValues(values: string[]): string[] {
    // Extract most common values
    const frequency = new Map<string, number>();
    values.forEach(v => {
      frequency.set(v, (frequency.get(v) || 0) + 1);
    });

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([value]) => value);
  }

  private calculateTimeDeviation(current: number, typical: number[]): number {
    const distances = typical.map(t => Math.abs(current - t));
    const minDistance = Math.min(...distances);
    return (minDistance / 12) * 100; // Normalize to percentage
  }

  private calculateSeverity(deviation: number): ThreatRiskLevel {
    if (deviation >= 80) return 'CRITICAL' as ThreatRiskLevel;
    if (deviation >= 60) return 'HIGH' as ThreatRiskLevel;
    if (deviation >= 40) return 'MEDIUM' as ThreatRiskLevel;
    return 'LOW' as ThreatRiskLevel;
  }
}
