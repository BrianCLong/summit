export interface LogEntry {
  timestamp: number;
  level: string;
  message: string;
  traceId?: string;
  spanId?: string;
  correlationId?: string;
  [key: string]: any;
}

export interface CorrelationReport {
  timestamp: number;
  triggerMetric: string;
  windowStart: number;
  windowEnd: number;
  logs: LogEntry[];
  relatedTraces: string[];
  metricsContext: any;
}

class CorrelationEngine {
  private static instance: CorrelationEngine;
  private logBuffer: LogEntry[] = [];
  private readonly MAX_LOGS = 5000;

  private constructor() {}

  public static getInstance(): CorrelationEngine {
    if (!CorrelationEngine.instance) {
      CorrelationEngine.instance = new CorrelationEngine();
    }
    return CorrelationEngine.instance;
  }

  public ingestLog(entry: any) {
    let timestamp = entry.time || entry.timestamp || Date.now();
    if (typeof timestamp === 'string') {
        timestamp = new Date(timestamp).getTime();
    }

    // Normalize entry
    const logEntry: LogEntry = {
        ...entry,
        timestamp,
        level: typeof entry.level === 'number' ? this.pinoLevelToString(entry.level) : (entry.level || 'info'),
        message: entry.msg || entry.message || '',
    };

    this.logBuffer.push(logEntry);
    if (this.logBuffer.length > this.MAX_LOGS) {
      this.logBuffer.shift();
    }
  }

  private pinoLevelToString(level: number): string {
      if (level >= 60) return 'fatal';
      if (level >= 50) return 'error';
      if (level >= 40) return 'warn';
      if (level >= 30) return 'info';
      if (level >= 20) return 'debug';
      return 'trace';
  }

  public analyze(metricName: string, windowSeconds: number = 60): CorrelationReport {
    const now = Date.now();
    const startTime = now - (windowSeconds * 1000);

    // Filter logs in window
    const windowLogs = this.logBuffer.filter(l => l.timestamp >= startTime && l.timestamp <= now);

    // Extract unique Trace IDs from these logs to identify "related traces"
    const traceIds = new Set<string>();
    windowLogs.forEach(l => {
        if (l.traceId) traceIds.add(l.traceId);
        if (l.correlationId) traceIds.add(l.correlationId);
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

export const correlationEngine = CorrelationEngine.getInstance();
