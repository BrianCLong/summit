"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.networkSecurityService = exports.NetworkSecurityService = void 0;
const traffic_js_1 = require("../anomaly/detectors/traffic.js");
const events_1 = require("events");
/**
 * Service for network security monitoring and anomaly detection.
 * Orchestrates traffic analysis using TrafficDetector.
 */
class NetworkSecurityService extends events_1.EventEmitter {
    static instance;
    detector;
    isRunning = false;
    // Buffer to hold flows for batch analysis
    flowBuffer = [];
    BATCH_SIZE = 100;
    BATCH_INTERVAL_MS = 5000;
    flushTimer = null;
    constructor() {
        super();
        this.detector = new traffic_js_1.TrafficDetector();
        this.startLoop();
    }
    static getInstance() {
        if (!NetworkSecurityService.instance) {
            NetworkSecurityService.instance = new NetworkSecurityService();
        }
        return NetworkSecurityService.instance;
    }
    /**
     * Ingest a traffic flow for analysis
     */
    ingestFlow(flow) {
        this.flowBuffer.push(flow);
        if (this.flowBuffer.length >= this.BATCH_SIZE) {
            this.flushBuffer();
        }
    }
    /**
     * Ingest multiple flows
     */
    ingestFlows(flows) {
        this.flowBuffer.push(...flows);
        if (this.flowBuffer.length >= this.BATCH_SIZE) {
            this.flushBuffer();
        }
    }
    /**
     * Manually trigger analysis on current buffer
     */
    async analyzeNow() {
        return this.flushBuffer();
    }
    startLoop() {
        this.isRunning = true;
        this.flushTimer = setInterval(() => {
            if (this.flowBuffer.length > 0) {
                this.flushBuffer();
            }
        }, this.BATCH_INTERVAL_MS);
    }
    stop() {
        this.isRunning = false;
        if (this.flushTimer) {
            clearInterval(this.flushTimer);
            this.flushTimer = null;
        }
    }
    async flushBuffer() {
        if (this.flowBuffer.length === 0)
            return null;
        const batch = [...this.flowBuffer];
        this.flowBuffer = []; // Clear buffer
        try {
            const result = await this.detector.detect({
                type: 'network', // AnomalyType.NETWORK
                entityId: 'network-monitor',
                timestamp: Date.now(),
                data: { flows: batch }
            });
            if (result.isAnomaly) {
                this.handleAnomaly(result);
            }
            return result;
        }
        catch (error) {
            console.error('Error analyzing traffic batch:', error);
            return null;
        }
    }
    handleAnomaly(result) {
        // Log anomaly
        // console.warn('Network Anomaly Detected:', JSON.stringify(result, null, 2));
        // Emit event for other systems (e.g., alerting, blocking)
        this.emit('anomaly', result);
        // In a real system, we might trigger automated mitigation here
        // e.g., block IP via firewall API
    }
    /**
     * Helper to generate mock traffic for testing/demo
     */
    generateMockTraffic(count = 50, malicious = false) {
        const flows = [];
        const now = Date.now();
        for (let i = 0; i < count; i++) {
            const isAttack = malicious && i % 5 === 0; // 20% malicious if flag set
            flows.push({
                flowId: `flow-${now}-${i}`,
                sourceIp: isAttack ? '192.168.1.666' : `10.0.0.${Math.floor(Math.random() * 255)}`,
                destIp: '10.0.0.1', // Server
                sourcePort: Math.floor(Math.random() * 60000) + 1024,
                destPort: 80,
                protocol: 'TCP',
                bytes: isAttack ? 100000 : Math.floor(Math.random() * 1000) + 50,
                packets: isAttack ? 1000 : Math.floor(Math.random() * 20) + 5,
                startTime: now,
                endTime: now + (isAttack ? 100 : Math.random() * 1000), // Attacks might be short burst or long
                flags: isAttack ? ['SYN', 'FIN'] : ['SYN', 'ACK'], // Invalid flags for attack
                payloadHints: isAttack ? ['union select 1'] : ['GET / HTTP/1.1']
            });
        }
        return flows;
    }
}
exports.NetworkSecurityService = NetworkSecurityService;
exports.networkSecurityService = NetworkSecurityService.getInstance();
