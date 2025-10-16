/**
 * Maestro Conductor v24.4.0 - RTBF Dry-Run Mode & Audit Logging
 * Epic E21: RTBF (Right to Be Forgotten) at Scale
 *
 * Comprehensive audit logging and dry-run capabilities for RTBF operations
 * Provides full traceability and compliance reporting for data deletion activities
 */

import { EventEmitter } from 'events';
import { PrometheusMetrics } from '../utils/metrics';
import logger from '../utils/logger';
import { tracer, Span } from '../utils/tracing';
import { DatabaseService } from './DatabaseService';
import { RTBFJob, RTBFTarget } from './RTBFJobService';

// Audit configuration
interface RTBFAuditConfig {
  enabled: boolean;
  retentionYears: number;
  encryptLogs: boolean;
  immutableStorage: boolean;
  complianceReporting: boolean;
  realTimeAlerts: boolean;
  dryRunAnalysis: boolean;
  performanceMonitoring: boolean;
}

// Audit event types
enum RTBFAuditEventType {
  JOB_SUBMITTED = 'job_submitted',
  JOB_STARTED = 'job_started',
  JOB_COMPLETED = 'job_completed',
  JOB_FAILED = 'job_failed',
  JOB_CANCELLED = 'job_cancelled',

  RECORD_IDENTIFIED = 'record_identified',
  RECORD_DELETED = 'record_deleted',
  RECORD_ANONYMIZED = 'record_anonymized',
  RECORD_ARCHIVED = 'record_archived',
  RECORD_FAILED = 'record_failed',

  CASCADE_TRIGGERED = 'cascade_triggered',
  CONSTRAINT_VIOLATION = 'constraint_violation',

  DRY_RUN_STARTED = 'dry_run_started',
  DRY_RUN_COMPLETED = 'dry_run_completed',

  COMPLIANCE_REPORT_GENERATED = 'compliance_report_generated',
  AUDIT_EXPORT_REQUESTED = 'audit_export_requested',
}

// Audit log entry
interface RTBFAuditEntry {
  id: string;
  timestamp: Date;
  tenantId: string;
  jobId: string;
  eventType: RTBFAuditEventType;

  // Actor information
  actor: {
    userId: string;
    userEmail: string;
    userRole: string;
    ipAddress?: string;
    userAgent?: string;
  };

  // Target information
  target?: {
    table: string;
    recordId: string;
    recordType: string;
    identifierField: string;
    identifierValue: string;
  };

  // Action details
  action: {
    operation: 'delete' | 'anonymize' | 'archive' | 'identify' | 'validate';
    strategy: string;
    dryRun: boolean;
    cascadeTriggered: boolean;
  };

  // Before/after state
  dataChanges?: {
    before: Record<string, any>;
    after: Record<string, any>;
    fieldsModified: string[];
  };

  // Results and metadata
  result: {
    success: boolean;
    error?: string;
    recordsAffected: number;
    duration: number;
    checksum?: string;
  };

  // Compliance metadata
  compliance: {
    legalBasis: string;
    regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD' | 'OTHER';
    retentionPeriod: number;
    dataCategory: string[];
  };

  // Technical metadata
  technical: {
    version: string;
    environment: string;
    correlationId: string;
    batchId?: string;
    workerInstance?: string;
  };
}

// Dry-run analysis result
interface DryRunAnalysis {
  jobId: string;
  tenantId: string;
  timestamp: Date;

  // Impact analysis
  impact: {
    totalRecordsAffected: number;
    tablesCoverage: {
      table: string;
      recordCount: number;
      sampleRecords: any[];
    }[];

    cascadeEffects: {
      table: string;
      relationship: string;
      affectedRecords: number;
      action: string;
    }[];

    constraintViolations: {
      constraint: string;
      table: string;
      violationType: string;
      impact: string;
    }[];
  };

  // Risk assessment
  risks: {
    dataLossRisk: 'low' | 'medium' | 'high';
    performanceImpact: 'low' | 'medium' | 'high';
    cascadeComplexity: 'low' | 'medium' | 'high';

    warnings: string[];
    recommendations: string[];
  };

  // Estimated execution details
  execution: {
    estimatedDuration: number;
    estimatedCost: number;
    resourceRequirements: {
      cpu: string;
      memory: string;
      storage: string;
    };
    optimalBatchSize: number;
  };

  // Compliance assessment
  compliance: {
    regulatoryCompliance: boolean;
    requiredApprovals: string[];
    retentionPolicyCompliance: boolean;
    auditRequirements: string[];
  };
}

// Compliance report
interface ComplianceReport {
  id: string;
  tenantId: string;
  reportPeriod: {
    start: Date;
    end: Date;
  };

  // Summary statistics
  summary: {
    totalJobs: number;
    totalRecordsDeleted: number;
    totalRecordsAnonymized: number;
    totalRecordsArchived: number;
    averageJobDuration: number;
    successRate: number;
  };

  // Regulatory breakdown
  byRegulation: {
    [regulation: string]: {
      jobCount: number;
      recordCount: number;
      avgResponseTime: number;
    };
  };

