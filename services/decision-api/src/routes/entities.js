"use strict";
// @ts-nocheck
/**
 * Entity routes - CRUD operations for graph entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.entityRoutes = entityRoutes;
const zod_1 = require("zod");
const uuid_1 = require("uuid");
const index_js_1 = require("../index.js");
const decision_graph_1 = require("@intelgraph/decision-graph");
const auth_js_1 = require("../middleware/auth.js");
// Request schemas
const CreateEntityBody = zod_1.z.object({
    type: decision_graph_1.EntityType,
    name: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    policy_labels: zod_1.z.array(zod_1.z.string()).optional(),
});
const UpdateEntityBody = zod_1.z.object({
    name: zod_1.z.string().min(1).max(500).optional(),
    description: zod_1.z.string().optional(),
    attributes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    policy_labels: zod_1.z.array(zod_1.z.string()).optional(),
});
const ListQuerystring = zod_1.z.object({
    type: decision_graph_1.EntityType.optional(),
    created_after: zod_1.z.string().datetime().optional(),
    created_before: zod_1.z.string().datetime().optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
    offset: zod_1.z.coerce.number().min(0).default(0),
});
async function entityRoutes(fastify) {
    // Create entity
    fastify.post('/', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'entity:create')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const parse = CreateEntityBody.safeParse(request.body);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const { type, name, description, attributes, policy_labels } = parse.data;
        const now = new Date().toISOString();
        const id = `entity_${(0, uuid_1.v4)()}`;
        try {
            const result = await index_js_1.pool.query(`INSERT INTO entities (
            id, type, name, description, attributes, policy_labels,
            created_at, updated_at, created_by, tenant_id, version
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8, $9, 1)
          RETURNING *`, [
                id,
                type,
                name,
                description || null,
                JSON.stringify(attributes || {}),
                JSON.stringify(policy_labels || []),
                now,
                request.auth.user_id,
                request.auth.tenant_id,
            ]);
            const entity = mapRowToEntity(result.rows[0]);
            request.log.info({ entityId: id }, 'Entity created');
            return reply.status(201).send(entity);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to create entity');
            return reply.status(500).send({ error: 'Failed to create entity' });
        }
    });
    // Get entity by ID
    fastify.get('/:id', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'entity:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        try {
            const result = await index_js_1.pool.query('SELECT * FROM entities WHERE id = $1 AND tenant_id = $2', [id, request.auth.tenant_id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Entity not found' });
            }
            return mapRowToEntity(result.rows[0]);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get entity');
            return reply.status(500).send({ error: 'Failed to retrieve entity' });
        }
    });
    // Update entity
    fastify.put('/:id', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'entity:update')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        const parse = UpdateEntityBody.safeParse(request.body);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const updates = parse.data;
        const now = new Date().toISOString();
        try {
            // Build dynamic update query
            const setClause = ['updated_at = $1', 'version = version + 1'];
            const values = [now];
            let paramIndex = 2;
            if (updates.name !== undefined) {
                setClause.push(`name = $${paramIndex++}`);
                values.push(updates.name);
            }
            if (updates.description !== undefined) {
                setClause.push(`description = $${paramIndex++}`);
                values.push(updates.description);
            }
            if (updates.attributes !== undefined) {
                setClause.push(`attributes = $${paramIndex++}`);
                values.push(JSON.stringify(updates.attributes));
            }
            if (updates.policy_labels !== undefined) {
                setClause.push(`policy_labels = $${paramIndex++}`);
                values.push(JSON.stringify(updates.policy_labels));
            }
            values.push(id, request.auth.tenant_id);
            const result = await index_js_1.pool.query(`UPDATE entities SET ${setClause.join(', ')}
           WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
           RETURNING *`, values);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Entity not found' });
            }
            return mapRowToEntity(result.rows[0]);
        }
        catch (error) {
            request.log.error({ error }, 'Failed to update entity');
            return reply.status(500).send({ error: 'Failed to update entity' });
        }
    });
    // List entities
    fastify.get('/', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'entity:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const parse = ListQuerystring.safeParse(request.query);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const { type, created_after, created_before, limit, offset } = parse.data;
        try {
            const conditions = ['tenant_id = $1'];
            const values = [request.auth.tenant_id];
            let paramIndex = 2;
            if (type) {
                conditions.push(`type = $${paramIndex++}`);
                values.push(type);
            }
            if (created_after) {
                conditions.push(`created_at >= $${paramIndex++}`);
                values.push(created_after);
            }
            if (created_before) {
                conditions.push(`created_at <= $${paramIndex++}`);
                values.push(created_before);
            }
            const whereClause = conditions.join(' AND ');
            // Get total count
            const countResult = await index_js_1.pool.query(`SELECT count(*) FROM entities WHERE ${whereClause}`, values);
            const total = parseInt(countResult.rows[0].count);
            // Get entities
            values.push(limit, offset);
            const result = await index_js_1.pool.query(`SELECT * FROM entities WHERE ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${paramIndex++} OFFSET $${paramIndex}`, values);
            const items = result.rows.map(mapRowToEntity);
            return {
                items,
                total,
                has_more: offset + items.length < total,
                limit,
                offset,
            };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to list entities');
            return reply.status(500).send({ error: 'Failed to list entities' });
        }
    });
    // Delete entity
    fastify.delete('/:id', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'entity:delete')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        try {
            const result = await index_js_1.pool.query('DELETE FROM entities WHERE id = $1 AND tenant_id = $2 RETURNING id', [id, request.auth.tenant_id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Entity not found' });
            }
            return reply.status(204).send();
        }
        catch (error) {
            request.log.error({ error }, 'Failed to delete entity');
            return reply.status(500).send({ error: 'Failed to delete entity' });
        }
    });
    // Get claims for entity
    fastify.get('/:id/claims', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'claim:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const { id } = request.params;
        try {
            const result = await index_js_1.pool.query(`SELECT c.* FROM claims c
           WHERE c.entity_id = $1 AND c.tenant_id = $2
           ORDER BY c.created_at DESC`, [id, request.auth.tenant_id]);
            return {
                items: result.rows,
                total: result.rows.length,
            };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get claims for entity');
            return reply.status(500).send({ error: 'Failed to retrieve claims' });
        }
    });
}
function mapRowToEntity(row) {
    return {
        id: row.id,
        type: row.type,
        name: row.name,
        description: row.description,
        attributes: row.attributes,
        policy_labels: row.policy_labels,
        created_at: row.created_at,
        updated_at: row.updated_at,
        created_by: row.created_by,
        tenant_id: row.tenant_id,
        version: row.version,
        valid_from: row.valid_from,
        valid_to: row.valid_to,
    };
}
