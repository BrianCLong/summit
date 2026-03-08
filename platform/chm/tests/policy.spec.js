"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const config_js_1 = require("../src/config.js");
const db_js_1 = require("../src/db.js");
const rules_js_1 = require("../src/rules.js");
const workflows_js_1 = require("../src/workflows.js");
const memory_db_js_1 = require("./helpers/memory-db.js");
describe('policy conformance', () => {
    it('blocks export on residency and license violations and supports dual approval downgrade', async () => {
        const { pool } = (0, memory_db_js_1.createMemoryPool)();
        await (0, db_js_1.initSchema)(pool);
        const config = (0, config_js_1.loadConfig)();
        config.residencyAllowList = ['US'];
        config.licenseAllowList = ['ITAR'];
        const blockedDocId = (0, uuid_1.v4)();
        await (0, rules_js_1.createDocument)(pool, {
            id: blockedDocId,
            title: 'foreign residency',
            classificationCode: 'S',
            residency: 'IR',
            license: 'ITAR',
            derivedFrom: false
        }, 'analyst');
        const blockedDecision = await (0, rules_js_1.evaluateExport)(pool, blockedDocId, config);
        expect(blockedDecision.allowed).toBe(false);
        expect(blockedDecision.reason).toContain('residency');
        const allowedId = (0, uuid_1.v4)();
        await (0, rules_js_1.createDocument)(pool, {
            id: allowedId,
            title: 'approved doc',
            classificationCode: 'C',
            residency: 'US',
            license: 'ITAR',
            derivedFrom: false
        }, 'analyst');
        const allowedDecision = await (0, rules_js_1.evaluateExport)(pool, allowedId, config);
        expect(allowedDecision.allowed).toBe(true);
        const requestId = await (0, workflows_js_1.createDowngradeRequest)(pool, {
            documentId: allowedId,
            requestedCode: 'U',
            justification: 'Release to partners',
            actor: 'requester'
        });
        const firstStatus = await (0, workflows_js_1.approveDowngrade)(pool, { requestId, approver: 'approver-a' });
        expect(firstStatus).toBe('waiting_second_approval');
        const finalStatus = await (0, workflows_js_1.approveDowngrade)(pool, { requestId, approver: 'approver-b' });
        expect(finalStatus).toBe('approved');
        const updated = await pool.query(`SELECT classification_code FROM documents WHERE id = $1`, [allowedId]);
        expect(updated.rows[0].classification_code).toBe('U');
    });
});
