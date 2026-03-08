"use strict";
/**
 * Query routes - Advanced graph queries for decisions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryRoutes = queryRoutes;
const zod_1 = require("zod");
const index_js_1 = require("../index.js");
const auth_js_1 = require("../middleware/auth.js");
const TraceQueryBody = zod_1.z.object({
    decision_id: zod_1.z.string().uuid(),
    depth: zod_1.z.number().int().min(1).max(10).default(3),
});
const EntityClaimsQuery = zod_1.z.object({
    entity_id: zod_1.z.string().uuid(),
    include_evidence: zod_1.z.boolean().default(false),
    status: zod_1.z.string().optional(),
});
const SearchQuery = zod_1.z.object({
    query: zod_1.z.string().min(1).max(500),
    types: zod_1.z.array(zod_1.z.enum(['entity', 'claim', 'evidence', 'decision'])).optional(),
    limit: zod_1.z.coerce.number().min(1).max(100).default(20),
});
async function queryRoutes(fastify) {
    // Trace decision provenance
    fastify.post('/trace', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'decision:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const parse = TraceQueryBody.safeParse(request.body);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const { decision_id, depth } = parse.data;
        try {
            // Get decision
            const decisionResult = await index_js_1.pool.query('SELECT * FROM decisions WHERE id = $1 AND tenant_id = $2', [decision_id, request.auth.tenant_id]);
            if (decisionResult.rows.length === 0) {
                return reply.status(404).send({ error: 'Decision not found' });
            }
            const decision = decisionResult.rows[0];
            const trace = {
                decision: {
                    id: decision.id,
                    title: decision.title,
                    question: decision.question,
                    status: decision.status,
                    decided_at: decision.decided_at,
                },
                claims: [],
                evidence: [],
                entities: [],
                provenance_events: [],
            };
            // Get claims (depth 1)
            if (depth >= 1 && decision.claim_ids?.length > 0) {
                const claimsResult = await index_js_1.pool.query('SELECT * FROM claims WHERE id = ANY($1) AND tenant_id = $2', [decision.claim_ids, request.auth.tenant_id]);
                trace.claims = claimsResult.rows.map((c) => ({
                    id: c.id,
                    assertion: c.assertion,
                    confidence_score: c.confidence_score,
                    status: c.status,
                    source_type: c.source_type,
                }));
                // Get evidence for claims (depth 2)
                if (depth >= 2) {
                    const allEvidenceIds = new Set();
                    for (const claim of claimsResult.rows) {
                        for (const eid of claim.evidence_ids || []) {
                            allEvidenceIds.add(eid);
                        }
                    }
                    // Also add direct evidence
                    for (const eid of decision.evidence_ids || []) {
                        allEvidenceIds.add(eid);
                    }
                    if (allEvidenceIds.size > 0) {
                        const evidenceResult = await index_js_1.pool.query('SELECT * FROM evidence WHERE id = ANY($1) AND tenant_id = $2', [Array.from(allEvidenceIds), request.auth.tenant_id]);
                        trace.evidence = evidenceResult.rows.map((e) => ({
                            id: e.id,
                            title: e.title,
                            source_uri: e.source_uri,
                            source_type: e.source_type,
                            reliability_score: e.reliability_score,
                            freshness_date: e.freshness_date,
                        }));
                    }
                }
            }
            // Get entities (depth 1)
            if (depth >= 1 && decision.entity_ids?.length > 0) {
                const entitiesResult = await index_js_1.pool.query('SELECT * FROM entities WHERE id = ANY($1) AND tenant_id = $2', [decision.entity_ids, request.auth.tenant_id]);
                trace.entities = entitiesResult.rows.map((e) => ({
                    id: e.id,
                    type: e.type,
                    name: e.name,
                }));
            }
            // Get provenance events
            if (depth >= 3) {
                const provenanceResult = await index_js_1.pool.query(`SELECT * FROM provenance_events
             WHERE subject_id = $1 AND tenant_id = $2
             ORDER BY timestamp DESC
             LIMIT 50`, [decision_id, request.auth.tenant_id]);
                trace.provenance_events = provenanceResult.rows;
            }
            return trace;
        }
        catch (error) {
            request.log.error({ error }, 'Failed to trace decision');
            return reply.status(500).send({ error: 'Failed to trace decision' });
        }
    });
    // Get all claims for an entity
    fastify.get('/entity-claims', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'claim:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const parse = EntityClaimsQuery.safeParse(request.query);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const { entity_id, include_evidence, status } = parse.data;
        try {
            // Verify entity exists
            const entityResult = await index_js_1.pool.query('SELECT * FROM entities WHERE id = $1 AND tenant_id = $2', [entity_id, request.auth.tenant_id]);
            if (entityResult.rows.length === 0) {
                return reply.status(404).send({ error: 'Entity not found' });
            }
            // Get claims
            const conditions = ['entity_id = $1', 'tenant_id = $2'];
            const values = [entity_id, request.auth.tenant_id];
            let paramIndex = 3;
            if (status) {
                conditions.push(`status = $${paramIndex++}`);
                values.push(status);
            }
            const claimsResult = await index_js_1.pool.query(`SELECT * FROM claims WHERE ${conditions.join(' AND ')}
           ORDER BY confidence_score DESC, created_at DESC`, values);
            const claims = claimsResult.rows;
            // Include evidence if requested
            let evidence = [];
            if (include_evidence) {
                const allEvidenceIds = new Set();
                for (const claim of claims) {
                    for (const eid of claim.evidence_ids || []) {
                        allEvidenceIds.add(eid);
                    }
                }
                if (allEvidenceIds.size > 0) {
                    const evidenceResult = await index_js_1.pool.query('SELECT * FROM evidence WHERE id = ANY($1) AND tenant_id = $2', [Array.from(allEvidenceIds), request.auth.tenant_id]);
                    evidence = evidenceResult.rows;
                }
            }
            return {
                entity: entityResult.rows[0],
                claims,
                evidence: include_evidence ? evidence : undefined,
                total_claims: claims.length,
                average_confidence: claims.length > 0
                    ? claims.reduce((sum, c) => sum + c.confidence_score, 0) / claims.length
                    : 0,
            };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get entity claims');
            return reply.status(500).send({ error: 'Failed to get entity claims' });
        }
    });
    // Full-text search across objects
    fastify.get('/search', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'entity:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        const parse = SearchQuery.safeParse(request.query);
        if (!parse.success) {
            return reply.status(400).send({ error: parse.error.flatten() });
        }
        const { query, types, limit } = parse.data;
        const searchTypes = types || ['entity', 'claim', 'evidence', 'decision'];
        const results = {};
        try {
            const searchPattern = `%${query}%`;
            // Search entities
            if (searchTypes.includes('entity')) {
                const entitiesResult = await index_js_1.pool.query(`SELECT * FROM entities
             WHERE tenant_id = $1 AND (name ILIKE $2 OR description ILIKE $2)
             ORDER BY created_at DESC
             LIMIT $3`, [request.auth.tenant_id, searchPattern, limit]);
                results.entities = entitiesResult.rows;
            }
            // Search claims
            if (searchTypes.includes('claim')) {
                const claimsResult = await index_js_1.pool.query(`SELECT * FROM claims
             WHERE tenant_id = $1 AND assertion ILIKE $2
             ORDER BY confidence_score DESC, created_at DESC
             LIMIT $3`, [request.auth.tenant_id, searchPattern, limit]);
                results.claims = claimsResult.rows;
            }
            // Search evidence
            if (searchTypes.includes('evidence')) {
                const evidenceResult = await index_js_1.pool.query(`SELECT * FROM evidence
             WHERE tenant_id = $1 AND (title ILIKE $2 OR description ILIKE $2 OR extracted_text ILIKE $2)
             ORDER BY created_at DESC
             LIMIT $3`, [request.auth.tenant_id, searchPattern, limit]);
                results.evidence = evidenceResult.rows;
            }
            // Search decisions
            if (searchTypes.includes('decision')) {
                const decisionsResult = await index_js_1.pool.query(`SELECT * FROM decisions
             WHERE tenant_id = $1 AND (title ILIKE $2 OR question ILIKE $2 OR context ILIKE $2)
             ORDER BY created_at DESC
             LIMIT $3`, [request.auth.tenant_id, searchPattern, limit]);
                results.decisions = decisionsResult.rows;
            }
            return {
                query,
                results,
                total: Object.values(results).reduce((sum, arr) => sum + arr.length, 0),
            };
        }
        catch (error) {
            request.log.error({ error }, 'Search failed');
            return reply.status(500).send({ error: 'Search failed' });
        }
    });
    // Get decision statistics
    fastify.get('/stats', async (request, reply) => {
        if (!(0, auth_js_1.hasPermission)(request.auth, 'decision:read')) {
            return reply.status(403).send({ error: 'Forbidden' });
        }
        try {
            const stats = await index_js_1.pool.query(`SELECT
            (SELECT count(*) FROM entities WHERE tenant_id = $1) as entity_count,
            (SELECT count(*) FROM claims WHERE tenant_id = $1) as claim_count,
            (SELECT count(*) FROM evidence WHERE tenant_id = $1) as evidence_count,
            (SELECT count(*) FROM decisions WHERE tenant_id = $1) as decision_count,
            (SELECT count(*) FROM decisions WHERE tenant_id = $1 AND status = 'approved') as approved_decisions,
            (SELECT count(*) FROM decisions WHERE tenant_id = $1 AND status = 'pending_approval') as pending_decisions,
            (SELECT avg(confidence_score) FROM claims WHERE tenant_id = $1) as avg_claim_confidence,
            (SELECT avg(reliability_score) FROM evidence WHERE tenant_id = $1) as avg_evidence_reliability`, [request.auth.tenant_id]);
            return {
                timestamp: new Date().toISOString(),
                tenant_id: request.auth.tenant_id,
                ...stats.rows[0],
            };
        }
        catch (error) {
            request.log.error({ error }, 'Failed to get stats');
            return reply.status(500).send({ error: 'Failed to get statistics' });
        }
    });
}
