import {
  AlertGenerator,
  DetectedEvent,
  Alert,
  AlertStatus,
  AlertChannel,
  SeverityLevel,
  CrisisType,
} from './types';
import { randomUUID } from 'crypto';

export class CrisisAlertGenerator implements AlertGenerator {
  private minSeverityThreshold: SeverityLevel;
  private minConfidenceThreshold: number;

  constructor(
    minSeverity: SeverityLevel = SeverityLevel.MEDIUM,
    minConfidence: number = 0.7
  ) {
    this.minSeverityThreshold = minSeverity;
    this.minConfidenceThreshold = minConfidence;
  }

  async generateAlert(event: DetectedEvent): Promise<Alert> {
    const alert: Alert = {
      id: randomUUID(),
      tenantId: event.tenantId,
      eventId: event.id,
      crisisType: event.crisisType,
      severity: event.severity,
      status: AlertStatus.PENDING,
      title: this.generateTitle(event),
      message: this.generateMessage(event),
      location: event.location,
      affectedPopulation: event.metadata?.affectedPopulation as number | undefined,
      affectedArea: event.metadata?.affectedArea as number | undefined,
      channels: this.selectChannels(event.severity),
      createdAt: new Date(),
      escalationLevel: 0,
    };

    return alert;
  }

  shouldCreateAlert(event: DetectedEvent): boolean {
    // Check if event meets criteria for alert generation
    if (!this.meetsSeverityThreshold(event.severity)) {
      return false;
    }

    if (event.confidence < this.minConfidenceThreshold) {
      return false;
    }

    return true;
  }

  private generateTitle(event: DetectedEvent): string {
    const severityPrefix = this.getSeverityPrefix(event.severity);
    return `${severityPrefix}: ${event.title}`;
  }

  private generateMessage(event: DetectedEvent): string {
    let message = event.description;

    if (event.location) {
      const locationStr = this.formatLocation(event.location);
      message += `\n\nLocation: ${locationStr}`;
    }

    if (event.metadata?.affectedPopulation) {
      message += `\nEstimated affected population: ${event.metadata.affectedPopulation.toLocaleString()}`;
    }

    message += `\n\nDetected at: ${event.detectedAt.toISOString()}`;
    message += `\nConfidence: ${(event.confidence * 100).toFixed(1)}%`;
    message += `\nSource: ${event.source}`;

    return message;
  }

  private getSeverityPrefix(severity: SeverityLevel): string {
    switch (severity) {
      case SeverityLevel.CATASTROPHIC:
        return '🔴 CATASTROPHIC ALERT';
      case SeverityLevel.CRITICAL:
        return '🔴 CRITICAL ALERT';
      case SeverityLevel.HIGH:
        return '🟠 HIGH PRIORITY';
      case SeverityLevel.MEDIUM:
        return '🟡 MEDIUM PRIORITY';
      case SeverityLevel.LOW:
        return '🟢 LOW PRIORITY';
      default:
        return 'ℹ️ INFORMATION';
    }
  }

  private formatLocation(location: any): string {
    const parts: string[] = [];

    if (location.address) parts.push(location.address);
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country) parts.push(location.country);

    if (parts.length === 0 && location.latitude && location.longitude) {
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
    }

    return parts.join(', ');
  }

  private selectChannels(severity: SeverityLevel): AlertChannel[] {
    // Select appropriate channels based on severity
    const channels: AlertChannel[] = [];

    switch (severity) {
      case SeverityLevel.CATASTROPHIC:
      case SeverityLevel.CRITICAL:
        channels.push(
          AlertChannel.SMS,
          AlertChannel.EMAIL,
          AlertChannel.PUSH,
          AlertChannel.VOICE,
          AlertChannel.SIREN,
          AlertChannel.SOCIAL_MEDIA
        );
        break;

      case SeverityLevel.HIGH:
        channels.push(
          AlertChannel.SMS,
          AlertChannel.EMAIL,
          AlertChannel.PUSH,
          AlertChannel.SOCIAL_MEDIA
        );
        break;

      case SeverityLevel.MEDIUM:
        channels.push(AlertChannel.EMAIL, AlertChannel.PUSH);
        break;

      case SeverityLevel.LOW:
      case SeverityLevel.INFO:
        channels.push(AlertChannel.EMAIL);
        break;
    }

    return channels;
  }

  private meetsSeverityThreshold(severity: SeverityLevel): boolean {
    const severityOrder = [
      SeverityLevel.INFO,
      SeverityLevel.LOW,
      SeverityLevel.MEDIUM,
      SeverityLevel.HIGH,
      SeverityLevel.CRITICAL,
      SeverityLevel.CATASTROPHIC,
    ];

    const eventIndex = severityOrder.indexOf(severity);
    const thresholdIndex = severityOrder.indexOf(this.minSeverityThreshold);

    return eventIndex >= thresholdIndex;
  }
}

