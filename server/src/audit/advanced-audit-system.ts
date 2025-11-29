/**
 * Advanced Audit System - Comprehensive audit trails and decision logging
 * Implements immutable event logging, compliance tracking, and forensic capabilities
 */

import { randomUUID, createHash } from 'crypto';
import { EventEmitter } from 'events';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { Logger } from 'pino';
import { z } from 'zod';
import { sign, verify } from 'jsonwebtoken';

// Core audit event types
export type AuditEventType =
  | 'system_start'
  | 'system_stop'
  | 'config_change'
  | 'user_login'
  | 'user_logout'
  | 'user_action'
  | 'resource_access'
  | 'resource_modify'
  | 'resource_delete'
  | 'policy_decision'
  | 'policy_violation'
  | 'approval_request'
  | 'approval_decision'
  | 'orchestration_start'
  | 'orchestration_complete'
  | 'orchestration_fail'
  | 'task_execute'
  | 'task_complete'
  | 'task_fail'
  | 'data_export'
  | 'data_import'
  | 'data_breach'
  | 'security_alert'
  | 'compliance_violation'
  | 'anomaly_detected';

export type AuditLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

export type ComplianceFramework =
  | 'SOX'
  | 'GDPR'
  | 'HIPAA'
  | 'SOC2'
  | 'NIST'
  | 'ISO27001';

export interface AuditEvent {
  // Core identification
  id: string;
  eventType: AuditEventType;
  level: AuditLevel;
  timestamp: Date;

  // Context
  correlationId: string;
  sessionId?: string;
  requestId?: string;

  // Actors
  userId?: string;
  tenantId: string;
  serviceId: string;

  // Resources
  resourceType?: string;
  resourceId?: string;
  resourcePath?: string;

  // Action details
  action: string;
  outcome: 'success' | 'failure' | 'partial';

  // Content
  message: string;
  details: Record<string, any>;

  // Security
  ipAddress?: string;
  userAgent?: string;

  // Compliance
  complianceRelevant: boolean;
  complianceFrameworks: ComplianceFramework[];
  dataClassification?: 'public' | 'internal' | 'confidential' | 'restricted';

  // Integrity
  hash?: string;
  signature?: string;
  previousEventHash?: string;
}

export interface AuditQuery {
  startTime?: Date;
  endTime?: Date;
  eventTypes?: AuditEventType[];
  levels?: AuditLevel[];
  userIds?: string[];
  tenantIds?: string[];
  resourceTypes?: string[];
  correlationIds?: string[];
  complianceFrameworks?: ComplianceFramework[];
  limit?: number;
  offset?: number;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  period: {
    start: Date;
    end: Date;
  };
  summary: {
    totalEvents: number;
    criticalEvents: number;
    violations: number;
    complianceScore: number; // 0-100
  };
  violations: Array<{
    eventId: string;
    violationType: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    remediation: string;
  }>;
  recommendations: string[];
}

export interface ForensicAnalysis {
  correlationId: string;
  timeline: AuditEvent[];
  actors: Array<{
    userId: string;
    actions: number;
    riskScore: number;
  }>;
  resources: Array<{
    resourceId: string;
    accessCount: number;
    lastAccessed: Date;
  }>;
  anomalies: Array<{
    type: string;
    description: string;
    severity: number;
    events: string[];
  }>;
}

// Validation schemas
const AuditEventSchema = z.object({
  eventType: z.string(),
  level: z.enum(['debug', 'info', 'warn', 'error', 'critical']),
  correlationId: z.string(),
  tenantId: z.string(),
  serviceId: z.string(),
  action: z.string(),
  outcome: z.enum(['success', 'failure', 'partial']),
  message: z.string(),
  details: z.record(z.any()),
  complianceRelevant: z.boolean(),
  complianceFrameworks: z.array(z.string()),
});

export class AdvancedAuditSystem extends EventEmitter {
  private db: Pool;
  private redis: Redis;
  private logger: Logger;
  private signingKey: string;
  private encryptionKey: string;
  private lastEventHash: string = '';

  // Configuration
  private retentionPeriodDays: number = 2555; // 7 years for compliance
  private batchSize: number = 100;
  private compressionEnabled: boolean = true;
  private realTimeAlerting: boolean = true;