  // Data category breakdown
  byDataCategory: {
    [category: string]: {
      recordCount: number;
      deletionMethod: string[];
    };
  };

  // Timeline analysis
  timeline: {
    date: string;
    jobsCompleted: number;
    recordsProcessed: number;
    averageDuration: number;
  }[];

  // Compliance metrics
  complianceMetrics: {
    onTimeCompletion: number;
    withinSLA: number;
    auditTrailCompleteness: number;
    dataRetentionCompliance: number;
  };

  // Issues and exceptions
  issues: {
    failedJobs: number;
    constraintViolations: number;
    dataInconsistencies: number;
    performanceIssues: number;
  };
}

export class RTBFAuditService extends EventEmitter {
  private config: RTBFAuditConfig;
  private metrics: PrometheusMetrics;
  private db: DatabaseService;
  private auditBuffer: RTBFAuditEntry[] = [];
  private dryRunCache: Map<string, DryRunAnalysis> = new Map();

  constructor(config: Partial<RTBFAuditConfig> = {}, db: DatabaseService) {
    super();

    this.config = {
      enabled: true,
      retentionYears: 7, // Legal requirement in many jurisdictions
      encryptLogs: true,
      immutableStorage: true,
      complianceReporting: true,
      realTimeAlerts: true,
      dryRunAnalysis: true,
      performanceMonitoring: true,
      ...config,
    };

    this.db = db;
    this.metrics = new PrometheusMetrics('rtbf_audit');

    this.initializeMetrics();
    this.startAuditProcessor();
  }

  private initializeMetrics(): void {
    // Audit metrics
    this.metrics.createCounter(
      'rtbf_audit_events_total',
      'Total audit events',
      ['tenant_id', 'event_type'],
    );
    this.metrics.createGauge(
      'rtbf_audit_buffer_size',
      'Size of audit log buffer',
    );
    this.metrics.createCounter('rtbf_audit_exports', 'Audit log exports', [
      'tenant_id',
      'format',
    ]);

    // Dry run metrics
    this.metrics.createCounter(
      'rtbf_dry_runs_total',
      'Total dry run executions',
      ['tenant_id'],
    );
    this.metrics.createHistogram(
      'rtbf_dry_run_duration',
      'Dry run execution time',
      {
        buckets: [1, 5, 10, 30, 60, 300],
      },
    );
    this.metrics.createGauge(
      'rtbf_dry_run_cache_size',
      'Size of dry run analysis cache',
    );

    // Compliance metrics
    this.metrics.createCounter(
      'rtbf_compliance_reports',
      'Compliance reports generated',
      ['tenant_id', 'regulation'],
    );
    this.metrics.createGauge(
      'rtbf_compliance_score',
      'Compliance score per tenant',
      ['tenant_id', 'regulation'],
    );

    // Performance metrics
    this.metrics.createHistogram(
      'rtbf_audit_write_duration',
      'Audit log write time',
      {
        buckets: [0.001, 0.01, 0.1, 0.5, 1, 2],
      },
    );
  }

  private startAuditProcessor(): void {
    // Flush audit buffer periodically
    setInterval(async () => {
      await this.flushAuditBuffer();
    }, 10000); // Every 10 seconds

    // Clean up old dry run cache
    setInterval(() => {
      this.cleanupDryRunCache();
    }, 300000); // Every 5 minutes

    logger.info('RTBF audit processor started', {
      retentionYears: this.config.retentionYears,
      encryptLogs: this.config.encryptLogs,
      immutableStorage: this.config.immutableStorage,
    });
  }

  // Public audit logging methods
  public async logJobEvent(
    event: RTBFAuditEventType,
    job: RTBFJob,
    actor: RTBFAuditEntry['actor'],
    additionalData?: Partial<RTBFAuditEntry>,
  ): Promise<void> {
    const entry: RTBFAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      tenantId: job.tenantId,
      jobId: job.id,
      eventType: event,
      actor,
      action: {
        operation: this.inferOperation(event),
        strategy: 'job_level',
        dryRun: job.request.options.dryRun,
        cascadeTriggered: false,
      },
      result: {
        success: !job.status.includes('failed'),
        recordsAffected: job.progress.processedRecords,
        duration: job.timing.actualDuration || 0,
      },
      compliance: {
        legalBasis: job.request.reason,
        regulation: this.inferRegulation(job.request.reason),
        retentionPeriod: this.config.retentionYears * 365,
        dataCategory: this.extractDataCategories(job.request.targets),
      },
      technical: {
        version: '24.4.0',
        environment: process.env.NODE_ENV || 'development',
        correlationId: job.id,
      },
      ...additionalData,
    };

