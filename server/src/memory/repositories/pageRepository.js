"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPgVector = toPgVector;
exports.createPage = createPage;
exports.listPagesForSession = listPagesForSession;
exports.getPageById = getPageById;
const pg_js_1 = require("../../db/pg.js");
const ErrorHandlingFramework_js_1 = require("../../errors/ErrorHandlingFramework.js");
const sessionRepository_js_1 = require("./sessionRepository.js");
function toPgVector(value) {
    if (!value || value.length === 0)
        return null;
    return `[${value.join(',')}]`;
}
async function createPage(input) {
    if (!input.tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to create a page');
    }
    const session = await (0, sessionRepository_js_1.getSessionById)(input.sessionId, input.tenantId);
    (0, sessionRepository_js_1.assertSameTenant)(input.tenantId, session.tenant_id);
    const tags = input.tags ?? [];
    const classification = input.classification ?? [];
    const policyTags = input.policyTags ?? [];
    const metadata = input.metadata ?? {};
    const embedding = toPgVector(input.embedding);
    const result = await pg_js_1.pg.write(`INSERT INTO memory_pages (
      session_id, tenant_id, sequence, title, raw_content, memo, token_count,
      actor_id, actor_type, source, tags, classification, policy_tags, origin_run_id,
      embedding, metadata
    ) VALUES (
      $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11::text[], $12::text[],
      $13::text[], $14, CASE WHEN $15 IS NULL THEN NULL ELSE $15::vector END, $16::jsonb
    ) RETURNING *`, [
        input.sessionId,
        input.tenantId,
        input.sequence,
        input.title ?? null,
        input.rawContent,
        input.memo ?? null,
        input.tokenCount ?? null,
        input.actorId ?? null,
        input.actorType ?? null,
        input.source ?? null,
        tags,
        classification,
        policyTags,
        input.originRunId ?? null,
        embedding,
        metadata,
    ], { tenantId: input.tenantId });
    return result;
}
async function listPagesForSession(sessionId, tenantId, options = {}) {
    if (!tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to list pages');
    }
    const session = await (0, sessionRepository_js_1.getSessionById)(sessionId, tenantId);
    (0, sessionRepository_js_1.assertSameTenant)(tenantId, session.tenant_id);
    const limit = Math.min(Math.max(options.limit ?? 100, 1), 1000);
    const rows = await pg_js_1.pg.readMany(`SELECT * FROM memory_pages WHERE session_id = $1 AND tenant_id = $2
     ORDER BY sequence ASC
     LIMIT ${limit}`, [sessionId, tenantId], { tenantId });
    return rows;
}
async function getPageById(pageId, tenantId) {
    if (!tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to fetch a page');
    }
    const row = await pg_js_1.pg.oneOrNone(`SELECT * FROM memory_pages WHERE id = $1 AND tenant_id = $2`, [pageId, tenantId], { tenantId });
    if (!row) {
        throw new ErrorHandlingFramework_js_1.NotFoundError('memory_page', pageId, {
            tenantId,
            component: 'memory',
        });
    }
    return row;
}
