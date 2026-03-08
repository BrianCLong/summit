"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleExecStep = handleExecStep;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
const store_1 = require("../cas/store");
const seen_1 = require("./seen");
async function handleExecStep(msg) {
    const ticketId = msg.id;
    if ((0, seen_1.wasSeen)(ticketId))
        return { idempotent: true };
    if (!msg.payload?.snapshotRef?.startsWith('sha256:'))
        throw new Error('bad snapshotRef');
    const artifact = Buffer.from(JSON.stringify({
        ok: true,
        runId: msg.payload.runId,
        stepId: msg.payload.stepId,
        ts: new Date().toISOString(),
    }));
    const { digest } = await (0, store_1.putCAS)(artifact);
    const body = {
        siteId: process.env.SITE_ID,
        ticketId,
        artifacts: [digest],
        metrics: { bytes: artifact.length },
    };
    const sig = sign(JSON.stringify(body), String(process.env.SITE_PRIVATE_KEY || ''));
    await (0, node_fetch_1.default)(`${process.env.HUB_URL}/api/relay/push`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-site-id': String(process.env.SITE_ID || ''),
            'x-sig': sig,
        },
        body: JSON.stringify(body),
    });
    (0, seen_1.markSeen)(ticketId);
    return { ok: true, artifacts: [digest] };
}
function sign(body, pem) {
    const s = crypto_1.default.createSign('RSA-SHA256');
    s.update(Buffer.from(body));
    s.end();
    try {
        return s.sign(pem, 'base64');
    }
    catch {
        return '';
    }
}