export class AlertPrioritizer {
  prioritize(alerts: Alert[]): Alert[] {
    return alerts.sort((a, b) => {
      // First, sort by severity
      const severityOrder = this.getSeverityOrder();
      const severityDiff =
        severityOrder.indexOf(b.severity) - severityOrder.indexOf(a.severity);

      if (severityDiff !== 0) return severityDiff;

      // Then by affected population
      const popA = a.affectedPopulation || 0;
      const popB = b.affectedPopulation || 0;
      if (popB !== popA) return popB - popA;

      // Finally by creation time (most recent first)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  private getSeverityOrder(): SeverityLevel[] {
    return [
      SeverityLevel.INFO,
      SeverityLevel.LOW,
      SeverityLevel.MEDIUM,
      SeverityLevel.HIGH,
      SeverityLevel.CRITICAL,
      SeverityLevel.CATASTROPHIC,
    ];
  }
}

export class AlertDeduplicator {
  deduplicate(alerts: Alert[]): Alert[] {
    const uniqueAlerts = new Map<string, Alert>();
    const duplicates = new Map<string, string[]>();

    for (const alert of alerts) {
      const key = this.generateDeduplicationKey(alert);

      if (!uniqueAlerts.has(key)) {
        uniqueAlerts.set(key, alert);
        duplicates.set(key, [alert.id]);
      } else {
        // Mark as duplicate
        const duplicateIds = duplicates.get(key) || [];
        duplicateIds.push(alert.id);
        duplicates.set(key, duplicateIds);

        // Update the existing alert with duplicate reference
        const existingAlert = uniqueAlerts.get(key)!;
        alert.duplicateOf = existingAlert.id;
      }
    }

    return Array.from(uniqueAlerts.values());
  }

  private generateDeduplicationKey(alert: Alert): string {
    // Generate a key based on crisis type, location, and time window
    const parts: string[] = [alert.crisisType];

    if (alert.location) {
      // Round coordinates to reduce precision for nearby events
      const lat = Math.round(alert.location.latitude * 10) / 10;
      const lon = Math.round(alert.location.longitude * 10) / 10;
      parts.push(`${lat},${lon}`);
    }

    // Use 1-hour time window for deduplication
    const hourTimestamp = Math.floor(alert.createdAt.getTime() / (60 * 60 * 1000));
    parts.push(hourTimestamp.toString());

    return parts.join(':');
  }
}

export class AlertCorrelationEngine {
  correlate(alerts: Alert[]): Map<string, Alert[]> {
    const correlatedGroups = new Map<string, Alert[]>();

    // Group by crisis type and temporal proximity
    for (const alert of alerts) {
      const correlationKey = this.generateCorrelationKey(alert);

      if (!correlatedGroups.has(correlationKey)) {
        correlatedGroups.set(correlationKey, []);
      }

      correlatedGroups.get(correlationKey)!.push(alert);
    }

    return correlatedGroups;
  }

  private generateCorrelationKey(alert: Alert): string {
    // Correlate alerts that are:
    // 1. Same crisis type
    // 2. Within 6 hours of each other
    // 3. Within ~100km of each other (if location available)

    const parts: string[] = [alert.crisisType];

    const sixHourWindow = Math.floor(alert.createdAt.getTime() / (6 * 60 * 60 * 1000));
    parts.push(sixHourWindow.toString());

    if (alert.location) {
      // Round to ~100km grid cells
      const lat = Math.round(alert.location.latitude);
      const lon = Math.round(alert.location.longitude);
      parts.push(`${lat},${lon}`);
    }

    return parts.join(':');
  }
}
