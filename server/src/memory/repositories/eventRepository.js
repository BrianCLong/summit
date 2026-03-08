"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = createEvent;
exports.listEventsForPage = listEventsForPage;
exports.getEventById = getEventById;
const pg_js_1 = require("../../db/pg.js");
const ErrorHandlingFramework_js_1 = require("../../errors/ErrorHandlingFramework.js");
const sessionRepository_js_1 = require("./sessionRepository.js");
const pageRepository_js_1 = require("./pageRepository.js");
async function createEvent(input) {
    if (!input.tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to create an event');
    }
    const session = await (0, sessionRepository_js_1.getSessionById)(input.sessionId, input.tenantId);
    const page = await (0, pageRepository_js_1.getPageById)(input.pageId, input.tenantId);
    (0, sessionRepository_js_1.assertSameTenant)(input.tenantId, session.tenant_id);
    (0, sessionRepository_js_1.assertSameTenant)(input.tenantId, page.tenant_id);
    const tags = input.tags ?? [];
    const classification = input.classification ?? [];
    const policyTags = input.policyTags ?? [];
    const metadata = input.metadata ?? {};
    const result = await pg_js_1.pg.write(`INSERT INTO memory_events (
      page_id, session_id, tenant_id, sequence, type, actor_id, actor_type, content,
      tags, classification, policy_tags, origin_run_id, metadata
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::text[], $10::text[], $11::text[], $12, $13::jsonb
    ) RETURNING *`, [
        input.pageId,
        input.sessionId,
        input.tenantId,
        input.sequence,
        input.type,
        input.actorId ?? null,
        input.actorType ?? null,
        input.content ?? null,
        tags,
        classification,
        policyTags,
        input.originRunId ?? null,
        metadata,
    ], { tenantId: input.tenantId });
    return result;
}
async function listEventsForPage(pageId, tenantId, options = {}) {
    if (!tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to list events');
    }
    const page = await (0, pageRepository_js_1.getPageById)(pageId, tenantId);
    (0, sessionRepository_js_1.assertSameTenant)(tenantId, page.tenant_id);
    const limit = Math.min(Math.max(options.limit ?? 200, 1), 2000);
    const rows = await pg_js_1.pg.readMany(`SELECT * FROM memory_events WHERE page_id = $1 AND tenant_id = $2
     ORDER BY sequence ASC
     LIMIT ${limit}`, [pageId, tenantId], { tenantId });
    return rows;
}
async function getEventById(eventId, tenantId) {
    if (!tenantId) {
        throw new ErrorHandlingFramework_js_1.ValidationError('tenantId is required to fetch an event');
    }
    const row = await pg_js_1.pg.oneOrNone(`SELECT * FROM memory_events WHERE id = $1 AND tenant_id = $2`, [eventId, tenantId], { tenantId });
    if (!row) {
        throw new ErrorHandlingFramework_js_1.NotFoundError('memory_event', eventId, {
            tenantId,
            component: 'memory',
        });
    }
    return row;
}
