/**
 * Unified Audit Log Aggregator
 * Merges audit logs from CompanyOS, Switchboard, and Summit services
 * for unified compliance reporting and forensic analysis.
 */

import { EventEmitter } from 'eventemitter3';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { createHash, createHmac } from 'crypto';
import { randomUUID } from 'crypto';
import pino from 'pino';
import {
  UnifiedAuditEvent,
  UnifiedAuditEventSchema,
  AuditQuery,
  AuditQueryResult,
  AuditSource,
  AuditAggregation,
  ComplianceReport,
  ForensicAnalysis,
  IntegrityVerification,
  ComplianceFramework,
} from './types.js';

interface AggregatorConfig {
  postgres: Pool;
  redis: Redis;
  logger?: pino.Logger;
  signingSecret?: string;
  batchSize?: number;
  flushIntervalMs?: number;
  retentionDays?: number;
}

interface SourceAdapter {
  name: AuditSource;
  poll: () => Promise<UnifiedAuditEvent[]>;
  subscribe?: (callback: (event: UnifiedAuditEvent) => void) => void;
}

type AggregatorEvents = {
  'event:received': [UnifiedAuditEvent];
  'event:processed': [UnifiedAuditEvent];
  'event:failed': [Error, unknown];
  'batch:processed': [number];
  'integrity:verified': [IntegrityVerification];
  'compliance:violation': [UnifiedAuditEvent];
  'anomaly:detected': [ForensicAnalysis['anomalies'][0]];
};

export class UnifiedAuditAggregator extends EventEmitter<AggregatorEvents> {
  private db: Pool;
  private redis: Redis;
  private logger: pino.Logger;
  private signingSecret: string;
  private batchSize: number;
  private flushIntervalMs: number;
  private retentionDays: number;

  private sourceAdapters: Map<AuditSource, SourceAdapter> = new Map();
  private eventBuffer: UnifiedAuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private lastHash: string = '';
  private isProcessing = false;

  constructor(config: AggregatorConfig) {
    super();
    this.db = config.postgres;
    this.redis = config.redis;
    this.logger = config.logger || pino({ name: 'unified-audit' });
    this.signingSecret = config.signingSecret || process.env.AUDIT_SIGNING_SECRET || 'default-audit-secret';
    this.batchSize = config.batchSize || 100;
    this.flushIntervalMs = config.flushIntervalMs || 5000;
    this.retentionDays = config.retentionDays || 2555; // 7 years default
  }

  /**
   * Initialize the aggregator
   */
  async initialize(): Promise<void> {
    await this.createTables();
    await this.loadLastHash();
    this.startFlushTimer();
    this.logger.info('Unified Audit Aggregator initialized');
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    await this.db.query(`
      CREATE SCHEMA IF NOT EXISTS unified_audit;

      CREATE TABLE IF NOT EXISTS unified_audit.events (
        id UUID PRIMARY KEY,
        source VARCHAR(50) NOT NULL,
        source_event_id VARCHAR(255),
        timestamp TIMESTAMPTZ NOT NULL,
        received_at TIMESTAMPTZ DEFAULT NOW(),
        processed_at TIMESTAMPTZ,
        event_type VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        correlation_id UUID,
        session_id VARCHAR(255),
        request_id VARCHAR(255),
        trace_id VARCHAR(255),
        span_id VARCHAR(255),
        actor JSONB NOT NULL,
        resource JSONB,
        action VARCHAR(255) NOT NULL,
        outcome VARCHAR(20) NOT NULL,
        message TEXT,
        changes JSONB,
        compliance JSONB,
        integrity JSONB,
        error JSONB,
        metadata JSONB DEFAULT '{}',
        tags TEXT[] DEFAULT '{}',
        hash VARCHAR(64) NOT NULL,
        previous_hash VARCHAR(64),
        signature VARCHAR(128),
        UNIQUE(source, source_event_id)
      );

      CREATE TABLE IF NOT EXISTS unified_audit.compliance_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        framework VARCHAR(50) NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        report_data JSONB NOT NULL,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS unified_audit.forensic_analyses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        correlation_id UUID NOT NULL,
        tenant_id VARCHAR(255) NOT NULL,
        analysis_data JSONB NOT NULL,
        generated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON unified_audit.events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_source ON unified_audit.events(source);
      CREATE INDEX IF NOT EXISTS idx_audit_tenant ON unified_audit.events(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_audit_category ON unified_audit.events(category);
      CREATE INDEX IF NOT EXISTS idx_audit_severity ON unified_audit.events(severity);
      CREATE INDEX IF NOT EXISTS idx_audit_correlation ON unified_audit.events(correlation_id);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON unified_audit.events((actor->>'id'));
      CREATE INDEX IF NOT EXISTS idx_audit_resource ON unified_audit.events((resource->>'type'), (resource->>'id'));
      CREATE INDEX IF NOT EXISTS idx_audit_compliance ON unified_audit.events((compliance->>'relevant'));
      CREATE INDEX IF NOT EXISTS idx_audit_event_type ON unified_audit.events(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_action ON unified_audit.events(action);

      -- Full-text search index
      CREATE INDEX IF NOT EXISTS idx_audit_search ON unified_audit.events
        USING GIN (to_tsvector('english', coalesce(message, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(action, '')));
    `);
  }

