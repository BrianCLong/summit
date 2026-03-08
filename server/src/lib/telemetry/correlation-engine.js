"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlationEngine = void 0;
class CorrelationEngine {
    static instance;
    logBuffer = [];
    MAX_LOGS = 5000;
    bufferIndex = 0;
    isBufferFull = false;
    constructor() { }
    static getInstance() {
        if (!CorrelationEngine.instance) {
            CorrelationEngine.instance = new CorrelationEngine();
        }
        return CorrelationEngine.instance;
    }
    ingestLog(entry) {
        let timestamp = entry.time || entry.timestamp || Date.now();
        if (typeof timestamp === 'string') {
            timestamp = new Date(timestamp).getTime();
        }
        // Normalize entry
        const logEntry = {
            ...entry,
            timestamp,
            level: typeof entry.level === 'number' ? this.pinoLevelToString(entry.level) : (entry.level || 'info'),
            message: entry.msg || entry.message || '',
        };
        // Ring buffer implementation
        if (this.logBuffer.length < this.MAX_LOGS) {
            this.logBuffer.push(logEntry);
        }
        else {
            this.logBuffer[this.bufferIndex] = logEntry;
            this.isBufferFull = true;
        }
        this.bufferIndex = (this.bufferIndex + 1) % this.MAX_LOGS;
    }
    pinoLevelToString(level) {
        if (level >= 60)
            return 'fatal';
        if (level >= 50)
            return 'error';
        if (level >= 40)
            return 'warn';
        if (level >= 30)
            return 'info';
        if (level >= 20)
            return 'debug';
        return 'trace';
    }
    analyze(metricName, windowSeconds = 60) {
        const now = Date.now();
        const startTime = now - (windowSeconds * 1000);
        // Filter logs in window
        const windowLogs = this.logBuffer.filter(l => l.timestamp >= startTime && l.timestamp <= now);
        // Extract unique Trace IDs from these logs to identify "related traces"
        const traceIds = new Set();
        windowLogs.forEach(l => {
            if (l.traceId)
                traceIds.add(l.traceId);
            if (l.correlationId)
                traceIds.add(l.correlationId);
        });
        // Capture basic metrics context
        const metricsContext = {
            system: {
                memory: process.memoryUsage(),
                cpu: process.cpuUsage(),
                uptime: process.uptime()
            }
        };
        return {
            timestamp: now,
            triggerMetric: metricName,
            windowStart: startTime,
            windowEnd: now,
            logs: windowLogs,
            relatedTraces: Array.from(traceIds),
            metricsContext
        };
    }
}
exports.correlationEngine = CorrelationEngine.getInstance();
