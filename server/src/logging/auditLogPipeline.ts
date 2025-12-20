// @ts-nocheck
import fs from 'fs';
import path from 'path';
import pino, { type Logger } from 'pino';
import { logEventBus, LogEventBus, type LogEvent } from './logEventBus.js';
import { scheduleRetention, type RetentionPolicy } from './logRetention.js';
import type { LogAlertEngine, LogAlert } from './logAlertEngine.js';

export interface AuditMetadata {
  action?: string;
  resource?: string;
  resourceType?: string;
  outcome?: string;
  classification?: string;
  compliance?: string[];
  ip?: string;
  userAgent?: string;
}

export interface AuditLogRecord extends LogEvent {
  stream: string;
  receivedAt: string;
  audit?: AuditMetadata;
}

export interface AuditLogDashboardSnapshot {
  stream: string;
  metrics: {
    totalEvents: number;
    perLevel: Record<string, number>;
    perTenant: Record<string, number>;
    compliance: Record<string, number>;
  };
  recentEvents: AuditLogRecord[];
  alerts: LogAlert[];
  retention: RetentionPolicy;
}

export interface AuditLogPipelineOptions {
  logDir?: string;
  streamName?: string;
  bus?: LogEventBus;
  alertEngine?: LogAlertEngine;
  retentionPolicy?: RetentionPolicy;
  maxRecent?: number;
  logger?: Logger;
}

const defaultRetention = (directory: string): RetentionPolicy => ({
  directory,
  retentionDays: Number(process.env.AUDIT_LOG_RETENTION_DAYS ?? '180'),
  compressAfterDays: Number(process.env.AUDIT_LOG_COMPRESS_AFTER_DAYS ?? '7'),
  maxTotalSizeMb: Number(process.env.AUDIT_LOG_TOTAL_SIZE_MB ?? '4096'),
});

export class AuditLogPipeline {
  private readonly streamName: string;
  private readonly logDirectory: string;
  private readonly logFilePath: string;
  private readonly recentEvents: AuditLogRecord[] = [];
  private readonly perLevel: Record<string, number> = {};
  private readonly perTenant: Record<string, number> = {};
  private readonly complianceCounts: Record<string, number> = {};
  private totalEvents = 0;
  private readonly unsubscribe: () => void;
  private readonly stopRetention: () => void;
  private readonly maxRecent: number;
  private readonly logger: Logger;

  constructor(private readonly options: AuditLogPipelineOptions = {}) {
    this.streamName = options.streamName ?? process.env.AUDIT_LOG_STREAM ?? 'audit-log';
    this.logDirectory = options.logDir ?? process.env.AUDIT_LOG_DIR ?? path.join(process.cwd(), 'logs', 'audit');
    this.maxRecent = options.maxRecent ?? 200;

    fs.mkdirSync(this.logDirectory, { recursive: true });
    this.logFilePath = path.join(this.logDirectory, `${this.streamName}.jsonl`);

    this.logger =
      options.logger ??
      pino({
        name: 'audit-log-pipeline',
        level: process.env.LOG_LEVEL || 'info',
      });

    const retentionPolicy = options.retentionPolicy ?? defaultRetention(this.logDirectory);
    this.stopRetention = scheduleRetention(retentionPolicy, this.logger);

    const bus = options.bus ?? logEventBus;
    this.unsubscribe = bus.subscribe((event) => this.handleEvent(event));
  }

  stop(): void {
    this.unsubscribe();
    this.stopRetention();
  }

  getDashboardSnapshot(): AuditLogDashboardSnapshot {
    const retentionPolicy = this.options.retentionPolicy ?? defaultRetention(this.logDirectory);
    return {
      stream: this.streamName,
      metrics: {
        totalEvents: this.totalEvents,
        perLevel: { ...this.perLevel },
        perTenant: { ...this.perTenant },
        compliance: { ...this.complianceCounts },
      },
      recentEvents: [...this.recentEvents].reverse(),
      alerts: this.options.alertEngine?.getRecentAlerts() ?? [],
      retention: retentionPolicy,
    };
  }

  private handleEvent(event: LogEvent): void {
    const record: AuditLogRecord = {
      ...event,
      stream: this.streamName,
      receivedAt: new Date().toISOString(),
      audit: this.extractAuditMetadata(event.context ?? {}),
    };

    this.trackMetrics(record);
    this.persist(record).catch((error) => {
      this.logger.error({ error }, 'Failed to persist audit log record');
    });
  }

  private extractAuditMetadata(context: Record<string, unknown>): AuditMetadata {
    const audit = (context.audit as Record<string, unknown>) ?? {};
    const compliance = (context.compliance as string[]) ?? [];

    return {
      action: (audit.action as string) ?? (context.action as string),
      resource: (audit.resource as string) ?? (context.resource as string),
      resourceType: (audit.resourceType as string) ?? (context.resourceType as string),
      outcome: (audit.outcome as string) ?? (context.outcome as string),
      classification: (audit.classification as string) ?? (context.classification as string),
      compliance: Array.isArray(compliance) ? compliance.filter(Boolean) : undefined,
      ip: (audit.ip as string) ?? (context.ip as string),
      userAgent: (audit.userAgent as string) ?? (context.userAgent as string),
    };
  }

  private trackMetrics(record: AuditLogRecord): void {
    this.totalEvents += 1;
    this.perLevel[record.level] = (this.perLevel[record.level] ?? 0) + 1;

    if (record.tenantId) {
      this.perTenant[record.tenantId] = (this.perTenant[record.tenantId] ?? 0) + 1;
    }

    record.audit?.compliance?.forEach((framework) => {
      this.complianceCounts[framework] = (this.complianceCounts[framework] ?? 0) + 1;
    });

    this.recentEvents.push(record);
    if (this.recentEvents.length > this.maxRecent) {
      this.recentEvents.shift();
    }
  }

  private async persist(record: AuditLogRecord): Promise<void> {
    const serialized = JSON.stringify(record);
    await fs.promises.appendFile(this.logFilePath, `${serialized}\n`, 'utf8');
  }
}
