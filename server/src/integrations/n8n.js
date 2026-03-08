"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.triggerN8nFlow = triggerN8nFlow;
exports.n8nIntegrationEnabled = n8nIntegrationEnabled;
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
const logger_js_1 = __importDefault(require("../config/logger.js"));
const provenance_ledger_js_1 = require("../services/provenance-ledger.js");
const logger = logger_js_1.default.child({ name: 'integrations:n8n' });
const base = process.env.N8N_BASE_URL || '';
const secret = process.env.N8N_SIGNING_SECRET || '';
function sign(body) {
    const payload = JSON.stringify(body);
    const mac = crypto_1.default.createHmac('sha256', secret).update(payload).digest('hex');
    return { payload, mac };
}
async function triggerN8nFlow(flowKey, body, ctx) {
    if (!base || !secret)
        throw new Error('n8n missing env');
    const path = `/webhook/${encodeURIComponent(flowKey)}`;
    const payload = { ...body };
    const { payload: json, mac } = sign(payload);
    const provenance = provenance_ledger_js_1.ProvenanceLedgerService.getInstance();
    try {
        await provenance.recordProvenanceEntry({
            operation_type: 'N8N_TRIGGER',
            actor_id: ctx.userId || 'system',
            metadata: { flowKey, runId: ctx.runId, request: body },
        });
    }
    catch (e) {
        logger.warn({ err: e }, 'provenance record failed for N8N_TRIGGER');
    }
    const res = await axios_1.default.post(base + path, json, {
        headers: { 'content-type': 'application/json', 'x-maestro-signature': mac },
        timeout: 15_000,
    });
    try {
        await provenance.recordProvenanceEntry({
            operation_type: 'N8N_TRIGGER_RESULT',
            actor_id: ctx.userId || 'system',
            metadata: {
                flowKey,
                runId: ctx.runId,
                status: res.status,
                data: res.data,
            },
        });
    }
    catch (e) {
        logger.warn({ err: e }, 'provenance record failed for N8N_TRIGGER_RESULT');
    }
    return { status: res.status, data: res.data };
}
function n8nIntegrationEnabled() {
    return Boolean(base && secret);
}