  // Caching
  private eventBuffer: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(
    db: Pool,
    redis: Redis,
    logger: Logger,
    signingKey: string,
    encryptionKey: string,
  ) {
    super();

    this.db = db;
    this.redis = redis;
    this.logger = logger;
    this.signingKey = signingKey;
    this.encryptionKey = encryptionKey;

    // Initialize schema
    this.initializeSchema().catch((err) => {
      this.logger.error(
        { error: err.message },
        'Failed to initialize audit schema',
      );
    });

    // Start periodic flush
    this.flushInterval = setInterval(() => {
      this.flushEventBuffer().catch((err) => {
        this.logger.error(
          { error: err.message },
          'Failed to flush audit events',
        );
      });
    }, 5000); // Every 5 seconds

    // Cleanup on exit
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  /**
   * Record an audit event
   */
  async recordEvent(eventData: Partial<AuditEvent>): Promise<string> {
    try {
      // Validate required fields
      const validation = AuditEventSchema.safeParse(eventData);
      if (!validation.success) {
        throw new Error(`Invalid audit event: ${validation.error.message}`);
      }

      // Build complete event
      const event: AuditEvent = {
        id: randomUUID(),
        timestamp: new Date(),
        sessionId: eventData.sessionId,
        requestId: eventData.requestId,
        userId: eventData.userId,
        resourceType: eventData.resourceType,
        resourceId: eventData.resourceId,
        resourcePath: eventData.resourcePath,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        dataClassification: eventData.dataClassification,
        ...validation.data,
      } as AuditEvent;

      // Calculate integrity hash
      event.hash = this.calculateEventHash(event);
      event.previousEventHash = this.lastEventHash;
      this.lastEventHash = event.hash;

      // Sign the event
      event.signature = this.signEvent(event);

      // Add to buffer for batch processing
      this.eventBuffer.push(event);

      // Immediate flush for critical events
      if (event.level === 'critical' || event.complianceRelevant) {
        await this.flushEventBuffer();
      }

      // Real-time alerting
      if (this.realTimeAlerting) {
        await this.processRealTimeAlerts(event);
      }

      // Emit event for subscribers
      this.emit('eventRecorded', event);

      this.logger.debug(
        {
          eventId: event.id,
          eventType: event.eventType,
          level: event.level,
        },
        'Audit event recorded',
      );

      return event.id;
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          eventData,
        },
        'Failed to record audit event',
      );
      throw error;
    }
  }

  /**
   * Query audit events with advanced filtering
   */
  async queryEvents(query: AuditQuery): Promise<AuditEvent[]> {
    try {
      let sql = `
        SELECT * FROM audit_events 
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause
      if (query.startTime) {
        sql += ` AND timestamp >= $${paramIndex++}`;
        params.push(query.startTime);
      }

      if (query.endTime) {
        sql += ` AND timestamp <= $${paramIndex++}`;
        params.push(query.endTime);
      }

      if (query.eventTypes?.length) {
        sql += ` AND event_type = ANY($${paramIndex++})`;
        params.push(query.eventTypes);
      }

      if (query.levels?.length) {
        sql += ` AND level = ANY($${paramIndex++})`;
        params.push(query.levels);
      }

      if (query.userIds?.length) {
        sql += ` AND user_id = ANY($${paramIndex++})`;
        params.push(query.userIds);
      }

      if (query.tenantIds?.length) {
        sql += ` AND tenant_id = ANY($${paramIndex++})`;
        params.push(query.tenantIds);
      }

      if (query.resourceTypes?.length) {
        sql += ` AND resource_type = ANY($${paramIndex++})`;
        params.push(query.resourceTypes);
      }

      if (query.correlationIds?.length) {
        sql += ` AND correlation_id = ANY($${paramIndex++})`;
        params.push(query.correlationIds);
      }

      if (query.complianceFrameworks?.length) {
        sql += ` AND compliance_frameworks && $${paramIndex++}`;
        params.push(query.complianceFrameworks);
      }

      // Ordering and pagination
      sql += ` ORDER BY timestamp DESC`;

      if (query.limit) {
        sql += ` LIMIT $${paramIndex++}`;
        params.push(query.limit);
      }

      if (query.offset) {
        sql += ` OFFSET $${paramIndex++}`;
        params.push(query.offset);
      }

      const result = await this.db.query(sql, params);
      return result.rows.map((row) => this.deserializeEvent(row));
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          query,
        },
        'Failed to query audit events',
      );
      throw error;
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    framework: ComplianceFramework,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReport> {
    try {
      // Query relevant events
      const events = await this.queryEvents({
        startTime: startDate,
        endTime: endDate,
        complianceFrameworks: [framework],
      });

      // Analyze violations
      const violations = this.analyzeComplianceViolations(events, framework);

      // Calculate compliance score
      const complianceScore = this.calculateComplianceScore(
        events,
        violations,
        framework,
      );

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(
        violations,
        framework,
      );

      const report: ComplianceReport = {
        framework,
        period: { start: startDate, end: endDate },
        summary: {
          totalEvents: events.length,
          criticalEvents: events.filter((e) => e.level === 'critical').length,
          violations: violations.length,
          complianceScore,
        },
        violations,
        recommendations,
      };

      // Store report
      await this.storeComplianceReport(report);

      this.logger.info(
        {
          framework,
          period: { start: startDate, end: endDate },
          score: complianceScore,
          violations: violations.length,
        },
        'Compliance report generated',
      );

      return report;
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          framework,
          period: { start: startDate, end: endDate },
        },
        'Failed to generate compliance report',
      );
      throw error;
    }
  }

  /**
   * Perform forensic analysis on a correlation ID
   */
  async performForensicAnalysis(
    correlationId: string,
  ): Promise<ForensicAnalysis> {
    try {
      // Get all events for correlation ID
      const events = await this.queryEvents({
        correlationIds: [correlationId],
      });

      if (events.length === 0) {
        throw new Error(`No events found for correlation ID: ${correlationId}`);
      }

      // Analyze actors
      const actorMap = new Map<
        string,
        { actions: number; events: AuditEvent[] }
      >();
      for (const event of events) {
        if (event.userId) {
          const existing = actorMap.get(event.userId) || {
            actions: 0,
            events: [],
          };
          existing.actions++;
          existing.events.push(event);
          actorMap.set(event.userId, existing);
        }
      }

      const actors = Array.from(actorMap.entries()).map(([userId, data]) => ({
        userId,
        actions: data.actions,
        riskScore: this.calculateActorRiskScore(data.events),
      }));

      // Analyze resources
      const resourceMap = new Map<
        string,
        { accessCount: number; lastAccessed: Date }
      >();
      for (const event of events) {
        if (event.resourceId) {
          const existing = resourceMap.get(event.resourceId) || {
            accessCount: 0,
            lastAccessed: new Date(0),
          };
          existing.accessCount++;
          if (event.timestamp > existing.lastAccessed) {
            existing.lastAccessed = event.timestamp;
          }
          resourceMap.set(event.resourceId, existing);
        }
      }

      const resources = Array.from(resourceMap.entries()).map(
        ([resourceId, data]) => ({
          resourceId,
          accessCount: data.accessCount,
          lastAccessed: data.lastAccessed,
        }),
      );

      // Detect anomalies
      const anomalies = await this.detectAnomalies(events);

      const analysis: ForensicAnalysis = {
        correlationId,
        timeline: events.sort(
          (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
        ),
        actors,
        resources,
        anomalies,
      };

      // Store analysis
      await this.storeForensicAnalysis(analysis);

      this.logger.info(
        {
          correlationId,
          eventCount: events.length,
          actorCount: actors.length,
          resourceCount: resources.length,
          anomalyCount: anomalies.length,
        },
        'Forensic analysis completed',
      );

      return analysis;
    } catch (error) {
      this.logger.error(
        {
          error: error.message,
          correlationId,
        },
        'Failed to perform forensic analysis',
      );
      throw error;
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyIntegrity(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    valid: boolean;
    totalEvents: number;
    validEvents: number;
    invalidEvents: Array<{
      eventId: string;
      issue: string;
    }>;
  }> {
    try {
      const events = await this.queryEvents({
        startTime: startDate,
        endTime: endDate,
      });

      let validEvents = 0;
      const invalidEvents: Array<{ eventId: string; issue: string }> = [];
      let expectedPreviousHash = '';

      for (const event of events) {
        // Verify hash
        const calculatedHash = this.calculateEventHash(event);
        if (event.hash !== calculatedHash) {
          invalidEvents.push({
            eventId: event.id,
            issue: 'Hash mismatch - possible tampering',
          });
          continue;
        }

        // Verify signature
        if (!this.verifyEventSignature(event)) {
          invalidEvents.push({
            eventId: event.id,
            issue: 'Invalid signature',
          });
          continue;
        }

        // Verify chain integrity
        if (
          expectedPreviousHash &&
          event.previousEventHash !== expectedPreviousHash
        ) {
          invalidEvents.push({
            eventId: event.id,
            issue: 'Chain integrity violation',
          });
        }

        expectedPreviousHash = event.hash!;
        validEvents++;
      }

      const result = {
        valid: invalidEvents.length === 0,
        totalEvents: events.length,
        validEvents,
        invalidEvents,
      };

      this.logger.info(result, 'Audit trail integrity verification completed');

      return result;
    } catch (error) {
      this.logger.error(
        { error: error.message },
        'Failed to verify audit trail integrity',
      );
      throw error;
    }
  }

  /**
   * Private helper methods
   */
  private async initializeSchema(): Promise<void> {
    const schema = `
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY,
        event_type TEXT NOT NULL,
        level TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        correlation_id UUID NOT NULL,
        session_id UUID,
        request_id UUID,
        user_id TEXT,
        tenant_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        resource_path TEXT,
        action TEXT NOT NULL,
        outcome TEXT NOT NULL,
        message TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        compliance_relevant BOOLEAN DEFAULT FALSE,
        compliance_frameworks TEXT[] DEFAULT '{}',
        data_classification TEXT,
        hash TEXT,
        signature TEXT,
        previous_event_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp ON audit_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id ON audit_events(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_user_id ON audit_events(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id ON audit_events(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON audit_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_events_level ON audit_events(level);
      CREATE INDEX IF NOT EXISTS idx_audit_events_compliance ON audit_events(compliance_relevant) WHERE compliance_relevant = true;

      CREATE TABLE IF NOT EXISTS compliance_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        framework TEXT NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        report_data JSONB NOT NULL,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS forensic_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        correlation_id UUID NOT NULL,
        analysis_data JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    await this.db.query(schema);
  }

  private async flushEventBuffer(): Promise<void> {
    if (this.eventBuffer.length === 0) return;

    const eventsToFlush = this.eventBuffer.splice(0);

    try {
      // Batch insert
      const values = eventsToFlush.map((event) => [
        event.id,
        event.eventType,
        event.level,
        event.timestamp,
        event.correlationId,
        event.sessionId,
        event.requestId,
        event.userId,
        event.tenantId,
        event.serviceId,
        event.resourceType,
        event.resourceId,
        event.resourcePath,
        event.action,
        event.outcome,
        event.message,
        JSON.stringify(event.details),
        event.ipAddress,
        event.userAgent,
        event.complianceRelevant,
        event.complianceFrameworks,
        event.dataClassification,
        event.hash,
        event.signature,
        event.previousEventHash,
      ]);

      const placeholders = values
        .map(
          (_, i) =>
            `($${i * 25 + 1}, $${i * 25 + 2}, $${i * 25 + 3}, $${i * 25 + 4}, $${i * 25 + 5}, 
         $${i * 25 + 6}, $${i * 25 + 7}, $${i * 25 + 8}, $${i * 25 + 9}, $${i * 25 + 10},
         $${i * 25 + 11}, $${i * 25 + 12}, $${i * 25 + 13}, $${i * 25 + 14}, $${i * 25 + 15},
         $${i * 25 + 16}, $${i * 25 + 17}, $${i * 25 + 18}, $${i * 25 + 19}, $${i * 25 + 20},
         $${i * 25 + 21}, $${i * 25 + 22}, $${i * 25 + 23}, $${i * 25 + 24}, $${i * 25 + 25})`,
        )
        .join(', ');

      const query = `
        INSERT INTO audit_events (
          id, event_type, level, timestamp, correlation_id, session_id, request_id,
          user_id, tenant_id, service_id, resource_type, resource_id, resource_path,
          action, outcome, message, details, ip_address, user_agent, compliance_relevant,
          compliance_frameworks, data_classification, hash, signature, previous_event_hash
        ) VALUES ${placeholders}
      `;

      await this.db.query(query, values.flat());

      this.logger.debug(
        {
          flushedEvents: eventsToFlush.length,
        },
        'Audit events flushed to database',
      );
    } catch (error) {
      // Re-add events to buffer if flush fails
      this.eventBuffer.unshift(...eventsToFlush);
      throw error;
    }
  }

  private calculateEventHash(event: AuditEvent): string {
    const hashableData = {
      id: event.id,
      eventType: event.eventType,
      timestamp: event.timestamp.toISOString(),
      correlationId: event.correlationId,
      tenantId: event.tenantId,
      serviceId: event.serviceId,
      action: event.action,
      message: event.message,
      details: event.details,
    };

    return createHash('sha256')
      .update(JSON.stringify(hashableData, Object.keys(hashableData).sort()))
      .digest('hex');
  }

  private signEvent(event: AuditEvent): string {
    return sign(
      {
        id: event.id,
        hash: event.hash,
        timestamp: event.timestamp.toISOString(),
      },
      this.signingKey,
      { algorithm: 'HS256' },
    );
  }

  private verifyEventSignature(event: AuditEvent): boolean {
    try {
      const payload = verify(event.signature!, this.signingKey) as any;
      return payload.id === event.id && payload.hash === event.hash;
    } catch {
      return false;
    }
  }

  private deserializeEvent(row: any): AuditEvent {
    return {
      id: row.id,
      eventType: row.event_type,
      level: row.level,
      timestamp: row.timestamp,
      correlationId: row.correlation_id,
      sessionId: row.session_id,
      requestId: row.request_id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      serviceId: row.service_id,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      resourcePath: row.resource_path,
      action: row.action,
      outcome: row.outcome,
      message: row.message,
      details: row.details,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      complianceRelevant: row.compliance_relevant,
      complianceFrameworks: row.compliance_frameworks,
      dataClassification: row.data_classification,
      hash: row.hash,
      signature: row.signature,
      previousEventHash: row.previous_event_hash,
    };
  }

  private analyzeComplianceViolations(
    events: AuditEvent[],
    framework: ComplianceFramework,
  ): ComplianceReport['violations'] {
    const violations: ComplianceReport['violations'] = [];

    // Framework-specific violation detection
    switch (framework) {
      case 'SOX':
        violations.push(...this.detectSoxViolations(events));
        break;
      case 'GDPR':
        violations.push(...this.detectGdprViolations(events));
        break;
      case 'SOC2':
        violations.push(...this.detectSoc2Violations(events));
        break;
      // Add other frameworks as needed
    }

    return violations;
  }

  private detectSoxViolations(
    events: AuditEvent[],
  ): ComplianceReport['violations'] {
    const violations: ComplianceReport['violations'] = [];

    // Example: Detect unauthorized access to financial data
    const financialAccess = events.filter(
      (e) => e.resourceType === 'financial_data' && e.outcome === 'failure',
    );

    for (const event of financialAccess) {
      violations.push({
        eventId: event.id,
        violationType: 'unauthorized_financial_access',
        severity: 'high',
        description: 'Unauthorized access attempt to financial data',
        remediation:
          'Review user permissions and implement additional access controls',
      });
    }

    return violations;
  }

  private detectGdprViolations(
    events: AuditEvent[],
  ): ComplianceReport['violations'] {
    const violations: ComplianceReport['violations'] = [];

    // Example: Detect data export without proper approval
    const dataExports = events.filter(
      (e) =>
        e.eventType === 'data_export' && e.dataClassification === 'restricted',
    );

    for (const event of dataExports) {
      violations.push({
        eventId: event.id,
        violationType: 'unauthorized_data_export',
        severity: 'critical',
        description:
          'Export of restricted personal data without proper approval',
        remediation:
          'Implement data export approval workflow and review data handling procedures',
      });
    }

    return violations;
  }

  private detectSoc2Violations(
    events: AuditEvent[],
  ): ComplianceReport['violations'] {
    // Similar implementation for SOC2
    return [];
  }

  private calculateComplianceScore(
    events: AuditEvent[],
    violations: ComplianceReport['violations'],
    framework: ComplianceFramework,
  ): number {
    if (events.length === 0) return 100;

    const criticalViolations = violations.filter(
      (v) => v.severity === 'critical',
    ).length;
    const highViolations = violations.filter(
      (v) => v.severity === 'high',
    ).length;
    const mediumViolations = violations.filter(
      (v) => v.severity === 'medium',
    ).length;
    const lowViolations = violations.filter((v) => v.severity === 'low').length;

    // Weighted scoring
    const totalPenalty =
      criticalViolations * 20 +
      highViolations * 10 +
      mediumViolations * 5 +
      lowViolations * 1;

    const score = Math.max(0, 100 - (totalPenalty / events.length) * 100);
    return Math.round(score * 100) / 100;
  }

  private generateComplianceRecommendations(
    violations: ComplianceReport['violations'],
    framework: ComplianceFramework,
  ): string[] {
    const recommendations: string[] = [];

    const criticalCount = violations.filter(
      (v) => v.severity === 'critical',
    ).length;
    if (criticalCount > 0) {
      recommendations.push(
        `Address ${criticalCount} critical violations immediately`,
      );
    }

    const highCount = violations.filter((v) => v.severity === 'high').length;
    if (highCount > 0) {
      recommendations.push(
        `Review and remediate ${highCount} high-severity violations`,
      );
    }

    // Framework-specific recommendations
    switch (framework) {
      case 'GDPR':
        recommendations.push('Implement data processing impact assessments');
        recommendations.push('Review consent management procedures');
        break;
      case 'SOX':
        recommendations.push('Strengthen financial data access controls');
        recommendations.push('Implement segregation of duties');
        break;
    }

    return recommendations;
  }

  private calculateActorRiskScore(events: AuditEvent[]): number {
    let riskScore = 0;

    // Failed actions increase risk
    const failures = events.filter((e) => e.outcome === 'failure').length;
    riskScore += failures * 10;

    // After-hours activity increases risk
    const afterHours = events.filter((e) => {
      const hour = e.timestamp.getHours();
      return hour < 8 || hour > 18;
    }).length;
    riskScore += afterHours * 5;

    // High-sensitivity resource access increases risk
    const sensitiveAccess = events.filter(
      (e) =>
        e.dataClassification === 'restricted' ||
        e.dataClassification === 'confidential',
    ).length;
    riskScore += sensitiveAccess * 15;

    return Math.min(100, riskScore);
  }

  private async detectAnomalies(
    events: AuditEvent[],
  ): Promise<ForensicAnalysis['anomalies']> {
    const anomalies: ForensicAnalysis['anomalies'] = [];

    // Detect unusual activity patterns
    const timeSpan =
      events.length > 0
        ? events[events.length - 1].timestamp.getTime() -
          events[0].timestamp.getTime()
        : 0;

    if (timeSpan > 0) {
      const avgInterval = timeSpan / events.length;

      // Detect burst activity
      let burstCount = 0;
      for (let i = 1; i < events.length; i++) {
        const interval =
          events[i].timestamp.getTime() - events[i - 1].timestamp.getTime();
        if (interval < avgInterval * 0.1) {
          // Much faster than average
          burstCount++;
        }
      }

      if (burstCount > events.length * 0.3) {
        // More than 30% burst activity
        anomalies.push({
          type: 'burst_activity',
          description: 'Unusual burst of rapid consecutive actions detected',
          severity: 70,
          events: events.map((e) => e.id),
        });
      }
    }

    // Detect repeated failures
    const failures = events.filter((e) => e.outcome === 'failure');
    if (failures.length > events.length * 0.5) {
      // More than 50% failures
      anomalies.push({
        type: 'repeated_failures',
        description:
          'High rate of failed operations indicating possible attack',
        severity: 85,
        events: failures.map((e) => e.id),
      });
    }

    return anomalies;
  }

  private async processRealTimeAlerts(event: AuditEvent): Promise<void> {
    // Implement real-time alerting logic
    if (event.level === 'critical' || event.eventType === 'security_alert') {
      await this.redis.publish('audit:critical', JSON.stringify(event));
    }

    if (event.complianceRelevant) {
      await this.redis.publish('audit:compliance', JSON.stringify(event));
    }
  }

  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    await this.db.query(
      `
      INSERT INTO compliance_reports (framework, period_start, period_end, report_data)
      VALUES ($1, $2, $3, $4)
    `,
      [
        report.framework,
        report.period.start,
        report.period.end,
        JSON.stringify(report),
      ],
    );
  }

  private async storeForensicAnalysis(
    analysis: ForensicAnalysis,
  ): Promise<void> {
    await this.db.query(
      `
      INSERT INTO forensic_analyses (correlation_id, analysis_data)
      VALUES ($1, $2)
    `,
      [analysis.correlationId, JSON.stringify(analysis)],
    );
  }

  private async gracefulShutdown(): Promise<void> {
    this.logger.info('Shutting down audit system gracefully');

    clearInterval(this.flushInterval);
    await this.flushEventBuffer();

    this.logger.info('Audit system shutdown complete');
  }
}

