"use strict";
/**
 * Biometric Service
 *
 * Core service for biometric processing, enrollment, verification,
 * identification, and watchlist screening.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.BiometricService = void 0;
const express_1 = __importDefault(require("express"));
const pg_1 = require("pg");
const redis_1 = require("redis");
const config = {
    port: parseInt(process.env.BIOMETRIC_SERVICE_PORT || '8080', 10),
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432', 10),
        database: process.env.DB_NAME || 'biometrics',
        user: process.env.DB_USER || 'biometric_user',
        password: process.env.DB_PASSWORD || ''
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10)
    },
    security: {
        enableEncryption: process.env.ENABLE_ENCRYPTION === 'true',
        enableAudit: process.env.ENABLE_AUDIT !== 'false',
        retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10)
    },
    processing: {
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT || '10', 10),
        timeout: parseInt(process.env.PROCESSING_TIMEOUT || '30000', 10)
    }
};
exports.config = config;
// ============================================================================
// Database and Cache Connections
// ============================================================================
const pool = new pg_1.Pool(config.database);
const redis = (0, redis_1.createClient)({
    socket: {
        host: config.redis.host,
        port: config.redis.port
    }
});
// ============================================================================
// Service Class
// ============================================================================
class BiometricService {
    /**
     * Enroll a new person with biometric data
     */
    async enrollPerson(data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const personId = crypto.randomUUID();
            const now = new Date().toISOString();
            // Insert person record
            await client.query(`INSERT INTO biometric_persons (person_id, status, enrollment_date, last_update, metadata)
         VALUES ($1, $2, $3, $4, $5)`, [personId, 'ACTIVE', now, now, JSON.stringify(data.metadata || {})]);
            // Insert biometric templates
            for (const template of data.templates) {
                await client.query(`INSERT INTO biometric_templates (
            template_id, person_id, modality, format, data, quality_score,
            quality_data, capture_date, source, device_id, position,
            compressed, encrypted, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`, [
                    template.id,
                    personId,
                    template.modality,
                    template.format,
                    template.data,
                    template.quality.score,
                    JSON.stringify(template.quality),
                    template.captureDate,
                    template.source,
                    template.deviceId,
                    template.position,
                    template.compressed,
                    template.encrypted,
                    JSON.stringify(template.metadata || {})
                ]);
            }
            await client.query('COMMIT');
            // Log audit event
            await this.logAuditEvent({
                eventType: 'ENROLLMENT',
                personId,
                operation: 'enroll_person',
                result: 'SUCCESS'
            });
            return {
                personId,
                templates: data.templates,
                enrollmentDate: now,
                lastUpdate: now,
                status: 'ACTIVE',
                metadata: data.metadata
            };
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    /**
     * Perform 1:1 biometric verification
     */
    async verifyBiometric(request) {
        // Implementation would integrate with biometric matching algorithms
        // This is a placeholder structure
        console.log('Verification request:', request.requestId);
        await this.logAuditEvent({
            eventType: 'VERIFICATION',
            operation: 'verify_biometric',
            result: 'SUCCESS'
        });
        return true;
    }
    /**
     * Perform 1:N biometric identification
     */
    async identifyBiometric(search) {
        // Implementation would integrate with biometric search algorithms
        console.log('Identification search:', search.searchId);
        await this.logAuditEvent({
            eventType: 'IDENTIFICATION',
            operation: 'identify_biometric',
            result: 'SUCCESS'
        });
        return [];
    }
    /**
     * Screen against watchlists
     */
    async screenWatchlists(request) {
        const client = await pool.connect();
        try {
            // Query watchlists
            const watchlistsResult = await client.query(`SELECT * FROM watchlists WHERE active = true`);
            // Perform screening (placeholder logic)
            const result = {
                resultId: crypto.randomUUID(),
                requestId: request.requestId,
                status: 'NO_MATCH',
                matches: [],
                riskScore: 0,
                riskLevel: 'NONE',
                recommendation: 'CLEAR',
                processingTime: 100,
                timestamp: new Date().toISOString()
            };
            // Store result
            await client.query(`INSERT INTO screening_results (
          result_id, request_id, status, matches, risk_score,
          risk_level, recommendation, processing_time, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
                result.resultId,
                result.requestId,
                result.status,
                JSON.stringify(result.matches),
                result.riskScore,
                result.riskLevel,
                result.recommendation,
                result.processingTime,
                JSON.stringify({})
            ]);
            return result;
        }
        finally {
            client.release();
        }
    }
    /**
     * Get person by ID
     */
    async getPerson(personId) {
        const client = await pool.connect();
        try {
            const result = await client.query(`SELECT * FROM biometric_persons WHERE person_id = $1`, [personId]);
            if (result.rows.length === 0) {
                return null;
            }
            const row = result.rows[0];
            // Get templates
            const templatesResult = await client.query(`SELECT * FROM biometric_templates WHERE person_id = $1`, [personId]);
            return {
                personId: row.person_id,
                templates: templatesResult.rows.map(t => ({
                    id: t.template_id,
                    modality: t.modality,
                    format: t.format,
                    data: t.data,
                    quality: t.quality_data,
                    captureDate: t.capture_date,
                    source: t.source,
                    deviceId: t.device_id,
                    position: t.position,
                    compressed: t.compressed,
                    encrypted: t.encrypted,
                    metadata: t.metadata
                })),
                enrollmentDate: row.enrollment_date,
                lastUpdate: row.last_update,
                status: row.status,
                riskScore: row.risk_score,
                metadata: row.metadata
            };
        }
        finally {
            client.release();
        }
    }
    /**
     * Log audit event
     */
    async logAuditEvent(event) {
        if (!config.security.enableAudit) {
            return;
        }
        const client = await pool.connect();
        try {
            const eventId = crypto.randomUUID();
            const now = new Date().toISOString();
            const retentionExpiry = new Date(Date.now() + config.security.retentionDays * 24 * 60 * 60 * 1000).toISOString();
            await client.query(`INSERT INTO biometric_audit_events (
          event_id, event_type, person_id, user_id, user_role,
          operation, modalities, result, details, ip_address,
          location, timestamp, retention_expiry
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
                eventId,
                event.eventType,
                event.personId || null,
                'system', // Would be actual user ID
                'system',
                event.operation,
                event.modalities || [],
                event.result,
                JSON.stringify(event.details || {}),
                null,
                null,
                now,
                retentionExpiry
            ]);
        }
        finally {
            client.release();
        }
    }
}
exports.BiometricService = BiometricService;
// ============================================================================
// Express API
// ============================================================================
const app = (0, express_1.default)();
const service = new BiometricService();
app.use(express_1.default.json({ limit: '50mb' }));
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});
// Enroll person
app.post('/api/v1/enroll', async (req, res, next) => {
    try {
        const result = await service.enrollPerson(req.body);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Verify biometric
app.post('/api/v1/verify', async (req, res, next) => {
    try {
        const result = await service.verifyBiometric(req.body);
        res.json({ verified: result });
    }
    catch (error) {
        next(error);
    }
});
// Identify biometric
app.post('/api/v1/identify', async (req, res, next) => {
    try {
        const result = await service.identifyBiometric(req.body);
        res.json({ candidates: result });
    }
    catch (error) {
        next(error);
    }
});
// Screen watchlists
app.post('/api/v1/screen', async (req, res, next) => {
    try {
        const result = await service.screenWatchlists(req.body);
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Get person
app.get('/api/v1/persons/:personId', async (req, res, next) => {
    try {
        const result = await service.getPerson(req.params.personId);
        if (!result) {
            res.status(404).json({ error: 'Person not found' });
            return;
        }
        res.json(result);
    }
    catch (error) {
        next(error);
    }
});
// Error handler
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});
// ============================================================================
// Service Startup
// ============================================================================
async function start() {
    try {
        // Connect to Redis
        await redis.connect();
        console.log('Connected to Redis');
        // Test database connection
        await pool.query('SELECT NOW()');
        console.log('Connected to PostgreSQL');
        // Start server
        app.listen(config.port, () => {
            console.log(`Biometric service listening on port ${config.port}`);
        });
    }
    catch (error) {
        console.error('Failed to start service:', error);
        process.exit(1);
    }
}
// Handle shutdown
process.on('SIGTERM', async () => {
    console.log('Shutting down...');
    await redis.quit();
    await pool.end();
    process.exit(0);
});
// Start if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    start();
}