  /**
   * Load last hash for chain continuity
   */
  private async loadLastHash(): Promise<void> {
    const result = await this.db.query(
      `SELECT hash FROM unified_audit.events ORDER BY timestamp DESC, id DESC LIMIT 1`
    );
    this.lastHash = result.rows[0]?.hash || '';
  }

  /**
   * Register a source adapter
   */
  registerSourceAdapter(adapter: SourceAdapter): void {
    this.sourceAdapters.set(adapter.name, adapter);

    if (adapter.subscribe) {
      adapter.subscribe((event) => this.ingest(event));
    }

    this.logger.info({ source: adapter.name }, 'Source adapter registered');
  }

  /**
   * Ingest an audit event
   */
  async ingest(event: Partial<UnifiedAuditEvent>): Promise<string> {
    try {
      const normalizedEvent = this.normalizeEvent(event);
      const validatedEvent = UnifiedAuditEventSchema.parse(normalizedEvent);

      // Add to buffer
      this.eventBuffer.push(validatedEvent);
      this.emit('event:received', validatedEvent);

      // Check compliance
      if (validatedEvent.compliance?.relevant) {
        this.checkComplianceViolation(validatedEvent);
      }

      // Flush if buffer is full
      if (this.eventBuffer.length >= this.batchSize) {
        await this.flush();
      }

      return validatedEvent.id;
    } catch (error) {
      this.emit('event:failed', error as Error, event);
      throw error;
    }
  }

  /**
   * Normalize event to unified schema
   */
  private normalizeEvent(event: Partial<UnifiedAuditEvent>): UnifiedAuditEvent {
    const id = event.id || randomUUID();
    const timestamp = event.timestamp || new Date();

    // Calculate hash
    const eventData = JSON.stringify({
      id,
      source: event.source,
      timestamp: timestamp.toISOString(),
      eventType: event.eventType,
      action: event.action,
      actor: event.actor,
      resource: event.resource,
    });

    const hash = createHash('sha256').update(eventData).digest('hex');
    const signature = createHmac('sha256', this.signingSecret).update(hash).digest('hex');

    return {
      id,
      source: event.source || 'summit',
      sourceEventId: event.sourceEventId,
      timestamp,
      receivedAt: new Date(),
      eventType: event.eventType || 'unknown',
      category: event.category || 'system_event',
      severity: event.severity || 'info',
      tenantId: event.tenantId || 'default',
      correlationId: event.correlationId,
      sessionId: event.sessionId,
      requestId: event.requestId,
      traceId: event.traceId,
      spanId: event.spanId,
      actor: event.actor || { id: 'system', type: 'system' },
      resource: event.resource,
      action: event.action || 'unknown',
      outcome: event.outcome || 'success',
      message: event.message,
      changes: event.changes,
      compliance: event.compliance,
      integrity: {
        hash,
        previousHash: this.lastHash,
        signature,
        algorithm: 'sha256-hmac',
      },
      error: event.error,
      metadata: event.metadata,
      tags: event.tags,
    };
  }

