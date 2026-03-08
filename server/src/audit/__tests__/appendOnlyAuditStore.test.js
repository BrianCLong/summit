"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const appendOnlyAuditStore_js_1 = require("../appendOnlyAuditStore.js");
const tmpFile = () => path_1.default.join(os_1.default.tmpdir(), `audit-store-${Date.now()}-${Math.random()}.jsonl`);
(0, globals_1.describe)('AppendOnlyAuditStore', () => {
    (0, globals_1.it)('appends events and maintains hash chain integrity', async () => {
        const filePath = tmpFile();
        const store = new appendOnlyAuditStore_js_1.AppendOnlyAuditStore({ filePath });
        await store.append({
            version: 'audit_event_v1',
            actor: { type: 'service', id: 'svc-1' },
            action: 'policy_decision',
            resource: { type: 'resource', id: 'res-1' },
            classification: 'internal',
            policy_version: 'v1',
            decision_id: 'decision-1',
            trace_id: 'trace-1',
            timestamp: new Date().toISOString(),
            customer: 'customer-a',
        });
        await store.append({
            version: 'audit_event_v1',
            actor: { type: 'service', id: 'svc-1' },
            action: 'policy_decision',
            resource: { type: 'resource', id: 'res-2' },
            classification: 'restricted',
            policy_version: 'v1',
            decision_id: 'decision-2',
            trace_id: 'trace-2',
            timestamp: new Date().toISOString(),
            customer: 'customer-a',
        });
        const verification = await store.verify();
        (0, globals_1.expect)(verification.ok).toBe(true);
        (0, globals_1.expect)(verification.checked).toBe(2);
        (0, globals_1.expect)(verification.last_hash).toBeDefined();
        const range = await store.readRange({ customer: 'customer-a' });
        (0, globals_1.expect)(range).toHaveLength(2);
        fs_1.default.unlinkSync(filePath);
    });
});
