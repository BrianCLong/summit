"use strict";
/**
 * Advanced Audit System - Comprehensive audit trails and decision logging
 * Implements immutable event logging, compliance tracking, and forensic capabilities
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditSystem = exports.AdvancedAuditSystem = void 0;
const crypto_1 = require("crypto");
const events_1 = require("events");
const zod_1 = require("zod");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const { sign, verify } = jsonwebtoken_1.default;
const database_js_1 = require("../config/database.js");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const logger_js_2 = require("../config/logger.js");
const AuditTimelineRollupService_js_1 = require("./AuditTimelineRollupService.js");
const AuditArchivingService_js_1 = require("../services/AuditArchivingService.js");
// Validation schemas
const AuditEventSchema = zod_1.z.object({
    eventType: zod_1.z.string(),
    level: zod_1.z.enum(['debug', 'info', 'warn', 'error', 'critical']),
    correlationId: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    serviceId: zod_1.z.string(),
    action: zod_1.z.string(),
    outcome: zod_1.z.enum(['success', 'failure', 'partial']),
    message: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    complianceRelevant: zod_1.z.boolean(),
    complianceFrameworks: zod_1.z.array(zod_1.z.string()),
});
class AdvancedAuditSystem extends events_1.EventEmitter {
    db;
    redis;
    logger;
    signingKey;
    encryptionKey;
    lastEventHash = '';
    // Configuration
    retentionPeriodDays = 2555; // 7 years for compliance
    retentionEnabled = true;
    retentionIntervalHours = 24;
    batchSize = 100;
    compressionEnabled = true;
    realTimeAlerting = true;
    archiveThresholdDays = 90; // Archive events older than 90 days
    // Caching
    eventBuffer = [];
    flushInterval;
    retentionInterval;
    rollupService;
    static instance;
    constructor(db, redis, logger, signingKey, encryptionKey) {
        super();
        this.db = db;
        this.redis = redis;
        this.logger = logger;
        this.rollupService = new AuditTimelineRollupService_js_1.AuditTimelineRollupService(db);
        this.signingKey = signingKey;
        this.encryptionKey = encryptionKey;
        this.retentionEnabled = process.env.AUDIT_RETENTION_ENABLED !== 'false';
        const retentionDays = Number(process.env.AUDIT_RETENTION_DAYS);
        if (!Number.isNaN(retentionDays) && retentionDays > 0) {
            this.retentionPeriodDays = retentionDays;
        }
        const retentionIntervalHours = Number(process.env.AUDIT_RETENTION_SWEEP_HOURS);
        if (!Number.isNaN(retentionIntervalHours) && retentionIntervalHours > 0) {
            this.retentionIntervalHours = retentionIntervalHours;
        }
        const archiveThreshold = Number(process.env.AUDIT_ARCHIVE_THRESHOLD_DAYS);
        if (!Number.isNaN(archiveThreshold) && archiveThreshold > 0) {
            this.archiveThresholdDays = archiveThreshold;
        }
        // Initialize schema
        this.initializeSchema().catch((err) => {
            this.logger.error({ error: err.message }, 'Failed to initialize audit schema');
        });
        // Start periodic flush
        this.flushInterval = setInterval(() => {
            this.flushEventBuffer().catch((err) => {
                this.logger.error({ error: err.message }, 'Failed to flush audit events');
            });
        }, 5000); // Every 5 seconds
        const scheduleRetention = this.retentionEnabled &&
            process.env.AUDIT_RETENTION_SCHEDULE_ENABLED !== 'false' &&
            process.env.NODE_ENV !== 'test';
        if (scheduleRetention) {
            this.retentionInterval = setInterval(() => {
                this.pruneExpiredEvents().catch((err) => {
                    this.logger.error({ error: err.message }, 'Failed to prune audit events by retention policy');
                });
            }, this.retentionIntervalHours * 60 * 60 * 1000);
        }
        // Cleanup on exit
        process.on('SIGTERM', () => this.gracefulShutdown());
        process.on('SIGINT', () => this.gracefulShutdown());
    }
    static getInstance() {
        if (!AdvancedAuditSystem.instance) {
            const db = (0, database_js_1.getPostgresPool)();
            // Use getRedisClient but handle possibility of it being null (if disabled)
            // If disabled, we might need a mock or fail. For audit, we should probably fail or warn.
            const redis = (0, database_js_1.getRedisClient)();
            // SECURITY: Audit signing and encryption keys must be set in production
            const signingKey = process.env.AUDIT_SIGNING_KEY;
            const encryptionKey = process.env.AUDIT_ENCRYPTION_KEY;
            if (!signingKey || !encryptionKey) {
                if (process.env.NODE_ENV === 'production') {
                    throw new Error('AUDIT_SIGNING_KEY and AUDIT_ENCRYPTION_KEY environment variables must be set in production. ' +
                        'These keys are critical for audit trail integrity and compliance.');
                }
                logger_js_1.default.warn('AUDIT_SIGNING_KEY and/or AUDIT_ENCRYPTION_KEY not set - using insecure defaults for development only. ' +
                    'NEVER use these defaults in production!');
            }
            if (!redis) {
                logger_js_1.default.warn("AdvancedAuditSystem initialized without Redis. Real-time alerting will be disabled.");
            }
            AdvancedAuditSystem.instance = new AdvancedAuditSystem(db, redis, // If null, we'll need to handle it in methods
            logger_js_1.default, signingKey || 'dev-signing-key-insecure', encryptionKey || 'dev-encryption-key-insecure');
        }
        return AdvancedAuditSystem.instance;
    }
    static createForTest(options) {
        return new AdvancedAuditSystem(options.db, options.redis ?? null, options.logger, options.signingKey ?? 'test-signing-key', options.encryptionKey ?? 'test-encryption-key');
    }
    async shutdown() {
        await this.gracefulShutdown();
    }
    /**
     * Record an audit event
     */
    async recordEvent(eventData) {
        try {
            // 1. Get defaults from AsyncLocalStorage if available
            const store = logger_js_2.correlationStorage.getStore();
            const defaults = {
                correlationId: store?.get('correlationId') || (0, crypto_1.randomUUID)(),
                tenantId: store?.get('tenantId') || 'unknown',
                requestId: store?.get('requestId'),
                serviceId: 'intelgraph-server',
                outcome: 'success',
                complianceRelevant: false,
                complianceFrameworks: [],
            };
            // 2. Merge with provided data - filtering out undefined provided values to allow defaults to take over
            const cleanEventData = Object.fromEntries(Object.entries(eventData).filter(([_, v]) => v !== undefined));
            const mergedData = { ...defaults, ...cleanEventData };
            // 3. Validate required fields
            const validation = AuditEventSchema.safeParse(mergedData);
            if (!validation.success) {
                throw new Error(`Invalid audit event: ${validation.error.message}`);
            }
            // 4. Build complete event
            const event = {
                id: (0, crypto_1.randomUUID)(),
                timestamp: new Date(),
                sessionId: eventData.sessionId,
                userId: eventData.userId,
                resourceType: eventData.resourceType,
                resourceId: eventData.resourceId,
                resourcePath: eventData.resourcePath,
                ipAddress: eventData.ipAddress,
                userAgent: eventData.userAgent,
                dataClassification: eventData.dataClassification,
                ...validation.data,
            };
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
            this.logger.debug({
                eventId: event.id,
                eventType: event.eventType,
                level: event.level,
            }, 'Audit event recorded');
            return event.id;
        }
        catch (error) {
            this.logger.error({
                error: error.message,
                eventData,
            }, 'Failed to record audit event');
            throw error;
        }
    }
    /**
     * Query audit events with advanced filtering
     */
    async queryEvents(query) {
        try {
            let sql = `
        SELECT * FROM audit_events 
        WHERE 1=1
      `;
            const params = [];
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
        }
        catch (error) {
            this.logger.error({
                error: error.message,
                query,
            }, 'Failed to query audit events');
            throw error;
        }
    }
    /**
     * Materialize rollup tables for timeline views (resumable + observable)
     */
    async refreshTimelineRollups(options = {}) {
        return this.rollupService.refreshRollups(options);
    }
    /**
     * Read timeline buckets, switching to rollups when TIMELINE_ROLLUPS_V1=1
     */
    async getTimelineBuckets(rangeStart, rangeEnd, granularity = 'day', filters = {}) {
        return this.rollupService.getTimelineBuckets({
            rangeStart,
            rangeEnd,
            granularity,
            tenantId: filters.tenantId,
            eventTypes: filters.eventTypes,
            levels: filters.levels,
        });
    }
    async pruneExpiredEvents(retentionDays = this.retentionPeriodDays) {
        if (!this.retentionEnabled) {
            return 0;
        }
        const effectiveDays = Math.max(0, retentionDays);
        if (effectiveDays === 0) {
            return 0;
        }
        // 1. Archival Phase: Archive logs between ARCHIVE_THRESHOLD and RETENTION_PERIOD
        if (this.archiveThresholdDays < effectiveDays) {
            const archiver = AuditArchivingService_js_1.AuditArchivingService.getInstance();
            const archiveEnd = new Date(Date.now() - (this.archiveThresholdDays * 24 * 60 * 60 * 1000));
            const archiveStart = new Date(Date.now() - (effectiveDays * 24 * 60 * 60 * 1000));
            try {
                await archiver.archiveRange(archiveStart, archiveEnd, 'COLD');
            }
            catch (err) {
                this.logger.error({ error: err.message }, 'Audit archival failed - continuing with pruning');
            }
        }
        // 2. Pruning Phase: Delete records older than retention period
        const result = await this.db.query(`DELETE FROM audit_events
       WHERE timestamp < NOW() - ($1 * INTERVAL '1 day')`, [effectiveDays]);
        const deleted = result.rowCount ?? 0;
        this.logger.info({ deleted, retentionDays: effectiveDays }, 'Audit retention cleanup completed');
        return deleted;
    }
    /**
     * Generate compliance report
     */
    async generateComplianceReport(framework, startDate, endDate) {
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
            const complianceScore = this.calculateComplianceScore(events, violations, framework);
            // Generate recommendations
            const recommendations = this.generateComplianceRecommendations(violations, framework);
            const report = {
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
            this.logger.info({
                framework,
                period: { start: startDate, end: endDate },
                score: complianceScore,
                violations: violations.length,
            }, 'Compliance report generated');
            return report;
        }
        catch (error) {
            this.logger.error({
                error: error.message,
                framework,
                period: { start: startDate, end: endDate },
            }, 'Failed to generate compliance report');
            throw error;
        }
    }
    /**
     * Perform forensic analysis on a correlation ID
     */
    async performForensicAnalysis(correlationId) {
        try {
            // Get all events for correlation ID
            const events = await this.queryEvents({
                correlationIds: [correlationId],
            });
            if (events.length === 0) {
                throw new Error(`No events found for correlation ID: ${correlationId}`);
            }
            // Analyze actors
            const actorMap = new Map();
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
            const resourceMap = new Map();
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
            const resources = Array.from(resourceMap.entries()).map(([resourceId, data]) => ({
                resourceId,
                accessCount: data.accessCount,
                lastAccessed: data.lastAccessed,
            }));
            // Detect anomalies
            const anomalies = await this.detectAnomalies(events);
            const analysis = {
                correlationId,
                timeline: events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
                actors,
                resources,
                anomalies,
            };
            // Store analysis
            await this.storeForensicAnalysis(analysis);
            this.logger.info({
                correlationId,
                eventCount: events.length,
                actorCount: actors.length,
                resourceCount: resources.length,
                anomalyCount: anomalies.length,
            }, 'Forensic analysis completed');
            return analysis;
        }
        catch (error) {
            this.logger.error({
                error: error.message,
                correlationId,
            }, 'Failed to perform forensic analysis');
            throw error;
        }
    }
    /**
     * Verify audit trail integrity
     */
    async verifyIntegrity(startDate, endDate) {
        try {
            const events = await this.queryEvents({
                startTime: startDate,
                endTime: endDate,
            });
            let validEvents = 0;
            const invalidEvents = [];
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
                // Events are queried DESC (newest first).
                // For event N, its previousEventHash should equal the hash of event N-1 (the one older than it).
                // Since we iterate newest -> oldest:
                // current event = N
                // next event in loop = N-1
                // We need to check if N.previousEventHash === (N-1).hash
                // Store the expected previous hash for the NEXT iteration
                // The previousEventHash of the CURRENT event (N) points to the older event (N-1)
                if (expectedPreviousHash && event.hash !== expectedPreviousHash) {
                    invalidEvents.push({
                        eventId: event.id,
                        issue: 'Chain integrity violation: Hash mismatch with successor record',
                    });
                }
                // For the next iteration (which will process the OLDER event),
                // we expect its hash to match what this event says is the previous hash.
                expectedPreviousHash = event.previousEventHash || '';
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
        }
        catch (error) {
            this.logger.error({ error: error.message }, 'Failed to verify audit trail integrity');
            throw error;
        }
    }
    /**
     * Private helper methods
     */
    async initializeSchema() {
        const schema = `
      CREATE TABLE IF NOT EXISTS audit_events (
        id UUID PRIMARY KEY,
        event_type TEXT NOT NULL,
        level TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        correlation_id UUID,
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
    async flushEventBuffer() {
        if (this.eventBuffer.length === 0)
            return;
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
                .map((_, i) => `($${i * 25 + 1}, $${i * 25 + 2}, $${i * 25 + 3}, $${i * 25 + 4}, $${i * 25 + 5}, 
         $${i * 25 + 6}, $${i * 25 + 7}, $${i * 25 + 8}, $${i * 25 + 9}, $${i * 25 + 10},
         $${i * 25 + 11}, $${i * 25 + 12}, $${i * 25 + 13}, $${i * 25 + 14}, $${i * 25 + 15},
         $${i * 25 + 16}, $${i * 25 + 17}, $${i * 25 + 18}, $${i * 25 + 19}, $${i * 25 + 20},
         $${i * 25 + 21}, $${i * 25 + 22}, $${i * 25 + 23}, $${i * 25 + 24}, $${i * 25 + 25})`)
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
            this.logger.debug({
                flushedEvents: eventsToFlush.length,
            }, 'Audit events flushed to database');
        }
        catch (error) {
            // Re-add events to buffer if flush fails
            this.eventBuffer.unshift(...eventsToFlush);
            throw error;
        }
    }
    calculateEventHash(event) {
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
        return (0, crypto_1.createHash)('sha256')
            .update(JSON.stringify(hashableData, Object.keys(hashableData).sort()))
            .digest('hex');
    }
    signEvent(event) {
        return sign({
            id: event.id,
            hash: event.hash,
            timestamp: event.timestamp.toISOString(),
        }, this.signingKey, { algorithm: 'HS256' });
    }
    verifyEventSignature(event) {
        try {
            const payload = verify(event.signature, this.signingKey);
            return payload.id === event.id && payload.hash === event.hash;
        }
        catch {
            return false;
        }
    }
    deserializeEvent(row) {
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
    analyzeComplianceViolations(events, framework) {
        const violations = [];
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
    detectSoxViolations(events) {
        const violations = [];
        // Example: Detect unauthorized access to financial data
        const financialAccess = events.filter((e) => e.resourceType === 'financial_data' && e.outcome === 'failure');
        for (const event of financialAccess) {
            violations.push({
                eventId: event.id,
                violationType: 'unauthorized_financial_access',
                severity: 'high',
                description: 'Unauthorized access attempt to financial data',
                remediation: 'Review user permissions and implement additional access controls',
            });
        }
        return violations;
    }
    detectGdprViolations(events) {
        const violations = [];
        // Example: Detect data export without proper approval
        const dataExports = events.filter((e) => e.eventType === 'data_export' && e.dataClassification === 'restricted');
        for (const event of dataExports) {
            violations.push({
                eventId: event.id,
                violationType: 'unauthorized_data_export',
                severity: 'critical',
                description: 'Export of restricted personal data without proper approval',
                remediation: 'Implement data export approval workflow and review data handling procedures',
            });
        }
        return violations;
    }
    detectSoc2Violations(events) {
        // Similar implementation for SOC2
        return [];
    }
    calculateComplianceScore(events, violations, framework) {
        if (events.length === 0)
            return 100;
        const criticalViolations = violations.filter((v) => v.severity === 'critical').length;
        const highViolations = violations.filter((v) => v.severity === 'high').length;
        const mediumViolations = violations.filter((v) => v.severity === 'medium').length;
        const lowViolations = violations.filter((v) => v.severity === 'low').length;
        // Weighted scoring
        const totalPenalty = criticalViolations * 20 +
            highViolations * 10 +
            mediumViolations * 5 +
            lowViolations * 1;
        const score = Math.max(0, 100 - (totalPenalty / events.length) * 100);
        return Math.round(score * 100) / 100;
    }
    generateComplianceRecommendations(violations, framework) {
        const recommendations = [];
        const criticalCount = violations.filter((v) => v.severity === 'critical').length;
        if (criticalCount > 0) {
            recommendations.push(`Address ${criticalCount} critical violations immediately`);
        }
        const highCount = violations.filter((v) => v.severity === 'high').length;
        if (highCount > 0) {
            recommendations.push(`Review and remediate ${highCount} high-severity violations`);
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
    calculateActorRiskScore(events) {
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
        const sensitiveAccess = events.filter((e) => e.dataClassification === 'restricted' ||
            e.dataClassification === 'confidential').length;
        riskScore += sensitiveAccess * 15;
        return Math.min(100, riskScore);
    }
    async detectAnomalies(events) {
        const anomalies = [];
        // Detect unusual activity patterns
        const timeSpan = events.length > 0
            ? events[events.length - 1].timestamp.getTime() -
                events[0].timestamp.getTime()
            : 0;
        if (timeSpan > 0) {
            const avgInterval = timeSpan / events.length;
            // Detect burst activity
            let burstCount = 0;
            for (let i = 1; i < events.length; i++) {
                const interval = events[i].timestamp.getTime() - events[i - 1].timestamp.getTime();
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
                description: 'High rate of failed operations indicating possible attack',
                severity: 85,
                events: failures.map((e) => e.id),
            });
        }
        return anomalies;
    }
    async processRealTimeAlerts(event) {
        if (!this.redis)
            return;
        if (typeof this.redis.publish !== 'function')
            return;
        // Implement real-time alerting logic
        if (event.level === 'critical' || event.eventType === 'security_alert') {
            await this.redis.publish('audit:critical', JSON.stringify(event));
        }
        if (event.complianceRelevant) {
            await this.redis.publish('audit:compliance', JSON.stringify(event));
        }
    }
    async storeComplianceReport(report) {
        await this.db.query(`
      INSERT INTO compliance_reports (framework, period_start, period_end, report_data)
      VALUES ($1, $2, $3, $4)
    `, [
            report.framework,
            report.period.start,
            report.period.end,
            JSON.stringify(report),
        ]);
    }
    async storeForensicAnalysis(analysis) {
        await this.db.query(`
      INSERT INTO forensic_analyses (correlation_id, analysis_data)
      VALUES ($1, $2)
    `, [analysis.correlationId, JSON.stringify(analysis)]);
    }
    async gracefulShutdown() {
        this.logger.info('Shutting down audit system gracefully');
        clearInterval(this.flushInterval);
        if (this.retentionInterval) {
            clearInterval(this.retentionInterval);
        }
        await this.flushEventBuffer();
        this.logger.info('Audit system shutdown complete');
    }
}
exports.AdvancedAuditSystem = AdvancedAuditSystem;
// Export singleton instance getter
// This allows lazy initialization with correct dependencies
const getAuditSystem = () => AdvancedAuditSystem.getInstance();
exports.getAuditSystem = getAuditSystem;
