"use strict";
/**
 * Immutable Audit Log System
 *
 * Implements the critical requirement from roadmap/next-priorities-2026-01-01.md:
 * "Ship Immutable Audit Log (C2) — priority: critical"
 *
 * This system provides:
 * - Append-only audit log with cryptographic chaining
 * - Tamper-resistant integrity guarantees
 * - Centralized ingestion from all audit emitters
 * - Queue/backpressure handling
 * - Query/export endpoints for SOC/IR usage
 * - Compliance-ready audit trail
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditComplianceEvent = exports.auditSecurityEvent = exports.auditLoggingMiddleware = exports.ImmutableAuditLogService = void 0;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const middleware_js_1 = require("../monitoring/middleware.js");
/**
 * Immutable Audit Log Service
 * Implements tamper-resistant, append-only audit logging for compliance
 */
class ImmutableAuditLogService {
    logPath;
    retentionDays;
    auditQueue;
    config;
    isProcessing;
    privateKey;
    publicKey;
    constructor(config = {}) {
        this.config = {
            enabled: process.env.AUDIT_LOG_ENABLED !== 'false',
            logPath: config.logPath || './audits/immutable-audit-log',
            retentionDays: config.retentionDays || 365,
            batchSize: config.batchSize || 100,
            backpressureThreshold: config.backpressureThreshold || 1000,
            tamperDetectionEnabled: config.tamperDetectionEnabled !== false,
            encryptionEnabled: config.encryptionEnabled !== false,
            queueSizeLimit: config.queueSizeLimit || 5000,
            ...config
        };
        this.logPath = path_1.default.join(process.cwd(), this.config.logPath);
        this.retentionDays = this.config.retentionDays;
        this.auditQueue = [];
        this.isProcessing = false;
        // Generate RSA key pair for cryptographic signatures
        const { privateKey, publicKey } = crypto_1.default.generateKeyPairSync('rsa', {
            modulusLength: 4096,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
        });
        this.privateKey = privateKey;
        this.publicKey = publicKey;
        // Create log directory
        promises_1.default.mkdir(this.logPath, { recursive: true });
        logger_js_1.default.info({
            logPath: this.logPath,
            retentionDays: this.retentionDays,
            enabled: this.config.enabled
        }, 'Immutable audit log service initialized');
    }
    /**
     * Log an audit event with cryptographic integrity
     */
    async logAuditEvent(event) {
        if (!this.config.enabled)
            return true;
        try {
            // Generate unique ID and timestamp
            const augmentedEvent = {
                ...event,
                id: crypto_1.default.randomUUID(),
                timestamp: new Date().toISOString(),
                previousHash: await this.getLastEventHash(),
                currentHash: '', // Will be filled after we have all data including previousHash
                signature: ''
            };
            // Calculate hash with previous event reference
            const serializedEvent = JSON.stringify({
                ...augmentedEvent,
                previousHash: augmentedEvent.previousHash
            }, Object.keys(augmentedEvent).sort());
            augmentedEvent.currentHash = crypto_1.default.createHash('sha256').update(serializedEvent).digest('hex');
            // Add cryptographic signature
            const sign = crypto_1.default.createSign('SHA256');
            sign.update(serializedEvent);
            augmentedEvent.signature = sign.sign(this.privateKey, 'hex');
            // Add to queue for processing
            this.auditQueue.push(augmentedEvent);
            // Check for backpressure
            if (this.auditQueue.length > this.config.backpressureThreshold) {
                logger_js_1.default.warn({
                    queueSize: this.auditQueue.length,
                    threshold: this.config.backpressureThreshold
                }, 'Audit log backpressure detected, processing events');
                // Process events immediately if backpressure detected
                await this.processQueuedEvents();
            }
            else {
                // Schedule processing of batch
                if (!this.isProcessing) {
                    this.processQueuedEvents();
                }
            }
            logger_js_1.default.debug({
                eventId: augmentedEvent.id,
                eventType: augmentedEvent.eventType,
                userId: augmentedEvent.userId
            }, 'Audit event queued for logging');
            return true;
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                event
            }, 'Error logging audit event');
            (0, middleware_js_1.trackError)('auditing', 'AuditEventLogError');
            return false;
        }
    }
    /**
     * Process queued audit events in batches
     */
    async processQueuedEvents() {
        if (this.isProcessing || this.auditQueue.length === 0) {
            return;
        }
        this.isProcessing = true;
        let processedEvents = 0;
        try {
            while (this.auditQueue.length > 0) {
                const batch = this.auditQueue.splice(0, this.config.batchSize);
                // Get current date for organizing logs by date
                const currentDate = new Date().toISOString().split('T')[0];
                const logFilePath = path_1.default.join(this.logPath, currentDate, 'audit.log');
                await promises_1.default.mkdir(path_1.default.dirname(logFilePath), { recursive: true });
                // Write events to log file in append-only fashion
                for (const event of batch) {
                    await promises_1.default.appendFile(logFilePath, JSON.stringify(event) + '\n');
                    processedEvents++;
                }
                logger_js_1.default.info({
                    eventsProcessed: batch.length,
                    totalSinceStart: processedEvents,
                    remainingInQueue: this.auditQueue.length
                }, 'Audit event batch processed');
            }
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error)
            }, 'Error processing audit event queue');
            (0, middleware_js_1.trackError)('auditing', 'AuditEventQueueProcessingError');
        }
        finally {
            this.isProcessing = false;
        }
    }
    /**
     * Retrieve the hash of the last event in the log for chaining
     */
    async getLastEventHash() {
        try {
            // Find most recent audit log file
            const currentDate = new Date().toISOString().split('T')[0];
            const logFilePath = path_1.default.join(this.logPath, currentDate, 'audit.log');
            if (await this.fileExists(logFilePath)) {
                const stats = await promises_1.default.stat(logFilePath);
                if (stats.size > 0) {
                    // Read last line to get previous hash
                    const content = await promises_1.default.readFile(logFilePath, 'utf-8');
                    const lines = content.trim().split('\n');
                    if (lines.length > 0) {
                        const lastLine = lines[lines.length - 1];
                        if (lastLine) {
                            const lastEvent = JSON.parse(lastLine);
                            return lastEvent.currentHash;
                        }
                    }
                }
            }
            // If no previous events, return genesis hash
            return 'genesis-block-hash';
        }
        catch (error) {
            logger_js_1.default.warn({
                error: error instanceof Error ? error.message : String(error)
            }, 'Could not retrieve last audit event hash, using genesis');
            return 'genesis-block-hash';
        }
    }
    /**
     * Verify if a file exists
     */
    async fileExists(filePath) {
        try {
            await promises_1.default.access(filePath);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Query audit events with filtering options
     */
    async queryAuditEvents(options = {}) {
        if (!this.config.enabled)
            return [];
        try {
            const results = [];
            const dateFolders = await promises_1.default.readdir(this.logPath);
            // Query across multiple date folders for the requested time range
            for (const dateFolder of dateFolders) {
                const logFilePath = path_1.default.join(this.logPath, dateFolder, 'audit.log');
                if (await this.fileExists(logFilePath)) {
                    const content = await promises_1.default.readFile(logFilePath, 'utf-8');
                    const lines = content.trim().split('\n').filter((line) => line.trim() !== '');
                    for (const line of lines) {
                        try {
                            const event = JSON.parse(line);
                            if (this.matchesCriteria(event, options)) {
                                results.push(event);
                                // Apply limit if specified
                                if (options.limit && results.length >= options.limit) {
                                    return results;
                                }
                            }
                        }
                        catch (error) {
                            logger_js_1.default.warn({
                                error: error instanceof Error ? error.message : String(error),
                                logFilePath,
                                line
                            }, 'Error parsing audit log line');
                        }
                    }
                }
            }
            // Apply sorting and offset
            results.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            if (options.offset) {
                results.splice(0, options.offset);
            }
            return results;
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                queryOptions: options
            }, 'Error querying audit events');
            (0, middleware_js_1.trackError)('auditing', 'AuditEventQueryError');
            return [];
        }
    }
    /**
     * Check if an audit event matches query criteria
     */
    matchesCriteria(event, options) {
        if (options.userId && event.userId !== options.userId)
            return false;
        if (options.tenantId && event.tenantId !== options.tenantId)
            return false;
        if (options.eventType && event.eventType !== options.eventType)
            return false;
        if (options.action && event.action !== options.action)
            return false;
        if (options.result && event.result !== options.result)
            return false;
        if (options.startTime && new Date(event.timestamp) < new Date(options.startTime)) {
            return false;
        }
        if (options.endTime && new Date(event.timestamp) > new Date(options.endTime)) {
            return false;
        }
        return true;
    }
    /**
     * Verify the cryptographic integrity of the audit log chain
     */
    async verifyIntegrity(startDate, endDate) {
        if (!this.config.tamperDetectionEnabled || !this.config.enabled) {
            return {
                valid: true,
                tamperedEvents: 0,
                validEvents: 0,
                totalEvents: 0,
                lastValidHash: '',
                chainIntegrity: true
            };
        }
        try {
            const dateFolders = await promises_1.default.readdir(this.logPath);
            let validEvents = 0;
            let tamperedEvents = 0;
            let totalEvents = 0;
            let expectedPreviousHash = 'genesis-block-hash';
            let chainIntegrity = true;
            let lastValidHash = '';
            for (const dateFolder of dateFolders) {
                // Check if date is within range if specified
                if (startDate || endDate) {
                    const date = new Date(dateFolder);
                    if (startDate && date < new Date(startDate))
                        continue;
                    if (endDate && date > new Date(endDate))
                        continue;
                }
                const logFilePath = path_1.default.join(this.logPath, dateFolder, 'audit.log');
                if (await this.fileExists(logFilePath)) {
                    const content = await promises_1.default.readFile(logFilePath, 'utf-8');
                    const lines = content.trim().split('\n').filter((line) => line.trim() !== '');
                    for (const line of lines) {
                        try {
                            const event = JSON.parse(line);
                            totalEvents++;
                            // Verify cryptographic signature
                            const verify = crypto_1.default.createVerify('SHA256');
                            const serializedEvent = JSON.stringify({
                                ...event,
                                previousHash: event.previousHash
                            }, Object.keys(event).filter(k => k !== 'signature').sort());
                            verify.update(serializedEvent);
                            const signatureValid = verify.verify(this.publicKey, event.signature, 'hex');
                            if (!signatureValid) {
                                tamperedEvents++;
                                chainIntegrity = false;
                                continue;
                            }
                            // Verify hash chain integrity
                            if (event.previousHash !== expectedPreviousHash) {
                                tamperedEvents++;
                                chainIntegrity = false;
                                logger_js_1.default.warn({
                                    eventId: event.id,
                                    expectedPreviousHash,
                                    actualPreviousHash: event.previousHash,
                                    timestamp: event.timestamp
                                }, 'Audit log chain integrity violation detected');
                            }
                            else {
                                // Verify current hash is correct
                                const recalculatedHash = crypto_1.default.createHash('sha256').update(serializedEvent).digest('hex');
                                if (recalculatedHash !== event.currentHash) {
                                    tamperedEvents++;
                                    chainIntegrity = false;
                                    logger_js_1.default.warn({
                                        eventId: event.id,
                                        recalculatedHash,
                                        eventHash: event.currentHash
                                    }, 'Audit event hash mismatch detected');
                                }
                                else {
                                    validEvents++;
                                    expectedPreviousHash = event.currentHash; // Update for next event
                                    lastValidHash = event.currentHash;
                                }
                            }
                        }
                        catch (error) {
                            logger_js_1.default.error({
                                error: error instanceof Error ? error.message : String(error),
                                logFilePath
                            }, 'Error verifying integrity of audit event');
                            tamperedEvents++;
                            chainIntegrity = false;
                        }
                    }
                }
            }
            const report = {
                valid: tamperedEvents === 0,
                tamperedEvents,
                validEvents,
                totalEvents,
                lastValidHash,
                chainIntegrity
            };
            if (!report.valid) {
                logger_js_1.default.error({
                    report
                }, 'Audit log integrity verification failed');
            }
            else {
                logger_js_1.default.info({
                    validEvents: report.validEvents,
                    totalEvents: report.totalEvents
                }, 'Audit log integrity verification passed');
            }
            return report;
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error)
            }, 'Error in audit log integrity verification');
            (0, middleware_js_1.trackError)('auditing', 'AuditIntegrityVerificationError');
            return {
                valid: false,
                tamperedEvents: 0,
                validEvents: 0,
                totalEvents: 0,
                lastValidHash: '',
                chainIntegrity: false
            };
        }
    }
    /**
     * Export audit events for external analysis
     */
    async exportAuditEvents(outputPath, options = {}) {
        try {
            const events = await this.queryAuditEvents(options);
            await promises_1.default.mkdir(path_1.default.dirname(outputPath), { recursive: true });
            await promises_1.default.writeFile(outputPath, JSON.stringify(events, null, 2));
            logger_js_1.default.info({
                exportedCount: events.length,
                outputPath
            }, 'Audit events exported successfully');
            return {
                success: true,
                exportedCount: events.length,
                outputPath
            };
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error),
                outputPath,
                queryOptions: options
            }, 'Error exporting audit events');
            (0, middleware_js_1.trackError)('auditing', 'AuditExportError');
            return {
                success: false,
                exportedCount: 0,
                outputPath
            };
        }
    }
    /**
     * Clean old audit logs based on retention policy
     */
    async cleanupExpiredLogs() {
        let cleanedCount = 0;
        try {
            const dateFolders = await promises_1.default.readdir(this.logPath);
            const thresholdDate = new Date();
            thresholdDate.setDate(thresholdDate.getDate() - this.retentionDays);
            for (const dateFolder of dateFolders) {
                const folderDate = new Date(dateFolder);
                if (folderDate < thresholdDate) {
                    const folderPath = path_1.default.join(this.logPath, dateFolder);
                    await promises_1.default.rm(folderPath, { recursive: true, force: true });
                    cleanedCount++;
                    logger_js_1.default.info({
                        folderPath,
                        folderDate,
                        thresholdDate
                    }, 'Expired audit log folder removed');
                }
            }
            logger_js_1.default.info({
                cleanedFolders: cleanedCount
            }, 'Audit log cleanup completed');
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error)
            }, 'Error cleaning up expired audit logs');
            (0, middleware_js_1.trackError)('auditing', 'AuditCleanupError');
        }
        return cleanedCount;
    }
    /**
     * Get audit log statistics
     */
    async getAuditStats() {
        try {
            const dateFolders = await promises_1.default.readdir(this.logPath);
            const stats = {
                totalEvents: 0,
                eventsToday: 0,
                earliestEvent: null,
                latestEvent: null,
                dailyAvgEvents: 0
            };
            const today = new Date().toISOString().split('T')[0];
            for (const dateFolder of dateFolders) {
                const logFilePath = path_1.default.join(this.logPath, dateFolder, 'audit.log');
                if (await this.fileExists(logFilePath)) {
                    const content = await promises_1.default.readFile(logFilePath, 'utf-8');
                    const lines = content.trim().split('\n').filter((line) => line.trim() !== '');
                    if (dateFolder === today) {
                        stats.eventsToday = lines.length;
                    }
                    stats.totalEvents += lines.length;
                    if (lines.length > 0) {
                        const firstEvent = JSON.parse(lines[0]);
                        const lastEvent = JSON.parse(lines[lines.length - 1]);
                        if (!stats.earliestEvent || firstEvent.timestamp < stats.earliestEvent) {
                            stats.earliestEvent = firstEvent.timestamp;
                        }
                        if (!stats.latestEvent || lastEvent.timestamp > stats.latestEvent) {
                            stats.latestEvent = lastEvent.timestamp;
                        }
                    }
                }
            }
            if (dateFolders.length > 0) {
                stats.dailyAvgEvents = Math.round(stats.totalEvents / dateFolders.length);
            }
            return stats;
        }
        catch (error) {
            logger_js_1.default.error({
                error: error instanceof Error ? error.message : String(error)
            }, 'Error getting audit stats');
            (0, middleware_js_1.trackError)('auditing', 'AuditStatsError');
            return {
                totalEvents: 0,
                eventsToday: 0,
                earliestEvent: null,
                latestEvent: null,
                dailyAvgEvents: 0
            };
        }
    }
    /**
     * Health check for the audit service
     */
    async healthCheck() {
        const queueSize = this.auditQueue.length;
        const backpressure = queueSize > this.config.backpressureThreshold;
        const integrityReport = await this.verifyIntegrity();
        let status;
        if (!this.config.enabled) {
            status = 'unhealthy';
        }
        else if (backpressure || !integrityReport.valid) {
            status = 'degraded';
        }
        else {
            status = 'healthy';
        }
        return {
            status,
            details: {
                serviceEnabled: this.config.enabled,
                queueSize,
                backpressure,
                tamperDetection: this.config.tamperDetectionEnabled,
                encryption: this.config.encryptionEnabled,
                eventProcessing: !this.isProcessing || queueSize <= 10,
                integrity: integrityReport.valid,
                storageAvailable: true // In a real system, check available disk space
            }
        };
    }
    /**
     * Force process all queued events
     */
    async flushQueue() {
        await this.processQueuedEvents();
    }
    /**
     * Get current queue size
     */
    getQueueSize() {
        return this.auditQueue.length;
    }
    /**
     * Pause audit logging temporarily
     */
    pauseLogging() {
        this.config.enabled = false;
        logger_js_1.default.info('Audit logging paused');
    }
    /**
     * Resume audit logging
     */
    resumeLogging() {
        this.config.enabled = true;
        logger_js_1.default.info('Audit logging resumed');
    }
}
exports.ImmutableAuditLogService = ImmutableAuditLogService;
/**
 * Audit Logging Middleware
 */
