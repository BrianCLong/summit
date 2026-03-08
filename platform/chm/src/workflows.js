"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveDowngrade = exports.createDowngradeRequest = void 0;
const uuid_1 = require("uuid");
const events_js_1 = require("./events.js");
const taxonomy_js_1 = require("./taxonomy.js");
const createDowngradeRequest = async (pool, input) => {
    const requestedCode = (0, taxonomy_js_1.normalizeCode)(input.requestedCode);
    const id = (0, uuid_1.v4)();
    await pool.query(`INSERT INTO downgrade_requests (id, document_id, requested_code, justification, status)
     VALUES ($1, $2, $3, $4, 'pending')`, [id, input.documentId, requestedCode, input.justification]);
    await pool.query(`INSERT INTO audit_receipts (id, document_id, action, actor, details)
     VALUES ($1, $2, $3, $4, $5)`, [(0, uuid_1.v4)(), input.documentId, 'downgrade_requested', input.actor, { requestedCode }]);
    return id;
};
exports.createDowngradeRequest = createDowngradeRequest;
const approveDowngrade = async (pool, input) => {
    const result = await pool.query(`SELECT id, document_id, requested_code, status, approver_one, approver_two FROM downgrade_requests WHERE id = $1`, [input.requestId]);
    if (!result.rowCount) {
        throw new Error('Request not found');
    }
    const request = result.rows[0];
    if (request.status !== 'pending') {
        return request.status;
    }
    if (!request.approver_one) {
        await pool.query(`UPDATE downgrade_requests SET approver_one = $1, updated_at = NOW() WHERE id = $2`, [input.approver, input.requestId]);
        return 'waiting_second_approval';
    }
    if (request.approver_one === input.approver) {
        throw new Error('Dual control violation: second approver must differ');
    }
    await pool.query(`UPDATE documents SET classification_code = $1, updated_at = NOW() WHERE id = $2`, [request.requested_code, request.document_id]);
    await pool.query(`UPDATE downgrade_requests SET approver_two = $1, status = 'approved', updated_at = NOW() WHERE id = $2`, [input.approver, input.requestId]);
    (0, events_js_1.emitEvent)('chm.tag.downgraded', {
        documentId: request.document_id,
        actor: input.approver,
        details: { from: 'current', to: request.requested_code }
    });
    await pool.query(`INSERT INTO audit_receipts (id, document_id, action, actor, details)
     VALUES ($1, $2, $3, $4, $5)`, [(0, uuid_1.v4)(), request.document_id, 'downgrade_approved', input.approver, { requestedCode: request.requested_code }]);
    return 'approved';
};
exports.approveDowngrade = approveDowngrade;
