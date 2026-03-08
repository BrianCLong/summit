"use strict";
// @ts-nocheck
/**
 * Human-in-the-Loop Labeling Service
 * Provides reviewer queues, adjudication workflows, inter-rater agreement stats,
 * and full cryptographically-signed audit trails
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const helmet_1 = __importDefault(require("@fastify/helmet"));
const pg_1 = require("pg");
const index_js_1 = require("./types/index.js");
const crypto_js_1 = require("./utils/crypto.js");
const reviews_js_1 = require("./routes/reviews.js");
const queues_js_1 = require("./routes/queues.js");
const adjudication_js_1 = require("./routes/adjudication.js");
const analytics_js_1 = require("./routes/analytics.js");
const PORT = parseInt(process.env.PORT || '4020');
const NODE_ENV = process.env.NODE_ENV || 'development';
// Database connection
const pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL ||
        'postgres://postgres:postgres@localhost:5432/labeling',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
// In-memory key storage (should use secure key management in production)
let servicePrivateKey;
let servicePublicKey;
async function authMiddleware(request, reply) {
    // Skip auth for health checks
    if (request.url === '/health') {
        return;
    }
    // In production, verify JWT token and extract user ID
    // For demo, we use headers
    const userId = request.headers['x-user-id'];
    if (!userId) {
        return reply.status(401).send({
            error: 'Unauthorized',
            message: 'Missing x-user-id header',
        });
    }
    // Get user roles from database
    const rolesResult = await pool.query('SELECT role FROM user_roles WHERE user_id = $1', [userId]);
    request.userId = userId;
    request.userRoles = rolesResult.rows.map((row) => row.role);
    // If no roles, default to labeler
    if (request.userRoles.length === 0) {
        request.userRoles = [index_js_1.UserRole.LABELER];
    }
}
function requireRole(...roles) {
    return async (request, reply) => {
        if (!request.userRoles) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: 'No roles assigned',
            });
        }
        const hasRole = roles.some((role) => request.userRoles?.includes(role));
        if (!hasRole) {
            return reply.status(403).send({
                error: 'Forbidden',
                message: `Requires one of: ${roles.join(', ')}`,
            });
        }
    };
}
// ============================================================================
// Audit Trail Helper
// ============================================================================
async function createAuditEvent(data) {
    const id = (0, crypto_js_1.generateAuditId)();
    const timestamp = new Date().toISOString();
    const eventData = {
        id,
        eventType: data.eventType,
        userId: data.userId,
        entityId: data.entityId,
        labelId: data.labelId,
        reviewId: data.reviewId,
        adjudicationId: data.adjudicationId,
        queueId: data.queueId,
        beforeState: data.beforeState,
        afterState: data.afterState,
        reasoning: data.reasoning,
        metadata: data.metadata || {},
        timestamp,
    };
    // Sign the audit event
    const signature = await (0, crypto_js_1.signData)(eventData, servicePrivateKey);
    const result = await pool.query(`INSERT INTO audit_events (
      id, event_type, user_id, entity_id, label_id, review_id,
      adjudication_id, queue_id, before_state, after_state,
      reasoning, metadata, timestamp, signature, signature_algorithm, public_key
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
    RETURNING *`, [
        id,
        data.eventType,
        data.userId,
        data.entityId,
        data.labelId,
        data.reviewId,
        data.adjudicationId,
        data.queueId,
        JSON.stringify(data.beforeState || {}),
        JSON.stringify(data.afterState || {}),
        data.reasoning,
        JSON.stringify(data.metadata || {}),
        timestamp,
        signature,
        'ed25519',
        servicePublicKey,
    ]);
    return result.rows[0];
}
// ============================================================================
// Fastify Server Setup
// ============================================================================
const server = (0, fastify_1.default)({
    logger: {
        level: NODE_ENV === 'development' ? 'debug' : 'info',
        ...(NODE_ENV === 'development'
            ? { transport: { target: 'pino-pretty' } }
            : {}),
    },
});
// Register plugins
server.register(helmet_1.default);
server.register(cors_1.default, {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
});
// Add auth middleware
server.addHook('preHandler', authMiddleware);
// ============================================================================
// Health Check
// ============================================================================
server.get('/health', async (request, reply) => {
    try {
        await pool.query('SELECT 1');
        return {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            dependencies: {
                database: 'healthy',
            },
        };
    }
    catch (error) {
        reply.status(503);
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            dependencies: {
                database: 'unhealthy',
            },
        };
    }
});
// ============================================================================
// Label Endpoints (basic CRUD)
// ============================================================================
// Create label
server.post('/labels', {
    schema: { body: index_js_1.CreateLabelSchema },
    preHandler: requireRole(index_js_1.UserRole.LABELER, index_js_1.UserRole.ADMIN),
}, async (request, reply) => {
    try {
        const { entityId, entityType, labelType, labelValue, confidence, metadata, sourceEvidence, reasoning, } = request.body;
        const id = (0, crypto_js_1.generateLabelId)();
        const createdAt = new Date().toISOString();
        const result = await pool.query(`INSERT INTO labels (
          id, entity_id, entity_type, label_type, label_value,
          confidence, status, metadata, source_evidence, reasoning,
          created_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`, [
            id,
            entityId,
            entityType,
            labelType,
            JSON.stringify(labelValue),
            confidence,
            index_js_1.LabelStatus.PENDING,
            JSON.stringify(metadata || {}),
            sourceEvidence || [],
            reasoning,
            request.userId,
            createdAt,
        ]);
        const row = result.rows[0];
        const label = {
            id: row.id,
            entityId: row.entity_id,
            entityType: row.entity_type,
            labelType: row.label_type,
            labelValue: row.label_value,
            confidence: row.confidence,
            status: row.status,
            metadata: row.metadata,
            sourceEvidence: row.source_evidence,
            reasoning: row.reasoning,
            createdBy: row.created_by,
            createdAt: row.created_at,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            queueId: row.queue_id,
        };
        // Create audit event
        await createAuditEvent({
            eventType: index_js_1.AuditEventType.LABEL_CREATED,
            userId: request.userId,
            entityId,
            labelId: id,
            afterState: label,
            reasoning,
        });
        server.log.info({ labelId: id, userId: request.userId }, 'Label created');
        return label;
    }
    catch (error) {
        server.log.error(error, 'Failed to create label');
        reply.status(500);
        return { error: 'Failed to create label' };
    }
});
// Get label by ID
server.get('/labels/:id', async (request, reply) => {
    try {
        const { id } = request.params;
        const result = await pool.query('SELECT * FROM labels WHERE id = $1', [
            id,
        ]);
        if (result.rows.length === 0) {
            reply.status(404);
            return { error: 'Label not found' };
        }
        const row = result.rows[0];
        const label = {
            id: row.id,
            entityId: row.entity_id,
            entityType: row.entity_type,
            labelType: row.label_type,
            labelValue: row.label_value,
            confidence: row.confidence,
            status: row.status,
            metadata: row.metadata,
            sourceEvidence: row.source_evidence,
            reasoning: row.reasoning,
            createdBy: row.created_by,
            createdAt: row.created_at,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            queueId: row.queue_id,
        };
        return label;
    }
    catch (error) {
        server.log.error(error, 'Failed to get label');
        reply.status(500);
        return { error: 'Failed to retrieve label' };
    }
});
// List labels with filters
server.get('/labels', async (request, reply) => {
    try {
        const { status, entityType, labelType, queueId, limit = 50, offset = 0, } = request.query;
        let query = 'SELECT * FROM labels WHERE 1=1';
        const params = [];
        if (status) {
            params.push(status);
            query += ` AND status = $${params.length}`;
        }
        if (entityType) {
            params.push(entityType);
            query += ` AND entity_type = $${params.length}`;
        }
        if (labelType) {
            params.push(labelType);
            query += ` AND label_type = $${params.length}`;
        }
        if (queueId) {
            params.push(queueId);
            query += ` AND queue_id = $${params.length}`;
        }
        query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);
        const labels = result.rows.map((row) => ({
            id: row.id,
            entityId: row.entity_id,
            entityType: row.entity_type,
            labelType: row.label_type,
            labelValue: row.label_value,
            confidence: row.confidence,
            status: row.status,
            metadata: row.metadata,
            sourceEvidence: row.source_evidence,
            reasoning: row.reasoning,
            createdBy: row.created_by,
            createdAt: row.created_at,
            reviewedBy: row.reviewed_by,
            reviewedAt: row.reviewed_at,
            queueId: row.queue_id,
        }));
        return { labels, total: labels.length, offset, limit };
    }
    catch (error) {
        server.log.error(error, 'Failed to list labels');
        reply.status(500);
        return { error: 'Failed to list labels' };
    }
});
// ============================================================================
// Initialize Service and Register Routes
// ============================================================================
async function initialize() {
    try {
        server.log.info('🔧 Initializing labeling service...');
        // Generate or load service keys
        const keysResult = await pool.query('SELECT private_key, public_key FROM service_keys WHERE active = true ORDER BY created_at DESC LIMIT 1');
        if (keysResult.rows.length > 0) {
            servicePrivateKey = keysResult.rows[0].private_key;
            servicePublicKey = keysResult.rows[0].public_key;
            server.log.info('✅ Loaded existing service keys');
        }
        else {
            const keys = await (0, crypto_js_1.generateKeyPair)();
            servicePrivateKey = keys.privateKey;
            servicePublicKey = keys.publicKey;
            await pool.query('INSERT INTO service_keys (key_type, public_key, private_key, active) VALUES ($1, $2, $3, $4)', ['ed25519', servicePublicKey, servicePrivateKey, true]);
            server.log.info('✅ Generated new service keys');
        }
        // Register modular routes
        await (0, reviews_js_1.registerReviewRoutes)(server, pool, servicePrivateKey, servicePublicKey, createAuditEvent, requireRole);
        await (0, queues_js_1.registerQueueRoutes)(server, pool, createAuditEvent, requireRole);
        await (0, adjudication_js_1.registerAdjudicationRoutes)(server, pool, servicePrivateKey, servicePublicKey, createAuditEvent, requireRole);
        await (0, analytics_js_1.registerAnalyticsRoutes)(server, pool, servicePrivateKey);
        server.log.info('✅ All routes registered');
    }
    catch (error) {
        server.log.error(error, 'Failed to initialize service');
        throw error;
    }
}
// ============================================================================
// Start Server
// ============================================================================
const start = async () => {
    try {
        await initialize();
        await server.listen({ port: PORT, host: '0.0.0.0' });
        server.log.info(`🏷️  Labeling service ready at http://localhost:${PORT}`);
        server.log.info('   Endpoints:');
        server.log.info('   - POST /labels - Create label');
        server.log.info('   - POST /reviews - Submit review');
        server.log.info('   - POST /queues - Create queue');
        server.log.info('   - POST /adjudications - Request adjudication');
        server.log.info('   - POST /statistics/inter-rater-agreement - Calculate agreement');
        server.log.info('   - POST /decision-ledger/export - Export decision ledger');
        server.log.info('   - GET /audit/label/:labelId - Get audit trail');
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};
start();