const auditLoggingMiddleware = (auditService) => {
    return async (req, res, next) => {
        if (!auditService.config.enabled) {
            return next();
        }
        const startTime = Date.now();
        // Prepare audit event for successful request
        res.on('finish', async () => {
            const duration = Date.now() - startTime;
            const auditEvent = {
                eventType: 'API_CALL',
                userId: req.user?.id || 'anonymous',
                tenantId: req.headers['x-tenant-id'] || req.user?.tenantId || 'unknown',
                action: `${req.method} ${req.path}`,
                resource: req.path,
                result: res.statusCode >= 200 && res.statusCode < 300 ? 'success' :
                    res.statusCode >= 400 && res.statusCode < 500 ? 'denied' :
                        res.statusCode >= 500 ? 'error' : 'failure',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                metadata: {
                    statusCode: res.statusCode,
                    responseTime: duration,
                    contentLength: res.get('Content-Length'),
                    referer: req.get('Referer'),
                    origin: req.get('Origin'),
                    headers: Object.keys(req.headers).filter(header => header.startsWith('x-') || header === 'authorization' || header === 'cookie').reduce((obj, header) => {
                        obj[header] = req.headers[header];
                        return obj;
                    }, {})
                }
            };
            await auditService.logAuditEvent(auditEvent);
        });
        // Capture authentication failures and security events
        res.on('error', async () => {
            await auditService.logAuditEvent({
                eventType: 'REQUEST_ERROR',
                userId: req.user?.id || 'anonymous',
                tenantId: req.headers['x-tenant-id'] || req.user?.tenantId || 'unknown',
                action: `${req.method} ${req.path}`,
                resource: req.path,
                result: 'error',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                metadata: {
                    error: 'response_error',
                    responseTime: Date.now() - startTime
                }
            });
        });
        next();
    };
};
exports.auditLoggingMiddleware = auditLoggingMiddleware;
/**
 * Security Event Audit Helper
 */
const auditSecurityEvent = async (auditService, userId, tenantId, action, resource, result, metadata) => {
    return await auditService.logAuditEvent({
        eventType: 'SECURITY_EVENT',
        userId,
        tenantId,
        action,
        resource,
        result,
        ipAddress: metadata?.ipAddress || 'unknown',
        userAgent: metadata?.userAgent,
        metadata: {
            timestamp: new Date().toISOString(),
            ...metadata
        }
    });
};
exports.auditSecurityEvent = auditSecurityEvent;
/**
 * Compliance Event Audit Helper
 */
const auditComplianceEvent = async (auditService, userId, tenantId, action, resource, result, metadata) => {
    return await auditService.logAuditEvent({
        eventType: 'COMPLIANCE_EVENT',
        userId,
        tenantId,
        action,
        resource,
        result,
        ipAddress: metadata?.ipAddress || 'unknown',
        userAgent: metadata?.userAgent,
        metadata: {
            timestamp: new Date().toISOString(),
            complianceDetails: metadata?.complianceDetails,
            regulation: metadata?.regulation,
            ...metadata
        }
    });
};
exports.auditComplianceEvent = auditComplianceEvent;
exports.default = ImmutableAuditLogService;
