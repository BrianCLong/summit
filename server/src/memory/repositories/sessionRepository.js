"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSession = createSession;
exports.getSessionById = getSessionById;
exports.listSessionsForTenant = listSessionsForTenant;
exports.archiveSession = archiveSession;
exports.assertSameTenant = assertSameTenant;
const pg_js_1 = require("../../db/pg.js");
const ErrorHandlingFramework_js_1 = require("../../errors/ErrorHandlingFramework.js");
const DEFAULT_STATUS = 'active';
async function createSession(input) {
    if (!input.tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to create a session');
    }
    const classification = input.classification ?? [];
    const policyTags = input.policyTags ?? [];
    const metadata = input.metadata ?? {};
    const status = input.status ?? DEFAULT_STATUS;
    const result = await pg_js_1.pg.write(`INSERT INTO memory_sessions (
      tenant_id, project_id, environment, classification, policy_tags, title, description,
      created_by, agent_id, status, origin_run_id, metadata
    ) VALUES (
      $1, $2, $3, $4::text[], $5::text[], $6, $7, $8, $9, $10, $11, $12::jsonb
    ) RETURNING *`, [
        input.tenantId,
        input.projectId ?? null,
        input.environment ?? null,
        classification,
        policyTags,
        input.title ?? null,
        input.description ?? null,
        input.createdBy ?? null,
        input.agentId ?? null,
        status,
        input.originRunId ?? null,
        metadata,
    ], { tenantId: input.tenantId });
    return result;
}
async function getSessionById(sessionId, tenantId) {
    if (!tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to fetch a session');
    }
    const session = await pg_js_1.pg.oneOrNone(`SELECT * FROM memory_sessions WHERE id = $1 AND tenant_id = $2`, [sessionId, tenantId], { tenantId });
    if (!session) {
        throw new ErrorHandlingFramework_js_1.NotFoundError('memory_session', sessionId, {
            tenantId,
            component: 'memory',
        });
    }
    return session;
}
async function listSessionsForTenant(tenantId, options = {}) {
    if (!tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to list sessions');
    }
    const clauses = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = params.length + 1;
    if (options.projectId) {
        clauses.push(`project_id = $${idx++}`);
        params.push(options.projectId);
    }
    if (options.status) {
        clauses.push(`status = $${idx++}`);
        params.push(options.status);
    }
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 500);
    const query = `SELECT * FROM memory_sessions WHERE ${clauses.join(' AND ')} ORDER BY created_at DESC LIMIT ${limit}`;
    const rows = await pg_js_1.pg.readMany(query, params, { tenantId });
    return rows;
}
async function archiveSession(sessionId, tenantId) {
    if (!tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to archive a session');
    }
    const updated = await pg_js_1.pg.write(`UPDATE memory_sessions
     SET status = 'archived', updated_at = now()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`, [sessionId, tenantId], { tenantId });
    if (!updated) {
        throw new ErrorHandlingFramework_js_1.NotFoundError('memory_session', sessionId, {
            tenantId,
            component: 'memory',
        });
    }
    return updated;
}
function assertSameTenant(tenantId, expectedTenantId) {
    if (!tenantId || !expectedTenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId must be provided for tenant validation');
    }
    if (tenantId !== expectedTenantId) {
        throw new ErrorHandlingFramework_js_1.AuthorizationError('Cross-tenant access is not permitted', undefined, {
            tenantId,
            metadata: { expectedTenantId },
        });
    }
}
