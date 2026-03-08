"use strict";
// @ts-nocheck
/**
 * Evidence routes - CRUD operations for evidence sources
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.evidenceRoutes = evidenceRoutes;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const crypto_1 = __importDefault(require("crypto"));
const index_js_1 = require("../index.js");
const decision_graph_1 = require("@intelgraph/decision-graph");
const auth_js_1 = require("../middleware/auth.js");
// Request schemas
const CreateEvidenceBody = zod_1.z.object({
    type: decision_graph_1.EvidenceType,
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    source_uri: zod_1.z.string().max(2000),
    source_type: zod_1.z.string(),
    content: zod_1.z.string().optional(), // For computing hash
    content_hash: zod_1.z.string().optional(), // Pre-computed hash
    content_type: zod_1.z.string().optional(),
    file_size_bytes: zod_1.z.number().int().optional(),
    extracted_text: zod_1.z.string().optional(),
    reliability_score: zod_1.z.number().min(0).max(1).default(0.5),
    freshness_date: zod_1.z.string().datetime(),
    expiry_date: zod_1.z.string().datetime().optional(),
    license_id: zod_1.z.string().optional(),
    policy_labels: zod_1.z.array(zod_1.z.string()).optional(),
});
const UpdateEvidenceBody = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().optional(),
    reliability_score: zod_1.z.number().min(0).max(1).optional(),
    expiry_date: zod_1.z.string().datetime().optional(),
    policy_labels: zod_1.z.array(zod_1.z.string()).optional(),
});
async function evidenceRoutes(fastify) {
    // Create evidence
    fastify.post('/', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'evidence:create')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const parse = CreateEvidenceBody.safeParse(request.body);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const data = parse.data;
        const now = new Date().toISOString();
        const id = `evidence_${(0, uuid_1.v4)()}`;
        // Compute content hash if not provided
        let contentHash = data.content_hash;
        if (!contentHash && data.content) {
            contentHash = crypto_1.default
                .createHash('sha256')
                .update(data.content)
                .digest('hex');
        }
        if (!contentHash) {
            return reply.status(400).send({
                error: 'Either content or content_hash must be provided',
            });
        }
        try {
            const result = await index_js_1.pool.query(`INSERT INTO evidence (
            id, type, title, description, source_uri, source_type,
            content_hash, content_type, file_size_bytes, extracted_text,
            reliability_score, freshness_date, retrieval_date, expiry_date,
            license_id, policy_labels, transform_chain,
            created_at, created_by, tenant_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
          RETURNING *`, [
                id,
                data.type,
                data.title,
                data.description || null,
                data.source_uri,
                data.source_type,
                contentHash,
                data.content_type || null,
                data.file_size_bytes || null,
                data.extracted_text || null,
                data.reliability_score,
                data.freshness_date,
                now, // retrieval_date
                data.expiry_date || null,
                data.license_id || null,
                JSON.stringify(data.policy_labels || []),
                JSON.stringify([]),
                now,
                request.auth.user_id,
                request.auth.tenant_id,
            ]);
            request.log.info({ evidenceId: id }, 'Evidence created');
            return reply.status(201).send(mapRowToEvidence(result.rows[0]));
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create evidence');
            if (error.code === '23505') {
                return reply.status(409).send({
                    error: 'Evidence with this content hash already exists',
                });
            }
            return reply.status(500).send({ error: 'Failed to create evidence' });
        }
    });
    // Get evidence by ID
    fastify.get('/:id', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'evidence:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        try {
            const result = await index_js_1.pool.query('SELECT * FROM evidence WHERE id = $1 AND tenant_id = $2', [id, request.auth.tenant_id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Evidence not found' });
            }
            return mapRowToEvidence(result.rows[0]);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get evidence');
            return reply.status(500).send({ error: 'Failed to retrieve evidence' });
        }
    });
    // Update evidence
    fastify.put('/:id', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'evidence:update')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        const parse = UpdateEvidenceBody.safeParse(request.body);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const updates = parse.data;
        try {
            const setClause = [];
            const values = [];
            let paramIndex = 1;
            if (updates.title !== undefined) {
                setClause.push(`title = $${paramIndex++}`);
                values.push(updates.title);
            }
            if (updates.description !== undefined) {
                setClause.push(`description = $${paramIndex++}`);
                values.push(updates.description);
            }
            if (updates.reliability_score !== undefined) {
                setClause.push(`reliability_score = $${paramIndex++}`);
                values.push(updates.reliability_score);
            }
            if (updates.expiry_date !== undefined) {
                setClause.push(`expiry_date = $${paramIndex++}`);
                values.push(updates.expiry_date);
            }
            if (updates.policy_labels !== undefined) {
                setClause.push(`policy_labels = $${paramIndex++}`);
                values.push(JSON.stringify(updates.policy_labels));
            }
            if (setClause.length === 0) {
                return reply.status(400).send({ error: 'No updates provided' });
            }
            values.push(id, request.auth.tenant_id);
            const result = await index_js_1.pool.query(`UPDATE evidence SET ${setClause.join(', ')}
           WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
           RETURNING *`, values);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Evidence not found' });
            }
            return mapRowToEvidence(result.rows[0]);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update evidence');
            return reply.status(500).send({ error: 'Failed to update evidence' });
        }
    });
    // List evidence
    fastify.get('/', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'evidence:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const query = request.query;
        const limit = Math.min(parseInt(query.limit) || 20, 100);
        const offset = parseInt(query.offset) || 0;
        try {
            const conditions = ['tenant_id = $1'];
            const values = [request.auth.tenant_id];
            let paramIndex = 2;
            if (query.type) {
                conditions.push(`type = $${paramIndex++}`);
                values.push(query.type);
            }
            if (query.source_type) {
                conditions.push(`source_type = $${paramIndex++}`);
                values.push(query.source_type);
            }
            const whereClause = conditions.join(' AND ');
            const countResult = await index_js_1.pool.query(`SELECT count(*) FROM evidence WHERE ${whereClause}`, values);
            const total = parseInt(countResult.rows[0].count);
            values.push(limit, offset);
            const result = await index_js_1.pool.query(`SELECT * FROM evidence WHERE ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${paramIndex++} OFFSET $${paramIndex}`, values);
            const items = result.rows.map(mapRowToEvidence);
            return {
                items,
                total,
                has_more: offset + items.length < total,
                limit,
                offset,
            };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list evidence');
            return reply.status(500).send({ error: 'Failed to list evidence' });
        }
    });
    // Verify evidence hash
    fastify.post('/:id/verify', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'evidence:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        const { content } = request.body;
        if (!content) {
            return reply.status(400).send({ error: 'content is required' });
        }
        try {
            const result = await index_js_1.pool.query('SELECT content_hash FROM evidence WHERE id = $1 AND tenant_id = $2', [id, request.auth.tenant_id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Evidence not found' });
            }
            const expectedHash = result.rows[0].content_hash;
            const actualHash = crypto_1.default
                .createHash('sha256')
                .update(content)
                .digest('hex');
            return {
                valid: actualHash === expectedHash,
                expected_hash: expectedHash,
                actual_hash: actualHash,
                verified_at: new Date().toISOString(),
            };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to verify evidence');
            return reply.status(500).send({ error: 'Failed to verify evidence' });
        }
    });
    // Add transform to evidence chain
    fastify.post('/:id/transform', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'evidence:update')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        const { transform_type, config } = request.body;
        if (!transform_type) {
            return reply.status(400).send({ error: 'transform_type is required' });
        }
        try {
            const transformStep = {
                transform_type,
                timestamp: new Date().toISOString(),
                actor_id: request.auth.user_id,
                config: config || {},
            };
            const result = await index_js_1.pool.query(`UPDATE evidence SET
            transform_chain = transform_chain || $1::jsonb
           WHERE id = $2 AND tenant_id = $3
           RETURNING *`, [JSON.stringify([transformStep]), id, request.auth.tenant_id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Evidence not found' });
            }
            return mapRowToEvidence(result.rows[0]);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to add transform');
            return reply.status(500).send({ error: 'Failed to add transform' });
        }
    });
}
function mapRowToEvidence(row) {
    return {
        id: row.id,
        type: row.type,
        title: row.title,
        description: row.description,
        source_uri: row.source_uri,
        source_type: row.source_type,
        content_hash: row.content_hash,
        content_type: row.content_type,
        file_size_bytes: row.file_size_bytes,
        extracted_text: row.extracted_text,
        extraction_metadata: row.extraction_metadata,
        reliability_score: row.reliability_score,
        freshness_date: row.freshness_date,
        retrieval_date: row.retrieval_date,
        expiry_date: row.expiry_date,
        license_id: row.license_id,
        policy_labels: row.policy_labels,
        transform_chain: row.transform_chain,
        created_at: row.created_at,
        created_by: row.created_by,
        tenant_id: row.tenant_id,
    };
}