  /**
   * Flush event buffer to database
   */
  async flush(): Promise<void> {
    if (this.isProcessing || this.eventBuffer.length === 0) return;

    this.isProcessing = true;
    const batch = this.eventBuffer.splice(0, this.batchSize);

    try {
      const client = await this.db.connect();
      try {
        await client.query('BEGIN');

        for (const event of batch) {
          await client.query(
            `INSERT INTO unified_audit.events
             (id, source, source_event_id, timestamp, received_at, processed_at, event_type, category, severity,
              tenant_id, correlation_id, session_id, request_id, trace_id, span_id, actor, resource, action,
              outcome, message, changes, compliance, integrity, error, metadata, tags, hash, previous_hash, signature)
             VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28)
             ON CONFLICT (source, source_event_id) DO NOTHING`,
            [
              event.id,
              event.source,
              event.sourceEventId,
              event.timestamp,
              event.receivedAt,
              event.eventType,
              event.category,
              event.severity,
              event.tenantId,
              event.correlationId,
              event.sessionId,
              event.requestId,
              event.traceId,
              event.spanId,
              JSON.stringify(event.actor),
              JSON.stringify(event.resource),
              event.action,
              event.outcome,
              event.message,
              JSON.stringify(event.changes),
              JSON.stringify(event.compliance),
              JSON.stringify(event.integrity),
              JSON.stringify(event.error),
              JSON.stringify(event.metadata),
              event.tags,
              event.integrity?.hash,
              event.integrity?.previousHash,
              event.integrity?.signature,
            ]
          );

          // Update last hash
          if (event.integrity?.hash) {
            this.lastHash = event.integrity.hash;
          }

          this.emit('event:processed', event);
        }

        await client.query('COMMIT');
        this.emit('batch:processed', batch.length);
        this.logger.debug({ count: batch.length }, 'Batch processed');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to flush events');
      // Re-queue events
      this.eventBuffer.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Query audit events
   */
  async query(params: AuditQuery): Promise<AuditQueryResult> {
    const conditions: string[] = ['1=1'];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build query conditions
    if (params.sources?.length) {
      conditions.push(`source = ANY($${paramIndex++})`);
      values.push(params.sources);
    }

    if (params.categories?.length) {
      conditions.push(`category = ANY($${paramIndex++})`);
      values.push(params.categories);
    }

    if (params.severities?.length) {
      conditions.push(`severity = ANY($${paramIndex++})`);
      values.push(params.severities);
    }

    if (params.eventTypes?.length) {
      conditions.push(`event_type = ANY($${paramIndex++})`);
      values.push(params.eventTypes);
    }

    if (params.tenantIds?.length) {
      conditions.push(`tenant_id = ANY($${paramIndex++})`);
      values.push(params.tenantIds);
    }

    if (params.actorIds?.length) {
      conditions.push(`actor->>'id' = ANY($${paramIndex++})`);
      values.push(params.actorIds);
    }

    if (params.resourceTypes?.length) {
      conditions.push(`resource->>'type' = ANY($${paramIndex++})`);
      values.push(params.resourceTypes);
    }

    if (params.resourceIds?.length) {
      conditions.push(`resource->>'id' = ANY($${paramIndex++})`);
      values.push(params.resourceIds);
    }

    if (params.outcomes?.length) {
      conditions.push(`outcome = ANY($${paramIndex++})`);
      values.push(params.outcomes);
    }

    if (params.correlationId) {
      conditions.push(`correlation_id = $${paramIndex++}`);
      values.push(params.correlationId);
    }

    if (params.startTime) {
      conditions.push(`timestamp >= $${paramIndex++}`);
      values.push(params.startTime);
    }

    if (params.endTime) {
      conditions.push(`timestamp <= $${paramIndex++}`);
      values.push(params.endTime);
    }

    if (params.complianceRelevant !== undefined) {
      conditions.push(`(compliance->>'relevant')::boolean = $${paramIndex++}`);
      values.push(params.complianceRelevant);
    }

    if (params.frameworks?.length) {
      conditions.push(`compliance->'frameworks' ?| $${paramIndex++}`);
      values.push(params.frameworks);
    }

    if (params.searchText) {
      conditions.push(`to_tsvector('english', coalesce(message, '') || ' ' || coalesce(event_type, '') || ' ' || coalesce(action, '')) @@ plainto_tsquery('english', $${paramIndex++})`);
      values.push(params.searchText);
    }

    // Build query
    const sortColumn = {
      timestamp: 'timestamp',
      severity: 'severity',
      category: 'category',
      source: 'source',
    }[params.sortBy] || 'timestamp';

    const query = `
      SELECT *, COUNT(*) OVER() as total_count
      FROM unified_audit.events
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${sortColumn} ${params.sortOrder}
      LIMIT $${paramIndex++}
      OFFSET $${paramIndex++}
    `;

    values.push(params.limit + 1, params.offset);

    const result = await this.db.query(query, values);
    const hasMore = result.rows.length > params.limit;
    const events = result.rows.slice(0, params.limit).map((row) => this.rowToEvent(row));
    const total = result.rows[0]?.total_count || 0;

    return {
      events,
      total: Number(total),
      hasMore,
      nextCursor: hasMore ? Buffer.from(JSON.stringify({ offset: params.offset + params.limit })).toString('base64') : undefined,
    };
  }

  /**
   * Get aggregated statistics
   */
  async getAggregation(tenantId: string, startTime: Date, endTime: Date): Promise<AuditAggregation> {
    const [bySource, byCategory, bySeverity, byOutcome, byHour, topActors, topResources] = await Promise.all([
      this.db.query(
        `SELECT source, COUNT(*) as count FROM unified_audit.events
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY source`,
        [tenantId, startTime, endTime]
      ),
      this.db.query(
        `SELECT category, COUNT(*) as count FROM unified_audit.events
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY category`,
        [tenantId, startTime, endTime]
      ),
      this.db.query(
        `SELECT severity, COUNT(*) as count FROM unified_audit.events
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY severity`,
        [tenantId, startTime, endTime]
      ),
      this.db.query(
        `SELECT outcome, COUNT(*) as count FROM unified_audit.events
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY outcome`,
        [tenantId, startTime, endTime]
      ),
      this.db.query(
        `SELECT date_trunc('hour', timestamp) as hour, COUNT(*) as count
         FROM unified_audit.events
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY date_trunc('hour', timestamp)
         ORDER BY hour`,
        [tenantId, startTime, endTime]
      ),
      this.db.query(
        `SELECT actor->>'id' as actor_id, COUNT(*) as count
         FROM unified_audit.events
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3
         GROUP BY actor->>'id'
         ORDER BY count DESC
         LIMIT 10`,
        [tenantId, startTime, endTime]
      ),
      this.db.query(
        `SELECT resource->>'type' as resource_type, resource->>'id' as resource_id, COUNT(*) as count
         FROM unified_audit.events
         WHERE tenant_id = $1 AND timestamp BETWEEN $2 AND $3 AND resource IS NOT NULL
         GROUP BY resource->>'type', resource->>'id'
         ORDER BY count DESC
         LIMIT 10`,
        [tenantId, startTime, endTime]
      ),
    ]);

    return {
      bySource: Object.fromEntries(bySource.rows.map((r) => [r.source, Number(r.count)])) as Record<AuditSource, number>,
      byCategory: Object.fromEntries(byCategory.rows.map((r) => [r.category, Number(r.count)])) as any,
      bySeverity: Object.fromEntries(bySeverity.rows.map((r) => [r.severity, Number(r.count)])) as any,
      byOutcome: Object.fromEntries(byOutcome.rows.map((r) => [r.outcome, Number(r.count)])) as any,
      byHour: byHour.rows.map((r) => ({ hour: r.hour.toISOString(), count: Number(r.count) })),
      topActors: topActors.rows.map((r) => ({ actorId: r.actor_id, count: Number(r.count) })),
      topResources: topResources.rows.map((r) => ({
        resourceType: r.resource_type,
        resourceId: r.resource_id,
        count: Number(r.count),
      })),
    };
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    framework: ComplianceFramework,
    startTime: Date,
    endTime: Date
  ): Promise<ComplianceReport> {
    const events = await this.query({
      tenantIds: [tenantId],
      startTime,
      endTime,
      complianceRelevant: true,
      frameworks: [framework],
      limit: 10000,
    });

    const criticalEvents = events.events.filter((e) => e.severity === 'critical');
    const violations = events.events
      .filter((e) => e.outcome === 'failure' || e.outcome === 'blocked')
      .map((e) => ({
        eventId: e.id,
        type: e.eventType,
        severity: e.severity,
        description: e.message || `${e.action} failed on ${e.resource?.type || 'unknown'}`,
        remediation: this.getRemediationAdvice(e),
      }));

    const complianceScore = Math.max(
      0,
      100 - (violations.length * 5) - (criticalEvents.length * 10)
    );

    const report: ComplianceReport = {
      framework,
      periodStart: startTime,
      periodEnd: endTime,
      summary: {
        totalEvents: events.total,
        criticalEvents: criticalEvents.length,
        violations: violations.length,
        complianceScore,
        riskLevel: complianceScore >= 80 ? 'low' : complianceScore >= 60 ? 'medium' : complianceScore >= 40 ? 'high' : 'critical',
      },
      violations,
      recommendations: this.generateRecommendations(events.events, framework),
      generatedAt: new Date(),
    };

    // Store report
    await this.db.query(
      `INSERT INTO unified_audit.compliance_reports (framework, tenant_id, period_start, period_end, report_data)
       VALUES ($1, $2, $3, $4, $5)`,
      [framework, tenantId, startTime, endTime, JSON.stringify(report)]
    );

    return report;
  }

  /**
   * Perform forensic analysis
   */
  async forensicAnalysis(correlationId: string, tenantId: string): Promise<ForensicAnalysis> {
    const events = await this.query({
      correlationId,
      tenantIds: [tenantId],
      limit: 1000,
      sortOrder: 'asc',
    });

    if (events.events.length === 0) {
      throw new Error(`No events found for correlation ID: ${correlationId}`);
    }

    // Build timeline
    const timeline = events.events.map((e) => ({
      timestamp: e.timestamp,
      eventId: e.id,
      source: e.source,
      action: e.action,
      actor: e.actor.id,
      outcome: e.outcome,
    }));

    // Analyze actors
    const actorMap = new Map<string, { actions: string[]; ips: Set<string>; userAgents: Set<string> }>();
    for (const event of events.events) {
      const actorId = event.actor.id;
      if (!actorMap.has(actorId)) {
        actorMap.set(actorId, { actions: [], ips: new Set(), userAgents: new Set() });
      }
      const actor = actorMap.get(actorId)!;
      actor.actions.push(event.action);
      if (event.actor.ipAddress) actor.ips.add(event.actor.ipAddress);
      if (event.actor.userAgent) actor.userAgents.add(event.actor.userAgent);
    }

    const actorAnalysis = {
      actorId: events.events[0].actor.id,
      actionsCount: events.events.length,
      riskScore: this.calculateRiskScore(events.events),
      suspiciousActions: events.events
        .filter((e) => e.severity === 'critical' || e.outcome === 'failure')
        .map((e) => e.action),
      ipAddresses: Array.from(actorMap.get(events.events[0].actor.id)?.ips || []),
      userAgents: Array.from(actorMap.get(events.events[0].actor.id)?.userAgents || []),
    };

    // Analyze resources
    const resourceMap = new Map<string, { accessCount: number; modificationCount: number; lastAccessed: Date }>();
    for (const event of events.events) {
      if (!event.resource) continue;
      const key = `${event.resource.type}:${event.resource.id}`;
      if (!resourceMap.has(key)) {
        resourceMap.set(key, { accessCount: 0, modificationCount: 0, lastAccessed: event.timestamp });
      }
      const resource = resourceMap.get(key)!;
      resource.accessCount++;
      if (event.action.includes('update') || event.action.includes('delete') || event.action.includes('create')) {
        resource.modificationCount++;
      }
      if (event.timestamp > resource.lastAccessed) {
        resource.lastAccessed = event.timestamp;
      }
    }

    const resourceAnalysis = Array.from(resourceMap.entries()).map(([key, data]) => {
      const [resourceType, resourceId] = key.split(':');
      return { resourceType, resourceId, ...data };
    });

    // Detect anomalies
    const anomalies = this.detectAnomalies(events.events);

    const analysis: ForensicAnalysis = {
      correlationId,
      timeline,
      actorAnalysis,
      resourceAnalysis,
      anomalies,
      summary: {
        eventCount: events.events.length,
        timeSpanMs: timeline.length > 1
          ? timeline[timeline.length - 1].timestamp.getTime() - timeline[0].timestamp.getTime()
          : 0,
        uniqueActors: actorMap.size,
        uniqueResources: resourceMap.size,
        anomalyCount: anomalies.length,
        overallRiskScore: actorAnalysis.riskScore,
      },
    };

    // Store analysis
    await this.db.query(
      `INSERT INTO unified_audit.forensic_analyses (correlation_id, tenant_id, analysis_data)
       VALUES ($1, $2, $3)`,
      [correlationId, tenantId, JSON.stringify(analysis)]
    );

    return analysis;
  }

  /**
   * Verify integrity of audit chain
   */
  async verifyIntegrity(tenantId: string, startTime?: Date, endTime?: Date): Promise<IntegrityVerification> {
    const query = `
      SELECT id, hash, previous_hash, signature, timestamp
      FROM unified_audit.events
      WHERE tenant_id = $1
      ${startTime ? 'AND timestamp >= $2' : ''}
      ${endTime ? `AND timestamp <= $${startTime ? 3 : 2}` : ''}
      ORDER BY timestamp, id
    `;

    const params: unknown[] = [tenantId];
    if (startTime) params.push(startTime);
    if (endTime) params.push(endTime);

    const result = await this.db.query(query, params);

    let verified = true;
    let previousHash = '';
    const errors: { eventId: string; error: string }[] = [];
    let brokenChainAt: string | undefined;

    for (const row of result.rows) {
      // Verify chain continuity
      if (previousHash && row.previous_hash !== previousHash) {
        verified = false;
        brokenChainAt = brokenChainAt || row.id;
        errors.push({
          eventId: row.id,
          error: `Chain broken: expected previous hash ${previousHash}, got ${row.previous_hash}`,
        });
      }

      // Verify signature
      const expectedSignature = createHmac('sha256', this.signingSecret)
        .update(row.hash)
        .digest('hex');

      if (row.signature !== expectedSignature) {
        verified = false;
        errors.push({
          eventId: row.id,
          error: 'Invalid signature',
        });
      }

      previousHash = row.hash;
    }

    const verification: IntegrityVerification = {
      verified,
      totalRecords: result.rows.length,
      verifiedRecords: result.rows.length - errors.length,
      brokenChainAt,
      errors,
      verifiedAt: new Date(),
    };

    this.emit('integrity:verified', verification);
    return verification;
  }

  /**
   * Check for compliance violations
   */
  private checkComplianceViolation(event: UnifiedAuditEvent): void {
    // Check for critical security events
    if (event.category === 'security_event' && event.severity === 'critical') {
      this.emit('compliance:violation', event);
    }

    // Check for failed authentication
    if (event.category === 'authentication' && event.outcome === 'failure') {
      this.emit('compliance:violation', event);
    }

    // Check for unauthorized access attempts
    if (event.category === 'authorization' && event.outcome === 'blocked') {
      this.emit('compliance:violation', event);
    }
  }

  /**
   * Calculate risk score for events
   */
  private calculateRiskScore(events: UnifiedAuditEvent[]): number {
    let score = 0;

    for (const event of events) {
      switch (event.severity) {
        case 'critical': score += 25; break;
        case 'error': score += 15; break;
        case 'warn': score += 5; break;
      }

      if (event.outcome === 'failure') score += 10;
      if (event.outcome === 'blocked') score += 20;

      if (event.category === 'security_event') score += 15;
      if (event.category === 'authorization') score += 10;
    }

    return Math.min(100, score);
  }

  /**
   * Detect anomalies in events
   */
  private detectAnomalies(events: UnifiedAuditEvent[]): ForensicAnalysis['anomalies'] {
    const anomalies: ForensicAnalysis['anomalies'] = [];

    // Check for rapid-fire events (potential automation/attack)
    const timeGaps: number[] = [];
    for (let i = 1; i < events.length; i++) {
      const gap = events[i].timestamp.getTime() - events[i - 1].timestamp.getTime();
      timeGaps.push(gap);
    }

    const avgGap = timeGaps.reduce((a, b) => a + b, 0) / timeGaps.length;
    if (avgGap < 100 && events.length > 10) { // Less than 100ms average
      anomalies.push({
        type: 'rapid_fire_activity',
        severity: 'warn',
        confidence: 0.8,
        description: `Unusually rapid activity detected (avg ${avgGap.toFixed(0)}ms between events)`,
        eventIds: events.map((e) => e.id),
      });
    }

    // Check for multiple failures
    const failures = events.filter((e) => e.outcome === 'failure' || e.outcome === 'blocked');
    if (failures.length > events.length * 0.5) {
      anomalies.push({
        type: 'high_failure_rate',
        severity: 'error',
        confidence: 0.9,
        description: `High failure rate: ${failures.length}/${events.length} events failed`,
        eventIds: failures.map((e) => e.id),
      });
    }

    // Check for privilege escalation patterns
    const authzEvents = events.filter((e) => e.category === 'authorization');
    const blockedAuthz = authzEvents.filter((e) => e.outcome === 'blocked');
    if (blockedAuthz.length >= 3) {
      anomalies.push({
        type: 'potential_privilege_escalation',
        severity: 'critical',
        confidence: 0.7,
        description: `Multiple blocked authorization attempts (${blockedAuthz.length} events)`,
        eventIds: blockedAuthz.map((e) => e.id),
      });
    }

    return anomalies;
  }

  /**
   * Get remediation advice for an event
   */
  private getRemediationAdvice(event: UnifiedAuditEvent): string | undefined {
    if (event.category === 'authentication' && event.outcome === 'failure') {
      return 'Review authentication mechanism and consider implementing MFA or account lockout policies.';
    }
    if (event.category === 'authorization' && event.outcome === 'blocked') {
      return 'Review access control policies and verify user permissions are correctly configured.';
    }
    if (event.severity === 'critical') {
      return 'Immediate investigation required. Check system logs and consider incident response procedures.';
    }
    return undefined;
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(
    events: UnifiedAuditEvent[],
    framework: ComplianceFramework
  ): ComplianceReport['recommendations'] {
    const recommendations: ComplianceReport['recommendations'] = [];

    const failures = events.filter((e) => e.outcome === 'failure');
    if (failures.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'error_handling',
        description: `${failures.length} failed operations detected. Review error handling and retry mechanisms.`,
        implementationEffort: 'medium',
      });
    }

    const securityEvents = events.filter((e) => e.category === 'security_event');
    if (securityEvents.length > 10) {
      recommendations.push({
        priority: 'high',
        category: 'security',
        description: 'High volume of security events. Consider implementing additional monitoring and alerting.',
        implementationEffort: 'low',
      });
    }

    // Framework-specific recommendations
    if (framework === 'GDPR') {
      const dataAccessEvents = events.filter((e) => e.category === 'data_access');
      if (dataAccessEvents.some((e) => !e.compliance?.dataClassification)) {
        recommendations.push({
          priority: 'medium',
          category: 'data_classification',
          description: 'Some data access events lack classification. Ensure all data has proper classification labels.',
          implementationEffort: 'medium',
        });
      }
    }

    return recommendations;
  }

  /**
   * Convert database row to event
   */
  private rowToEvent(row: any): UnifiedAuditEvent {
    return {
      id: row.id,
      source: row.source,
      sourceEventId: row.source_event_id,
      timestamp: row.timestamp,
      receivedAt: row.received_at,
      processedAt: row.processed_at,
      eventType: row.event_type,
      category: row.category,
      severity: row.severity,
      tenantId: row.tenant_id,
      correlationId: row.correlation_id,
      sessionId: row.session_id,
      requestId: row.request_id,
      traceId: row.trace_id,
      spanId: row.span_id,
      actor: row.actor,
      resource: row.resource,
      action: row.action,
      outcome: row.outcome,
      message: row.message,
      changes: row.changes,
      compliance: row.compliance,
      integrity: row.integrity,
      error: row.error,
      metadata: row.metadata,
      tags: row.tags,
    };
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        this.logger.error({ error }, 'Flush timer error');
      });
    }, this.flushIntervalMs);
  }

  /**
   * Shutdown aggregator
   */
  async shutdown(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining events
    while (this.eventBuffer.length > 0) {
      await this.flush();
    }

    this.logger.info('Unified Audit Aggregator shutdown');
  }
}
