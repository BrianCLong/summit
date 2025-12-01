/**
 * Network threat detection engine
 * Detects DDoS, port scans, C2 beaconing, data exfiltration, etc.
 */

import {
  INetworkThreatDetector,
  ThreatEvent,
  NetworkEvent,
  ThreatCategory,
  ThreatSeverity,
  EventSource
} from '@intelgraph/threat-detection-core';
import { v4 as uuidv4 } from 'uuid';

export interface NetworkDetectorConfig {
  // DDoS thresholds
  ddosRequestThreshold: number; // Requests per second
  ddosSourceThreshold: number; // Unique sources for distributed
  ddosTimeWindow: number; // milliseconds

  // Port scan thresholds
  portScanPortsThreshold: number; // Number of ports accessed
  portScanTimeWindow: number; // milliseconds

  // Data exfiltration thresholds
  exfiltrationBytesThreshold: number; // Bytes transferred
  exfiltrationTimeWindow: number; // milliseconds

  // C2 beaconing
  beaconingMinRequests: number; // Minimum requests for pattern
  beaconingIntervalTolerance: number; // milliseconds tolerance
}

export class NetworkThreatDetector implements INetworkThreatDetector {
  private config: NetworkDetectorConfig;
  private eventHistory: Map<string, NetworkEvent[]> = new Map();

  constructor(config: NetworkDetectorConfig) {
    this.config = config;
  }

  async analyzeNetworkEvent(event: NetworkEvent): Promise<ThreatEvent | null> {
    // Store event in history
    this.addToHistory(event);

    // Check for various threats
    const ddosEvents = await this.detectDDoS([event]);
    if (ddosEvents.length > 0) return ddosEvents[0];

    const portScanEvents = await this.detectPortScan([event]);
    if (portScanEvents.length > 0) return portScanEvents[0];

    const exfilEvents = await this.detectExfiltration([event]);
    if (exfilEvents.length > 0) return exfilEvents[0];

    const beaconEvents = await this.detectBeaconing([event]);
    if (beaconEvents.length > 0) return beaconEvents[0];

    return null;
  }

