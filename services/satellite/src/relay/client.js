"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.longPoll = longPoll;
const node_fetch_1 = __importDefault(require("node-fetch"));
const crypto_1 = __importDefault(require("crypto"));
const exec_1 = require("./exec");
const HUB = process.env.HUB_URL;
function signBody(body, pem) {
    const s = crypto_1.default.createSign('RSA-SHA256');
    s.update(Buffer.from(body));
    s.end();
    return s.sign(pem, 'base64');
}
async function longPoll(siteId, privPem) {
    let backoff = 1000;
    while (true) {
        const body = JSON.stringify({ siteId, max: 50 });
        const sig = signBody(body, privPem);
        try {
            const r = await (0, node_fetch_1.default)(`${HUB}/api/relay/poll`, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-sig': sig,
                    'x-site-id': siteId,
                },
                body,
            });
            const j = await r.json();
            if (Array.isArray(j.msgs) && j.msgs.length) {
                for (const m of j.msgs) {
                    if (m.kind === 'exec.step')
                        await (0, exec_1.handleExecStep)(m);
                }
                await ack(siteId, privPem, j.msgs.map((x) => x.dbId));
                backoff = 1000;
            }
            else {
                backoff = Math.min(backoff * 2, 15 * 60 * 1000);
            }
        }
        catch { }
        await new Promise((res) => setTimeout(res, backoff * (0.7 + Math.random() * 0.3)));
    }
}
async function ack(siteId, privPem, dbIds) {
    if (!dbIds?.length)
        return;
    const body = JSON.stringify({ siteId, dbIds });
    const sig = signBody(body, privPem);
    await (0, node_fetch_1.default)(`${HUB}/api/relay/ack`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-sig': sig,
            'x-site-id': siteId,
        },
        body,
    });
}
