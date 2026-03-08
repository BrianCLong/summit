"use strict";
/**
 * Network threat detection engine
 * Detects DDoS, port scans, C2 beaconing, data exfiltration, etc.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NetworkThreatDetector = void 0;
const threat_detection_core_1 = require("@intelgraph/threat-detection-core");
const uuid_1 = require("uuid");
class NetworkThreatDetector {
    config;
    eventHistory = new Map();
    constructor(config) {
        this.config = config;
    }
    async analyzeNetworkEvent(event) {
        // Store event in history
        this.addToHistory(event);
        // Check for various threats
        const ddosEvents = await this.detectDDoS([event]);
        if (ddosEvents.length > 0)
            return ddosEvents[0];
        const portScanEvents = await this.detectPortScan([event]);
        if (portScanEvents.length > 0)
            return portScanEvents[0];
        const exfilEvents = await this.detectExfiltration([event]);
        if (exfilEvents.length > 0)
            return exfilEvents[0];
        const beaconEvents = await this.detectBeaconing([event]);
        if (beaconEvents.length > 0)
            return beaconEvents[0];
        return null;
    }
    async detectDDoS(events) {
        const threats = [];
        const now = Date.now();
        // Group by destination IP
        const byDestination = this.groupByDestination(events);
        for (const [destIp, destEvents] of byDestination.entries()) {
            const recentEvents = destEvents.filter(e => now - e.timestamp.getTime() < this.config.ddosTimeWindow);
            if (recentEvents.length === 0)
                continue;
            // Calculate request rate
            const timeSpan = Math.max(1000, now - Math.min(...recentEvents.map(e => e.timestamp.getTime())));
            const requestRate = (recentEvents.length / timeSpan) * 1000; // per second
            // Count unique sources
            const uniqueSources = new Set(recentEvents.map(e => e.sourceIp)).size;
            // Detect DDoS
            if (requestRate > this.config.ddosRequestThreshold) {
                const severity = uniqueSources > this.config.ddosSourceThreshold
                    ? threat_detection_core_1.ThreatSeverity.CRITICAL
                    : threat_detection_core_1.ThreatSeverity.HIGH;
                threats.push({
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    source: threat_detection_core_1.EventSource.NETWORK,
                    category: threat_detection_core_1.ThreatCategory.DDOS,
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
    async detectPortScan(events) {
        const threats = [];
        const now = Date.now();
        // Group by source IP
        const bySource = this.groupBySource(events);
        for (const [sourceIp, sourceEvents] of bySource.entries()) {
            const recentEvents = sourceEvents.filter(e => now - e.timestamp.getTime() < this.config.portScanTimeWindow);
            if (recentEvents.length === 0)
                continue;
            // Count unique destination ports
            const uniquePorts = new Set(recentEvents
                .filter(e => e.destinationPort !== undefined)
                .map(e => e.destinationPort));
            if (uniquePorts.size >= this.config.portScanPortsThreshold) {
                threats.push({
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    source: threat_detection_core_1.EventSource.NETWORK,
                    category: threat_detection_core_1.ThreatCategory.PORT_SCAN,
                    severity: threat_detection_core_1.ThreatSeverity.MEDIUM,
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
    async detectExfiltration(events) {
        const threats = [];
        const now = Date.now();
        // Group by source IP
        const bySource = this.groupBySource(events);
        for (const [sourceIp, sourceEvents] of bySource.entries()) {
            const recentEvents = sourceEvents.filter(e => now - e.timestamp.getTime() < this.config.exfiltrationTimeWindow);
            if (recentEvents.length === 0)
                continue;
            // Calculate total bytes transferred
            const totalBytes = recentEvents.reduce((sum, e) => sum + (e.bytesTransferred || 0), 0);
            if (totalBytes > this.config.exfiltrationBytesThreshold) {
                // Additional indicators
                const isEncrypted = recentEvents.some(e => e.tlsVersion !== undefined);
                const isUnusualPort = recentEvents.some(e => e.destinationPort && ![80, 443, 22, 21].includes(e.destinationPort));
                const severity = (isEncrypted && isUnusualPort)
                    ? threat_detection_core_1.ThreatSeverity.CRITICAL
                    : threat_detection_core_1.ThreatSeverity.HIGH;
                threats.push({
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    source: threat_detection_core_1.EventSource.NETWORK,
                    category: threat_detection_core_1.ThreatCategory.DATA_EXFILTRATION,
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
    async detectBeaconing(events) {
        const threats = [];
        // Group by source IP
        const bySource = this.groupBySource(events);
        for (const [sourceIp, sourceEvents] of bySource.entries()) {
            // Need sufficient data points
            if (sourceEvents.length < this.config.beaconingMinRequests)
                continue;
            // Sort by time
            const sorted = [...sourceEvents].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            // Calculate intervals between requests
            const intervals = [];
            for (let i = 1; i < sorted.length; i++) {
                const interval = sorted[i].timestamp.getTime() - sorted[i - 1].timestamp.getTime();
                intervals.push(interval);
            }
            // Check for regular intervals (C2 beaconing)
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
            const stdDev = Math.sqrt(variance);
            // Low standard deviation indicates regular beaconing
            const isRegular = stdDev < this.config.beaconingIntervalTolerance;
            if (isRegular) {
                threats.push({
                    id: (0, uuid_1.v4)(),
                    timestamp: new Date(),
                    source: threat_detection_core_1.EventSource.NETWORK,
                    category: threat_detection_core_1.ThreatCategory.C2_COMMUNICATION,
                    severity: threat_detection_core_1.ThreatSeverity.HIGH,
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
    addToHistory(event) {
        const key = `${event.sourceIp}-${event.destinationIp}`;
        if (!this.eventHistory.has(key)) {
            this.eventHistory.set(key, []);
        }
        const history = this.eventHistory.get(key);
        history.push(event);
        // Limit history size
        if (history.length > 10000) {
            history.splice(0, history.length - 10000);
        }
    }
    groupBySource(events) {
        const grouped = new Map();
        for (const event of events) {
            if (!grouped.has(event.sourceIp)) {
                grouped.set(event.sourceIp, []);
            }
            grouped.get(event.sourceIp).push(event);
        }
        return grouped;
    }
    groupByDestination(events) {
        const grouped = new Map();
        for (const event of events) {
            if (!grouped.has(event.destinationIp)) {
                grouped.set(event.destinationIp, []);
            }
            grouped.get(event.destinationIp).push(event);
        }
        return grouped;
    }
    clearHistory() {
        this.eventHistory.clear();
    }
}
exports.NetworkThreatDetector = NetworkThreatDetector;