  async detectDDoS(events: NetworkEvent[]): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];
    const now = Date.now();

    // Group by destination IP
    const byDestination = this.groupByDestination(events);

    for (const [destIp, destEvents] of byDestination.entries()) {
      const recentEvents = destEvents.filter(
        e => now - e.timestamp.getTime() < this.config.ddosTimeWindow
      );

      if (recentEvents.length === 0) continue;

      // Calculate request rate
      const timeSpan = Math.max(
        1000,
        now - Math.min(...recentEvents.map(e => e.timestamp.getTime()))
      );
      const requestRate = (recentEvents.length / timeSpan) * 1000; // per second

      // Count unique sources
      const uniqueSources = new Set(recentEvents.map(e => e.sourceIp)).size;

      // Detect DDoS
      if (requestRate > this.config.ddosRequestThreshold) {
        const severity = uniqueSources > this.config.ddosSourceThreshold
          ? ThreatSeverity.CRITICAL
          : ThreatSeverity.HIGH;

        threats.push({
          id: uuidv4(),
          timestamp: new Date(),
          source: EventSource.NETWORK,
          category: ThreatCategory.DDOS,
          severity,
          destinationIp: destIp,
          threatScore: Math.min(1, requestRate / (this.config.ddosRequestThreshold * 2)),
          confidenceScore: 0.9,
          indicators: [destIp, ...Array.from(new Set(recentEvents.map(e => e.sourceIp)))],
          description: `DDoS attack detected: ${requestRate.toFixed(0)} req/s from ${uniqueSources} sources`,
          rawData: { recentEvents: recentEvents.length, requestRate, uniqueSources },
          metadata: { detectionMethod: 'rate_based' },
          responded: false
        });
      }
    }

    return threats;
  }

  async detectPortScan(events: NetworkEvent[]): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];
    const now = Date.now();

    // Group by source IP
    const bySource = this.groupBySource(events);

    for (const [sourceIp, sourceEvents] of bySource.entries()) {
      const recentEvents = sourceEvents.filter(
        e => now - e.timestamp.getTime() < this.config.portScanTimeWindow
      );

      if (recentEvents.length === 0) continue;

      // Count unique destination ports
      const uniquePorts = new Set(
        recentEvents
          .filter(e => e.destinationPort !== undefined)
          .map(e => e.destinationPort)
      );

      if (uniquePorts.size >= this.config.portScanPortsThreshold) {
        threats.push({
          id: uuidv4(),
          timestamp: new Date(),
          source: EventSource.NETWORK,
          category: ThreatCategory.PORT_SCAN,
          severity: ThreatSeverity.MEDIUM,
          sourceIp,
          threatScore: Math.min(1, uniquePorts.size / (this.config.portScanPortsThreshold * 2)),
          confidenceScore: 0.85,
          indicators: [sourceIp],
          description: `Port scan detected: ${uniquePorts.size} unique ports accessed`,
          rawData: { portsScanned: Array.from(uniquePorts), eventCount: recentEvents.length },
          metadata: { detectionMethod: 'port_diversity' },
          mitreAttackTactics: ['reconnaissance'],
          mitreAttackTechniques: ['T1046'],
          responded: false
        });
      }
    }

    return threats;
  }

  async detectExfiltration(events: NetworkEvent[]): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];
    const now = Date.now();

    // Group by source IP
    const bySource = this.groupBySource(events);

    for (const [sourceIp, sourceEvents] of bySource.entries()) {
      const recentEvents = sourceEvents.filter(
        e => now - e.timestamp.getTime() < this.config.exfiltrationTimeWindow
      );

      if (recentEvents.length === 0) continue;

      // Calculate total bytes transferred
      const totalBytes = recentEvents.reduce(
        (sum, e) => sum + (e.bytesTransferred || 0),
        0
      );

      if (totalBytes > this.config.exfiltrationBytesThreshold) {
        // Additional indicators
        const isEncrypted = recentEvents.some(e => e.tlsVersion !== undefined);
        const isUnusualPort = recentEvents.some(e =>
          e.destinationPort && ![80, 443, 22, 21].includes(e.destinationPort)
        );

        const severity = (isEncrypted && isUnusualPort)
          ? ThreatSeverity.CRITICAL
          : ThreatSeverity.HIGH;

        threats.push({
          id: uuidv4(),
          timestamp: new Date(),
          source: EventSource.NETWORK,
          category: ThreatCategory.DATA_EXFILTRATION,
          severity,
          sourceIp,
          threatScore: Math.min(1, totalBytes / (this.config.exfiltrationBytesThreshold * 2)),
          confidenceScore: 0.8,
          indicators: [sourceIp],
          description: `Potential data exfiltration: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB transferred`,
          rawData: { totalBytes, eventCount: recentEvents.length, isEncrypted, isUnusualPort },
          metadata: { detectionMethod: 'volume_based' },
          mitreAttackTactics: ['exfiltration'],
          mitreAttackTechniques: ['T1041'],
          responded: false
        });
      }
    }

    return threats;
  }

  async detectBeaconing(events: NetworkEvent[]): Promise<ThreatEvent[]> {
    const threats: ThreatEvent[] = [];

    // Group by source IP
    const bySource = this.groupBySource(events);

    for (const [sourceIp, sourceEvents] of bySource.entries()) {
      // Need sufficient data points
      if (sourceEvents.length < this.config.beaconingMinRequests) continue;

      // Sort by time
      const sorted = [...sourceEvents].sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      );

      // Calculate intervals between requests
      const intervals: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        const interval = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
        intervals.push(interval);
      }

      // Check for regular intervals (C2 beaconing)
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const variance = intervals.reduce(
        (sum, interval) => sum + Math.pow(interval - avgInterval, 2),
        0
      ) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // Low standard deviation indicates regular beaconing
      const isRegular = stdDev < this.config.beaconingIntervalTolerance;

      if (isRegular) {
        threats.push({
          id: uuidv4(),
          timestamp: new Date(),
          source: EventSource.NETWORK,
          category: ThreatCategory.C2_COMMUNICATION,
          severity: ThreatSeverity.HIGH,
          sourceIp,
          threatScore: Math.min(1, 1 - (stdDev / avgInterval)),
          confidenceScore: 0.75,
          indicators: [sourceIp],
          description: `C2 beaconing detected: regular ${(avgInterval / 1000).toFixed(0)}s intervals`,
          rawData: { avgInterval, stdDev, requestCount: sorted.length },
          metadata: { detectionMethod: 'interval_regularity' },
          mitreAttackTactics: ['command-and-control'],
          mitreAttackTechniques: ['T1071'],
          responded: false
        });
      }
    }

    return threats;
  }

  private addToHistory(event: NetworkEvent): void {
    const key = `${event.sourceIp}-${event.destinationIp}`;

    if (!this.eventHistory.has(key)) {
      this.eventHistory.set(key, []);
    }

    const history = this.eventHistory.get(key)!;
    history.push(event);

    // Limit history size
    if (history.length > 10000) {
      history.splice(0, history.length - 10000);
    }
  }

  private groupBySource(events: NetworkEvent[]): Map<string, NetworkEvent[]> {
    const grouped = new Map<string, NetworkEvent[]>();

    for (const event of events) {
      if (!grouped.has(event.sourceIp)) {
        grouped.set(event.sourceIp, []);
      }
      grouped.get(event.sourceIp)!.push(event);
    }

    return grouped;
  }

  private groupByDestination(events: NetworkEvent[]): Map<string, NetworkEvent[]> {
    const grouped = new Map<string, NetworkEvent[]>();

    for (const event of events) {
      if (!grouped.has(event.destinationIp)) {
        grouped.set(event.destinationIp, []);
      }
      grouped.get(event.destinationIp)!.push(event);
    }

    return grouped;
  }

  clearHistory(): void {
    this.eventHistory.clear();
  }
}
