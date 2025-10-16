import * as fs from 'fs';
import * as path from 'path';

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
}

export async function getLogs(
  logPath: string = process.env.LOG_PATH || './logs',
  maxLines: number = 10000,
): Promise<string> {
  try {
    // In production, this would connect to your logging infrastructure
    // For testing, we'll read from local log files or mock data

    if (fs.existsSync(logPath)) {
      const files = fs
        .readdirSync(logPath)
        .filter((f) => f.endsWith('.log'))
        .sort()
        .reverse(); // Most recent first

      let allLogs = '';
      let lineCount = 0;

      for (const file of files) {
        if (lineCount >= maxLines) break;

        const filePath = path.join(logPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n').slice(0, maxLines - lineCount);

        allLogs += lines.join('\n') + '\n';
        lineCount += lines.length;
      }

      return allLogs;
    } else {
      // Return mock logs for testing
      return generateMockLogs();
    }
  } catch (error) {
    console.warn('Failed to read logs, using mock data:', error);
    return generateMockLogs();
  }
}

function generateMockLogs(): string {
  const mockEntries: LogEntry[] = [
    {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message: 'User authenticated successfully',
      metadata: {
        userId: 'user-123',
        tenantId: 'tenant-456',
        // Note: email should be scrubbed from actual logs
        ipAddress: '10.0.0.1',
      },
    },
    {
      timestamp: new Date().toISOString(),
      level: 'DEBUG',
      message: 'Database query executed',
      metadata: {
        query: 'SELECT * FROM events WHERE tenant_id = ?',
        duration: '45ms',
        // Note: parameters should be scrubbed
      },
    },
    {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message: 'Authentication failed',
      metadata: {
        reason: 'invalid_token',
        // Note: no sensitive token data should appear
        ipAddress: '192.168.1.100',
      },
    },
  ];

  return mockEntries.map((entry) => JSON.stringify(entry)).join('\n');
}

export async function getMetrics(
  metricsEndpoint: string = 'http://localhost:9090/metrics',
): Promise<string> {
  try {
    // In production, this would fetch from Prometheus
    const response = await fetch(metricsEndpoint);
    return await response.text();
  } catch (error) {
    console.warn('Failed to fetch metrics, using mock data:', error);
    return generateMockMetrics();
  }
}

function generateMockMetrics(): string {
  return `
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1000
http_requests_total{method="POST",status="200"} 500
http_requests_total{method="POST",status="400"} 50

# HELP neo4j_bolt_connections_total Total Neo4j Bolt connections
# TYPE neo4j_bolt_connections_total gauge
neo4j_bolt_connections_total{instance="neo4j-core-0"} 25

# HELP redis_connected_clients Number of Redis connected clients
# TYPE redis_connected_clients gauge
redis_connected_clients{instance="redis-master"} 42
`.trim();
}

export class PrivacyValidator {
  private static readonly PII_PATTERNS = [
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
    /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
    /\b(?:password|pwd|secret|token|key)[:=]\s*[\w\d\-_.@$#!%^&*()]+/gi, // Secrets
    /authorization:\s*bearer\s+[\w\d\-_.]+/gi, // Auth tokens
  ];

  public static validateNoPII(content: string): {
    valid: boolean;
    violations: string[];
  } {
    const violations: string[] = [];

    for (const pattern of this.PII_PATTERNS) {
      const matches = content.match(pattern);
      if (matches) {
        violations.push(
          ...matches.map(
            (match) => `PII detected: ${match.substring(0, 20)}...`,
          ),
        );
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  public static scrubPII(content: string): string {
    let scrubbed = content;

    // Replace emails with [EMAIL_REDACTED]
    scrubbed = scrubbed.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL_REDACTED]',
    );

    // Replace SSNs with [SSN_REDACTED]
    scrubbed = scrubbed.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN_REDACTED]');

    // Replace credit cards with [CC_REDACTED]
    scrubbed = scrubbed.replace(
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      '[CC_REDACTED]',
    );

    // Replace passwords/secrets
    scrubbed = scrubbed.replace(
      /\b(?:password|pwd|secret|token|key)[:=]\s*[\w\d\-_.@$#!%^&*()]+/gi,
      (match) => match.split(/[:=]/)[0] + '=[REDACTED]',
    );

    return scrubbed;
  }
}