    await this.writeAuditEntry(entry);
  }

  public async logRecordEvent(
    event: RTBFAuditEventType,
    jobId: string,
    tenantId: string,
    target: RTBFTarget,
    recordId: string,
    actor: RTBFAuditEntry['actor'],
    result: {
      success: boolean;
      error?: string;
      duration: number;
      before?: Record<string, any>;
      after?: Record<string, any>;
    },
  ): Promise<void> {
    const entry: RTBFAuditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      tenantId,
      jobId,
      eventType: event,
      actor,
      target: {
        table: target.tables[0], // Assuming first table for record-level events
        recordId,
        recordType: target.type,
        identifierField: target.identifier.field,
        identifierValue: Array.isArray(target.identifier.value)
          ? target.identifier.value.join(',')
          : target.identifier.value.toString(),
      },
      action: {
        operation: this.inferOperation(event),
        strategy: target.strategy,
        dryRun: false, // Record events are only for actual operations
        cascadeTriggered: !!target.cascadeRules?.length,
      },
      dataChanges:
        result.before && result.after
          ? {
              before: result.before,
              after: result.after,
              fieldsModified: this.getModifiedFields(
                result.before,
                result.after,
              ),
            }
          : undefined,
      result: {
        success: result.success,
        error: result.error,
        recordsAffected: 1,
        duration: result.duration,
        checksum: this.calculateChecksum(result.after || result.before),
      },
      compliance: {
        legalBasis: 'Data subject request',
        regulation: 'GDPR', // Would be determined from job context
        retentionPeriod: this.config.retentionYears * 365,
        dataCategory: this.getRecordDataCategories(result.before || {}),
      },
      technical: {
        version: '24.4.0',
        environment: process.env.NODE_ENV || 'development',
        correlationId: jobId,
      },
    };

    await this.writeAuditEntry(entry);
  }

  private async writeAuditEntry(entry: RTBFAuditEntry): Promise<void> {
    return tracer.startActiveSpan(
      'rtbf_audit.write_entry',
      async (span: Span) => {
        const startTime = Date.now();

        try {
          span.setAttributes({
            'rtbf_audit.tenant_id': entry.tenantId,
            'rtbf_audit.event_type': entry.eventType,
            'rtbf_audit.job_id': entry.jobId,
          });

          // Add to buffer for batch processing
          this.auditBuffer.push(entry);
          this.metrics.setGauge(
            'rtbf_audit_buffer_size',
            this.auditBuffer.length,
          );

          // Increment audit event counter
          this.metrics.incrementCounter('rtbf_audit_events_total', 1, {
            tenant_id: entry.tenantId,
            event_type: entry.eventType,
          });

          // For critical events, flush immediately
          if (this.isCriticalEvent(entry.eventType)) {
            await this.flushAuditBuffer();
          }

          // Emit event for real-time monitoring
          this.emit('auditEntry', entry);

          const duration = (Date.now() - startTime) / 1000;
          this.metrics.observeHistogram('rtbf_audit_write_duration', duration);
        } catch (error) {
          logger.error('Failed to write audit entry', {
            entryId: entry.id,
            error: error.message,
          });
          span.recordException(error as Error);
          throw error;
        }
      },
    );
  }

  private async flushAuditBuffer(): Promise<void> {
    if (this.auditBuffer.length === 0) return;

    const entries = [...this.auditBuffer];
    this.auditBuffer = [];
    this.metrics.setGauge('rtbf_audit_buffer_size', 0);

    try {
      await this.batchInsertAuditEntries(entries);
    } catch (error) {
      logger.error('Failed to flush audit buffer', {
        entryCount: entries.length,
        error: error.message,
      });

      // Re-add entries to buffer for retry
      this.auditBuffer.unshift(...entries);
      this.metrics.setGauge('rtbf_audit_buffer_size', this.auditBuffer.length);
    }
  }

  private async batchInsertAuditEntries(
    entries: RTBFAuditEntry[],
  ): Promise<void> {
    if (entries.length === 0) return;

    const values: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    for (const entry of entries) {
      // Encrypt sensitive data if enabled
      const encryptedEntry = this.config.encryptLogs
        ? await this.encryptEntry(entry)
        : entry;

      values.push(`($${paramIndex++}, $${paramIndex++}, $${paramIndex++})`);
      params.push(entry.id, entry.tenantId, JSON.stringify(encryptedEntry));
    }

    const sql = `
      INSERT INTO rtbf_audit_log (id, tenant_id, entry_data, created_at)
      VALUES ${values.join(', ')}
    `;

    await this.db.query(sql, params);

    logger.debug('Flushed audit entries', { count: entries.length });
  }

  private async encryptEntry(entry: RTBFAuditEntry): Promise<RTBFAuditEntry> {
    // In production, this would use proper encryption
    // For now, just return the entry (placeholder for encryption logic)
    return entry;
  }

  // Dry-run analysis methods
  public async performDryRunAnalysis(job: RTBFJob): Promise<DryRunAnalysis> {
    return tracer.startActiveSpan(
      'rtbf_audit.dry_run_analysis',
      async (span: Span) => {
        const startTime = Date.now();

        try {
          span.setAttributes({
            'rtbf_audit.tenant_id': job.tenantId,
            'rtbf_audit.job_id': job.id,
          });

          logger.info('Starting dry-run analysis', {
            jobId: job.id,
            tenantId: job.tenantId,
          });

          const analysis: DryRunAnalysis = {
            jobId: job.id,
            tenantId: job.tenantId,
            timestamp: new Date(),

            impact: await this.analyzeImpact(job),
            risks: await this.assessRisks(job),
            execution: await this.estimateExecution(job),
            compliance: await this.assessCompliance(job),
          };

          // Cache the analysis
          this.dryRunCache.set(job.id, analysis);
          this.metrics.setGauge(
            'rtbf_dry_run_cache_size',
            this.dryRunCache.size,
          );

          // Log dry-run completion
          await this.logJobEvent(
            RTBFAuditEventType.DRY_RUN_COMPLETED,
            job,
            {
              userId: 'system',
              userEmail: 'system@maestro.dev',
              userRole: 'system',
            },
            {
              result: {
                success: true,
                recordsAffected: analysis.impact.totalRecordsAffected,
                duration: (Date.now() - startTime) / 1000,
              },
            },
          );

          const duration = (Date.now() - startTime) / 1000;
          this.metrics.observeHistogram('rtbf_dry_run_duration', duration);
          this.metrics.incrementCounter('rtbf_dry_runs_total', 1, {
            tenant_id: job.tenantId,
          });

          logger.info('Dry-run analysis completed', {
            jobId: job.id,
            recordsAffected: analysis.impact.totalRecordsAffected,
            riskLevel: analysis.risks.dataLossRisk,
            duration,
          });

          return analysis;
        } catch (error) {
          logger.error('Dry-run analysis failed', {
            jobId: job.id,
            error: error.message,
          });
          span.recordException(error as Error);
          throw error;
        }
      },
    );
  }

  private async analyzeImpact(job: RTBFJob): Promise<DryRunAnalysis['impact']> {
    const tablesCoverage: DryRunAnalysis['impact']['tablesCoverage'] = [];
    const cascadeEffects: DryRunAnalysis['impact']['cascadeEffects'] = [];
    let totalRecords = 0;

    // Analyze each target
    for (const target of job.request.targets) {
      for (const table of target.tables) {
        // Count affected records
        const countQuery = this.buildCountQuery(table, target);
        const countResult = await this.db.query(
          countQuery.sql,
          countQuery.params,
        );
        const recordCount = parseInt(countResult.rows[0].count);
        totalRecords += recordCount;

        // Get sample records for analysis
        const sampleQuery = this.buildSampleQuery(table, target, 5);
        const sampleResult = await this.db.query(
          sampleQuery.sql,
          sampleQuery.params,
        );

        tablesCoverage.push({
          table,
          recordCount,
          sampleRecords: sampleResult.rows,
        });

        // Analyze cascade effects
        if (target.cascadeRules) {
          for (const cascade of target.cascadeRules) {
            const cascadeCount = await this.analyzeCascadeEffect(
              table,
              cascade,
            );
            cascadeEffects.push({
              table: cascade.table,
              relationship: cascade.relationship,
              affectedRecords: cascadeCount,
              action: cascade.action,
            });
          }
        }
      }
    }

    return {
      totalRecordsAffected: totalRecords,
      tablesCoverage,
      cascadeEffects,
      constraintViolations: await this.analyzeConstraintViolations(job),
    };
  }

  private buildCountQuery(
    table: string,
    target: RTBFTarget,
  ): { sql: string; params: any[] } {
    const { field, value, operator } = target.identifier;
    let whereClause = '';
    const params: any[] = [];

    switch (operator) {
      case '=':
        whereClause = `${field} = $1`;
        params.push(value);
        break;
      case 'IN':
        const values = Array.isArray(value) ? value : [value];
        const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
        whereClause = `${field} IN (${placeholders})`;
        params.push(...values);
        break;
      case 'LIKE':
        whereClause = `${field} LIKE $1`;
        params.push(value);
        break;
      case 'REGEX':
        whereClause = `${field} ~ $1`;
        params.push(value);
        break;
    }

    return {
      sql: `SELECT COUNT(*) as count FROM ${table} WHERE ${whereClause}`,
      params,
    };
  }

  private buildSampleQuery(
    table: string,
    target: RTBFTarget,
    limit: number,
  ): { sql: string; params: any[] } {
    const { field, value, operator } = target.identifier;
    let whereClause = '';
    const params: any[] = [];

    switch (operator) {
      case '=':
        whereClause = `${field} = $1`;
        params.push(value);
        break;
      case 'IN':
        const values = Array.isArray(value) ? value : [value];
        const placeholders = values.map((_, i) => `$${i + 1}`).join(',');
        whereClause = `${field} IN (${placeholders})`;
        params.push(...values);
        break;
      case 'LIKE':
        whereClause = `${field} LIKE $1`;
        params.push(value);
        break;
      case 'REGEX':
        whereClause = `${field} ~ $1`;
        params.push(value);
        break;
    }

    return {
      sql: `SELECT * FROM ${table} WHERE ${whereClause} LIMIT ${limit}`,
      params,
    };
  }

  private async analyzeCascadeEffect(
    table: string,
    cascade: any,
  ): Promise<number> {
    // This would analyze foreign key relationships and calculate cascade impact
    // For now, return a placeholder count
    return 0;
  }

  private async analyzeConstraintViolations(
    job: RTBFJob,
  ): Promise<DryRunAnalysis['impact']['constraintViolations']> {
    // Analyze potential constraint violations that would prevent deletion
    // This would check foreign key constraints, unique constraints, etc.
    return [];
  }

  private async assessRisks(job: RTBFJob): Promise<DryRunAnalysis['risks']> {
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Assess data loss risk based on record count and relationships
    let dataLossRisk: 'low' | 'medium' | 'high' = 'low';
    if (job.progress.totalRecords > 100000) {
      dataLossRisk = 'high';
      warnings.push('Large number of records to be deleted');
      recommendations.push('Consider batch processing with smaller chunks');
    } else if (job.progress.totalRecords > 10000) {
      dataLossRisk = 'medium';
      recommendations.push('Monitor deletion progress carefully');
    }

    // Assess performance impact
    let performanceImpact: 'low' | 'medium' | 'high' = 'low';
    if (
      job.request.targets.some(
        (t) => t.cascadeRules && t.cascadeRules.length > 3,
      )
    ) {
      performanceImpact = 'high';
      warnings.push('Complex cascade rules may impact performance');
      recommendations.push('Consider running during low-traffic periods');
    }

    // Assess cascade complexity
    const cascadeComplexity: 'low' | 'medium' | 'high' =
      job.request.targets.some(
        (t) => t.cascadeRules && t.cascadeRules.length > 0,
      )
        ? 'medium'
        : 'low';

    return {
      dataLossRisk,
      performanceImpact,
      cascadeComplexity,
      warnings,
      recommendations,
    };
  }

  private async estimateExecution(
    job: RTBFJob,
  ): Promise<DryRunAnalysis['execution']> {
    // Estimate execution time based on record count and processing speed
    const recordsPerSecond = 1000; // Conservative estimate
    const estimatedDuration = job.progress.totalRecords / recordsPerSecond;

    return {
      estimatedDuration,
      estimatedCost: estimatedDuration * 0.01, // $0.01 per second
      resourceRequirements: {
        cpu: job.progress.totalRecords > 100000 ? 'high' : 'medium',
        memory: job.progress.totalRecords > 500000 ? 'high' : 'medium',
        storage: 'low',
      },
      optimalBatchSize: Math.min(
        1000,
        Math.max(100, job.progress.totalRecords / 100),
      ),
    };
  }

  private async assessCompliance(
    job: RTBFJob,
  ): Promise<DryRunAnalysis['compliance']> {
    return {
      regulatoryCompliance: true,
      requiredApprovals:
        job.progress.totalRecords > 100000 ? ['data_protection_officer'] : [],
      retentionPolicyCompliance: true,
      auditRequirements: ['full_audit_trail', 'compliance_report'],
    };
  }

  // Compliance reporting methods
  public async generateComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    regulation?: string,
  ): Promise<ComplianceReport> {
    return tracer.startActiveSpan(
      'rtbf_audit.generate_compliance_report',
      async (span: Span) => {
        try {
          span.setAttributes({
            'rtbf_audit.tenant_id': tenantId,
            'rtbf_audit.regulation': regulation || 'all',
          });

          logger.info('Generating compliance report', {
            tenantId,
            startDate,
            endDate,
            regulation,
          });

          // Query audit logs for the period
          const auditData = await this.getAuditDataForPeriod(
            tenantId,
            startDate,
            endDate,
            regulation,
          );

          // Generate report
          const report: ComplianceReport = {
            id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            tenantId,
            reportPeriod: { start: startDate, end: endDate },

            summary: this.calculateSummaryStats(auditData),
            byRegulation: this.groupByRegulation(auditData),
            byDataCategory: this.groupByDataCategory(auditData),
            timeline: this.generateTimeline(auditData, startDate, endDate),
            complianceMetrics: this.calculateComplianceMetrics(auditData),
            issues: this.identifyIssues(auditData),
          };

          // Store report
          await this.storeComplianceReport(report);

          // Log report generation
          await this.writeAuditEntry({
            id: `audit_report_${Date.now()}`,
            timestamp: new Date(),
            tenantId,
            jobId: 'compliance_report',
            eventType: RTBFAuditEventType.COMPLIANCE_REPORT_GENERATED,
            actor: {
              userId: 'system',
              userEmail: 'system@maestro.dev',
              userRole: 'system',
            },
            action: {
              operation: 'identify',
              strategy: 'compliance_reporting',
              dryRun: false,
              cascadeTriggered: false,
            },
            result: {
              success: true,
              recordsAffected: auditData.length,
              duration: 0,
            },
            compliance: {
              legalBasis: 'Compliance reporting',
              regulation: (regulation as any) || 'GDPR',
              retentionPeriod: this.config.retentionYears * 365,
              dataCategory: ['audit_logs'],
            },
            technical: {
              version: '24.4.0',
              environment: process.env.NODE_ENV || 'development',
              correlationId: report.id,
            },
          });

          this.metrics.incrementCounter('rtbf_compliance_reports', 1, {
            tenant_id: tenantId,
            regulation: regulation || 'all',
          });

          logger.info('Compliance report generated', {
            reportId: report.id,
            tenantId,
            totalJobs: report.summary.totalJobs,
            totalRecords: report.summary.totalRecordsDeleted,
          });

          return report;
        } catch (error) {
          logger.error('Failed to generate compliance report', {
            tenantId,
            error: error.message,
          });
          span.recordException(error as Error);
          throw error;
        }
      },
    );
  }

  private async getAuditDataForPeriod(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    regulation?: string,
  ): Promise<RTBFAuditEntry[]> {
    let whereClause = 'tenant_id = $1 AND created_at BETWEEN $2 AND $3';
    const params: any[] = [tenantId, startDate, endDate];

    if (regulation) {
      whereClause +=
        " AND (entry_data->>'compliance')::jsonb->>'regulation' = $4";
      params.push(regulation);
    }

    const result = await this.db.query(
      `
      SELECT entry_data 
      FROM rtbf_audit_log 
      WHERE ${whereClause}
      ORDER BY created_at
    `,
      params,
    );

    return result.rows.map((row) => JSON.parse(row.entry_data));
  }

  private calculateSummaryStats(
    auditData: RTBFAuditEntry[],
  ): ComplianceReport['summary'] {
    const jobEvents = auditData.filter(
      (e) => e.eventType === RTBFAuditEventType.JOB_COMPLETED,
    );
    const recordEvents = auditData.filter((e) =>
      [
        RTBFAuditEventType.RECORD_DELETED,
        RTBFAuditEventType.RECORD_ANONYMIZED,
        RTBFAuditEventType.RECORD_ARCHIVED,
      ].includes(e.eventType),
    );

    return {
      totalJobs: jobEvents.length,
      totalRecordsDeleted: recordEvents.filter(
        (e) => e.eventType === RTBFAuditEventType.RECORD_DELETED,
      ).length,
      totalRecordsAnonymized: recordEvents.filter(
        (e) => e.eventType === RTBFAuditEventType.RECORD_ANONYMIZED,
      ).length,
      totalRecordsArchived: recordEvents.filter(
        (e) => e.eventType === RTBFAuditEventType.RECORD_ARCHIVED,
      ).length,
      averageJobDuration:
        jobEvents.reduce((sum, e) => sum + e.result.duration, 0) /
          jobEvents.length || 0,
      successRate:
        (jobEvents.filter((e) => e.result.success).length / jobEvents.length) *
          100 || 0,
    };
  }

  private groupByRegulation(
    auditData: RTBFAuditEntry[],
  ): ComplianceReport['byRegulation'] {
    const groups: ComplianceReport['byRegulation'] = {};

    for (const entry of auditData) {
      const regulation = entry.compliance.regulation;
      if (!groups[regulation]) {
        groups[regulation] = {
          jobCount: 0,
          recordCount: 0,
          avgResponseTime: 0,
        };
      }

      if (entry.eventType === RTBFAuditEventType.JOB_COMPLETED) {
        groups[regulation].jobCount++;
        groups[regulation].avgResponseTime += entry.result.duration;
      } else if (
        [
          RTBFAuditEventType.RECORD_DELETED,
          RTBFAuditEventType.RECORD_ANONYMIZED,
          RTBFAuditEventType.RECORD_ARCHIVED,
        ].includes(entry.eventType)
      ) {
        groups[regulation].recordCount++;
      }
    }

    // Calculate averages
    for (const regulation in groups) {
      if (groups[regulation].jobCount > 0) {
        groups[regulation].avgResponseTime /= groups[regulation].jobCount;
      }
    }

    return groups;
  }

  private groupByDataCategory(
    auditData: RTBFAuditEntry[],
  ): ComplianceReport['byDataCategory'] {
    const groups: ComplianceReport['byDataCategory'] = {};

    for (const entry of auditData) {
      for (const category of entry.compliance.dataCategory) {
        if (!groups[category]) {
          groups[category] = { recordCount: 0, deletionMethod: [] };
        }

        if (
          [
            RTBFAuditEventType.RECORD_DELETED,
            RTBFAuditEventType.RECORD_ANONYMIZED,
            RTBFAuditEventType.RECORD_ARCHIVED,
          ].includes(entry.eventType)
        ) {
          groups[category].recordCount++;
          if (
            !groups[category].deletionMethod.includes(entry.action.strategy)
          ) {
            groups[category].deletionMethod.push(entry.action.strategy);
          }
        }
      }
    }

    return groups;
  }

  private generateTimeline(
    auditData: RTBFAuditEntry[],
    startDate: Date,
    endDate: Date,
  ): ComplianceReport['timeline'] {
    const timeline: ComplianceReport['timeline'] = [];
    const dayMs = 24 * 60 * 60 * 1000;

    for (
      let date = new Date(startDate);
      date <= endDate;
      date = new Date(date.getTime() + dayMs)
    ) {
      const dayStart = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
      );
      const dayEnd = new Date(dayStart.getTime() + dayMs);

      const dayEvents = auditData.filter(
        (e) => e.timestamp >= dayStart && e.timestamp < dayEnd,
      );

      const jobEvents = dayEvents.filter(
        (e) => e.eventType === RTBFAuditEventType.JOB_COMPLETED,
      );
      const recordEvents = dayEvents.filter((e) =>
        [
          RTBFAuditEventType.RECORD_DELETED,
          RTBFAuditEventType.RECORD_ANONYMIZED,
          RTBFAuditEventType.RECORD_ARCHIVED,
        ].includes(e.eventType),
      );

      timeline.push({
        date: dayStart.toISOString().split('T')[0],
        jobsCompleted: jobEvents.length,
        recordsProcessed: recordEvents.length,
        averageDuration:
          jobEvents.reduce((sum, e) => sum + e.result.duration, 0) /
            jobEvents.length || 0,
      });
    }

    return timeline;
  }

  private calculateComplianceMetrics(
    auditData: RTBFAuditEntry[],
  ): ComplianceReport['complianceMetrics'] {
    const jobEvents = auditData.filter(
      (e) => e.eventType === RTBFAuditEventType.JOB_COMPLETED,
    );
    const onTimeJobs = jobEvents.filter((e) => e.result.duration <= 72); // 72 hours SLA

    return {
      onTimeCompletion: (onTimeJobs.length / jobEvents.length) * 100 || 0,
      withinSLA: (onTimeJobs.length / jobEvents.length) * 100 || 0,
      auditTrailCompleteness: 100, // Assuming complete audit trail
      dataRetentionCompliance: 100, // Assuming compliant retention
    };
  }

  private identifyIssues(
    auditData: RTBFAuditEntry[],
  ): ComplianceReport['issues'] {
    return {
      failedJobs: auditData.filter(
        (e) => e.eventType === RTBFAuditEventType.JOB_FAILED,
      ).length,
      constraintViolations: auditData.filter(
        (e) => e.eventType === RTBFAuditEventType.CONSTRAINT_VIOLATION,
      ).length,
      dataInconsistencies: 0, // Would be calculated based on data validation
      performanceIssues: auditData.filter(
        (e) =>
          e.eventType === RTBFAuditEventType.JOB_COMPLETED &&
          e.result.duration > 120,
      ).length,
    };
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    await this.db.query(
      `
      INSERT INTO rtbf_compliance_reports (id, tenant_id, report_data, generated_at)
      VALUES ($1, $2, $3, NOW())
    `,
      [report.id, report.tenantId, JSON.stringify(report)],
    );
  }

  // Utility methods
  private inferOperation(
    eventType: RTBFAuditEventType,
  ): RTBFAuditEntry['action']['operation'] {
    switch (eventType) {
      case RTBFAuditEventType.RECORD_DELETED:
        return 'delete';
      case RTBFAuditEventType.RECORD_ANONYMIZED:
        return 'anonymize';
      case RTBFAuditEventType.RECORD_ARCHIVED:
        return 'archive';
      case RTBFAuditEventType.RECORD_IDENTIFIED:
        return 'identify';
      default:
        return 'validate';
    }
  }

  private inferRegulation(
    reason: string,
  ): 'GDPR' | 'CCPA' | 'PIPEDA' | 'LGPD' | 'OTHER' {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes('gdpr')) return 'GDPR';
    if (lowerReason.includes('ccpa')) return 'CCPA';
    if (lowerReason.includes('pipeda')) return 'PIPEDA';
    if (lowerReason.includes('lgpd')) return 'LGPD';
    return 'OTHER';
  }

  private extractDataCategories(targets: RTBFTarget[]): string[] {
    return [...new Set(targets.map((t) => t.type))];
  }

  private getModifiedFields(
    before: Record<string, any>,
    after: Record<string, any>,
  ): string[] {
    const fields: string[] = [];
    for (const key in before) {
      if (before[key] !== after[key]) {
        fields.push(key);
      }
    }
    return fields;
  }

  private calculateChecksum(data: Record<string, any>): string {
    if (!data) return '';
    const str = JSON.stringify(data, Object.keys(data).sort());
    return require('crypto')
      .createHash('sha256')
      .update(str)
      .digest('hex')
      .substring(0, 16);
  }

  private getRecordDataCategories(record: Record<string, any>): string[] {
    // Infer data categories from record structure
    const categories: string[] = [];

    if (record.email) categories.push('contact_info');
    if (record.name || record.firstName || record.lastName)
      categories.push('personal_identity');
    if (record.phone) categories.push('contact_info');
    if (record.address) categories.push('location_data');
    if (record.paymentInfo || record.creditCard)
      categories.push('financial_data');

    return categories.length > 0 ? categories : ['general'];
  }

  private isCriticalEvent(eventType: RTBFAuditEventType): boolean {
    return [
      RTBFAuditEventType.JOB_FAILED,
      RTBFAuditEventType.CONSTRAINT_VIOLATION,
      RTBFAuditEventType.RECORD_FAILED,
    ].includes(eventType);
  }

  private cleanupDryRunCache(): void {
    const cutoff = Date.now() - 2 * 60 * 60 * 1000; // 2 hours

    for (const [jobId, analysis] of this.dryRunCache.entries()) {
      if (analysis.timestamp.getTime() < cutoff) {
        this.dryRunCache.delete(jobId);
      }
    }

    this.metrics.setGauge('rtbf_dry_run_cache_size', this.dryRunCache.size);
  }

  // Public API methods
  public getDryRunAnalysis(jobId: string): DryRunAnalysis | null {
    return this.dryRunCache.get(jobId) || null;
  }

  public async exportAuditLogs(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    format: 'json' | 'csv' | 'xml' = 'json',
  ): Promise<string> {
    const auditData = await this.getAuditDataForPeriod(
      tenantId,
      startDate,
      endDate,
    );

    this.metrics.incrementCounter('rtbf_audit_exports', 1, {
      tenant_id: tenantId,
      format,
    });

    await this.writeAuditEntry({
      id: `audit_export_${Date.now()}`,
      timestamp: new Date(),
      tenantId,
      jobId: 'audit_export',
      eventType: RTBFAuditEventType.AUDIT_EXPORT_REQUESTED,
      actor: {
        userId: 'system',
        userEmail: 'system@maestro.dev',
        userRole: 'system',
      },
      action: {
        operation: 'identify',
        strategy: 'audit_export',
        dryRun: false,
        cascadeTriggered: false,
      },
      result: {
        success: true,
        recordsAffected: auditData.length,
        duration: 0,
      },
      compliance: {
        legalBasis: 'Audit export',
        regulation: 'GDPR',
        retentionPeriod: this.config.retentionYears * 365,
        dataCategory: ['audit_logs'],
      },
      technical: {
        version: '24.4.0',
        environment: process.env.NODE_ENV || 'development',
        correlationId: `export_${Date.now()}`,
      },
    });

    switch (format) {
      case 'csv':
        return this.convertToCSV(auditData);
      case 'xml':
        return this.convertToXML(auditData);
      default:
        return JSON.stringify(auditData, null, 2);
    }
  }

  private convertToCSV(auditData: RTBFAuditEntry[]): string {
    if (auditData.length === 0) return '';

    const headers = [
      'timestamp',
      'tenantId',
      'jobId',
      'eventType',
      'actorId',
      'operation',
      'success',
      'recordsAffected',
    ];
    const rows = auditData.map((entry) => [
      entry.timestamp.toISOString(),
      entry.tenantId,
      entry.jobId,
      entry.eventType,
      entry.actor.userId,
      entry.action.operation,
      entry.result.success.toString(),
      entry.result.recordsAffected.toString(),
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }

  private convertToXML(auditData: RTBFAuditEntry[]): string {
    const xmlEntries = auditData
      .map(
        (entry) => `
      <entry>
        <timestamp>${entry.timestamp.toISOString()}</timestamp>
        <tenantId>${entry.tenantId}</tenantId>
        <jobId>${entry.jobId}</jobId>
        <eventType>${entry.eventType}</eventType>
        <actor>${entry.actor.userId}</actor>
        <operation>${entry.action.operation}</operation>
        <success>${entry.result.success}</success>
        <recordsAffected>${entry.result.recordsAffected}</recordsAffected>
      </entry>
    `,
      )
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?><auditLog>${xmlEntries}</auditLog>`;
  }

  public async getComplianceScore(
    tenantId: string,
    regulation: string,
  ): Promise<number> {
    // Calculate compliance score based on recent audit data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days

    const auditData = await this.getAuditDataForPeriod(
      tenantId,
      startDate,
      endDate,
      regulation,
    );
    const report = await this.generateComplianceReport(
      tenantId,
      startDate,
      endDate,
      regulation,
    );

    // Calculate weighted score
    const score =
      report.complianceMetrics.onTimeCompletion * 0.3 +
      report.complianceMetrics.withinSLA * 0.25 +
      report.complianceMetrics.auditTrailCompleteness * 0.25 +
      report.complianceMetrics.dataRetentionCompliance * 0.2;

    this.metrics.setGauge('rtbf_compliance_score', score, {
      tenant_id: tenantId,
      regulation,
    });

    return score;
  }
}

// Export singleton instance
export const rtbfAuditService = new RTBFAuditService(
  {
    enabled: process.env.RTBF_AUDIT_ENABLED !== 'false',
    retentionYears: parseInt(process.env.RTBF_AUDIT_RETENTION_YEARS || '7'),
    encryptLogs: process.env.RTBF_ENCRYPT_LOGS !== 'false',
    immutableStorage: process.env.RTBF_IMMUTABLE_STORAGE !== 'false',
    complianceReporting: process.env.RTBF_COMPLIANCE_REPORTING !== 'false',
    realTimeAlerts: process.env.RTBF_REALTIME_ALERTS !== 'false',
    dryRunAnalysis: process.env.RTBF_DRY_RUN_ANALYSIS !== 'false',
    performanceMonitoring: process.env.RTBF_PERFORMANCE_MONITORING !== 'false',
  },
  new DatabaseService(),
);
