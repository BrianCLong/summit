"use strict";
// @ts-nocheck
/**
 * Traffic Pattern Analyzer - Pattern analysis for encrypted traffic
 * TRAINING/SIMULATION ONLY
 *
 * Analyzes traffic patterns and timing without decryption.
 * Educational tool for understanding traffic analysis concepts.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrafficPatternAnalyzer = void 0;
const uuid_1 = require("uuid");
class TrafficPatternAnalyzer {
    knownPatterns = new Map();
    sessions = new Map();
    constructor() {
        this.initializePatterns();
    }
    initializePatterns() {
        const patterns = [
            {
                id: 'web-browsing',
                name: 'Web Browsing',
                description: 'Standard HTTP/HTTPS web browsing pattern',
                avgPacketSize: 800,
                packetSizeStdDev: 400,
                avgInterPacketTime: 100,
                interPacketTimeStdDev: 200,
                clientToServerRatio: 0.3,
                burstiness: 0.7,
                category: 'web',
                confidence: 0.8
            },
            {
                id: 'video-streaming',
                name: 'Video Streaming',
                description: 'Continuous video stream (YouTube, Netflix)',
                avgPacketSize: 1300,
                packetSizeStdDev: 200,
                avgInterPacketTime: 10,
                interPacketTimeStdDev: 5,
                clientToServerRatio: 0.05,
                burstiness: 0.2,
                category: 'streaming',
                confidence: 0.85
            },
            {
                id: 'voip-call',
                name: 'VoIP Call',
                description: 'Voice over IP communication',
                avgPacketSize: 180,
                packetSizeStdDev: 30,
                avgInterPacketTime: 20,
                interPacketTimeStdDev: 5,
                clientToServerRatio: 0.5,
                burstiness: 0.1,
                category: 'voip',
                confidence: 0.9
            },
            {
                id: 'video-call',
                name: 'Video Call',
                description: 'Video conferencing (Zoom, Teams)',
                avgPacketSize: 900,
                packetSizeStdDev: 300,
                avgInterPacketTime: 15,
                interPacketTimeStdDev: 10,
                clientToServerRatio: 0.45,
                burstiness: 0.3,
                category: 'voip',
                confidence: 0.85
            },
            {
                id: 'file-download',
                name: 'File Download',
                description: 'Large file transfer (download)',
                avgPacketSize: 1400,
                packetSizeStdDev: 100,
                avgInterPacketTime: 2,
                interPacketTimeStdDev: 3,
                clientToServerRatio: 0.02,
                burstiness: 0.1,
                category: 'file_transfer',
                confidence: 0.8
            },
            {
                id: 'file-upload',
                name: 'File Upload',
                description: 'Large file transfer (upload)',
                avgPacketSize: 1400,
                packetSizeStdDev: 100,
                avgInterPacketTime: 2,
                interPacketTimeStdDev: 3,
                clientToServerRatio: 0.98,
                burstiness: 0.1,
                category: 'file_transfer',
                confidence: 0.8
            },
            {
                id: 'instant-messaging',
                name: 'Instant Messaging',
                description: 'Chat applications (WhatsApp, Signal)',
                avgPacketSize: 300,
                packetSizeStdDev: 200,
                avgInterPacketTime: 5000,
                interPacketTimeStdDev: 10000,
                clientToServerRatio: 0.4,
                burstiness: 0.9,
                category: 'messaging',
                confidence: 0.75
            },
            {
                id: 'ssh-interactive',
                name: 'SSH Interactive',
                description: 'Interactive SSH session',
                avgPacketSize: 100,
                packetSizeStdDev: 80,
                avgInterPacketTime: 500,
                interPacketTimeStdDev: 1000,
                clientToServerRatio: 0.6,
                burstiness: 0.8,
                category: 'remote_access',
                confidence: 0.7
            }
        ];
        patterns.forEach(p => this.knownPatterns.set(p.id, p));
    }
    /**
     * Start a new traffic session
     */
    startSession(sessionId) {
        const id = sessionId || (0, uuid_1.v4)();
        this.sessions.set(id, {
            id,
            startTime: new Date(),
            packets: [],
            patterns: [],
            anomalies: []
        });
        return id;
    }
    /**
     * Add packet to session
     */
    addPacket(sessionId, packet) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return;
        session.packets.push(packet);
        // Analyze periodically
        if (session.packets.length % 50 === 0) {
            session.patterns = this.matchPatterns(session.packets);
            session.anomalies = this.detectAnomalies(session.packets);
        }
    }
    /**
     * End session and get final analysis
     */
    endSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        session.endTime = new Date();
        session.patterns = this.matchPatterns(session.packets);
        session.anomalies = this.detectAnomalies(session.packets);
        return session;
    }
    /**
     * Match traffic against known patterns
     */
    matchPatterns(packets) {
        if (packets.length < 10)
            return [];
        const features = this.extractFeatures(packets);
        const matches = [];
        for (const pattern of this.knownPatterns.values()) {
            const score = this.calculatePatternScore(features, pattern);
            const matchedFeatures = [];
            // Check which features matched
            if (Math.abs(features.avgSize - pattern.avgPacketSize) < pattern.avgPacketSize * 0.3) {
                matchedFeatures.push('packet_size');
            }
            if (Math.abs(features.avgInterval - pattern.avgInterPacketTime) < pattern.avgInterPacketTime * 0.5) {
                matchedFeatures.push('timing');
            }
            if (Math.abs(features.c2sRatio - pattern.clientToServerRatio) < 0.2) {
                matchedFeatures.push('direction_ratio');
            }
            if (Math.abs(features.burstiness - pattern.burstiness) < 0.3) {
                matchedFeatures.push('burstiness');
            }
            if (score > 0.5) {
                matches.push({
                    patternId: pattern.id,
                    patternName: pattern.name,
                    score,
                    confidence: score * pattern.confidence,
                    matchedFeatures
                });
            }
        }
        return matches.sort((a, b) => b.score - a.score);
    }
    /**
     * Extract traffic features
     */
    extractFeatures(packets) {
        const sizes = packets.map(p => p.size);
        const c2sCount = packets.filter(p => p.direction === 'c2s').length;
        // Calculate intervals
        const intervals = [];
        for (let i = 1; i < packets.length; i++) {
            intervals.push(packets[i].timestamp.getTime() - packets[i - 1].timestamp.getTime());
        }
        const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
        const sizeStd = this.stdDev(sizes);
        const avgInterval = intervals.length > 0
            ? intervals.reduce((a, b) => a + b, 0) / intervals.length
            : 0;
        const intervalStd = this.stdDev(intervals);
        // Calculate burstiness (coefficient of variation of intervals)
        const burstiness = avgInterval > 0 ? intervalStd / avgInterval : 0;
        return {
            avgSize,
            sizeStd,
            avgInterval,
            intervalStd,
            c2sRatio: c2sCount / packets.length,
            burstiness: Math.min(1, burstiness)
        };
    }
    /**
     * Calculate pattern match score
     */
    calculatePatternScore(features, pattern) {
        let score = 0;
        let weights = 0;
        // Size similarity (weight: 0.3)
        const sizeDiff = Math.abs(features.avgSize - pattern.avgPacketSize) / pattern.avgPacketSize;
        score += (1 - Math.min(1, sizeDiff)) * 0.3;
        weights += 0.3;
        // Interval similarity (weight: 0.25)
        if (pattern.avgInterPacketTime > 0) {
            const intervalDiff = Math.abs(features.avgInterval - pattern.avgInterPacketTime) / pattern.avgInterPacketTime;
            score += (1 - Math.min(1, intervalDiff)) * 0.25;
        }
        weights += 0.25;
        // Direction ratio similarity (weight: 0.25)
        const ratioDiff = Math.abs(features.c2sRatio - pattern.clientToServerRatio);
        score += (1 - Math.min(1, ratioDiff * 2)) * 0.25;
        weights += 0.25;
        // Burstiness similarity (weight: 0.2)
        const burstDiff = Math.abs(features.burstiness - pattern.burstiness);
        score += (1 - Math.min(1, burstDiff * 2)) * 0.2;
        weights += 0.2;
        return score / weights;
    }
    /**
     * Detect anomalies in traffic
     */
    detectAnomalies(packets) {
        const anomalies = [];
        if (packets.length < 10)
            return anomalies;
        const features = this.extractFeatures(packets);
        // Check for unusual patterns
        if (features.c2sRatio > 0.95) {
            anomalies.push('Highly asymmetric traffic (mostly outbound) - possible data exfiltration');
        }
        if (features.c2sRatio < 0.05) {
            anomalies.push('Highly asymmetric traffic (mostly inbound) - possible large download');
        }
        if (features.burstiness > 0.9 && features.avgInterval > 10000) {
            anomalies.push('Highly bursty traffic with long gaps - possible covert channel');
        }
        if (features.avgSize < 100 && features.sizeStd < 20) {
            anomalies.push('Small fixed-size packets - possible beaconing');
        }
        // Check for timing regularity (beaconing)
        const intervals = [];
        for (let i = 1; i < packets.length; i++) {
            intervals.push(packets[i].timestamp.getTime() - packets[i - 1].timestamp.getTime());
        }
        if (intervals.length > 10) {
            const cv = this.stdDev(intervals) / (features.avgInterval + 1);
            if (cv < 0.1 && features.avgInterval > 1000) {
                anomalies.push(`Regular timing detected (CV=${cv.toFixed(3)}) - possible automated communication`);
            }
        }
        return anomalies;
    }
    stdDev(values) {
        if (values.length === 0)
            return 0;
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        const sqDiffs = values.map(v => Math.pow(v - mean, 2));
        return Math.sqrt(sqDiffs.reduce((a, b) => a + b, 0) / values.length);
    }
    /**
     * Generate simulated traffic for training
     */
    generateSimulatedSession(patternId, durationSec) {
        const pattern = this.knownPatterns.get(patternId);
        if (!pattern) {
            throw new Error(`Unknown pattern: ${patternId}`);
        }
        const sessionId = this.startSession();
        const session = this.sessions.get(sessionId);
        let currentTime = session.startTime.getTime();
        const endTime = currentTime + durationSec * 1000;
        while (currentTime < endTime) {
            // Generate packet based on pattern
            const isC2S = Math.random() < pattern.clientToServerRatio;
            // Add some variance
            const size = Math.max(64, Math.round(pattern.avgPacketSize + (Math.random() - 0.5) * 2 * pattern.packetSizeStdDev));
            const interval = Math.max(1, Math.round(pattern.avgInterPacketTime + (Math.random() - 0.5) * 2 * pattern.interPacketTimeStdDev));
            session.packets.push({
                timestamp: new Date(currentTime),
                size,
                direction: isC2S ? 'c2s' : 's2c'
            });
            currentTime += interval;
        }
        return this.endSession(sessionId);
    }
    getPatterns() {
        return Array.from(this.knownPatterns.values());
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
}
exports.TrafficPatternAnalyzer = TrafficPatternAnalyzer;
