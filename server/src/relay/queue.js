"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueue = enqueue;
exports.poll = poll;
exports.ack = ack;
const pg_1 = require("pg");
const crypto_1 = __importDefault(require("crypto"));
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
function genId() {
    // ULID-like: time + random base32
    const t = Date.now().toString(36).toUpperCase();
    const r = crypto_1.default
        .randomBytes(10)
        .toString('base64')
        .replace(/[^0-9A-Z]/g, '')
        .slice(0, 12);
    return (t + r).slice(0, 26);
}
function signEnv({ id, createdAt, payload, }) {
    const key = process.env.HUB_PRIVATE_KEY;
    const hash = crypto_1.default
        .createHash('sha256')
        .update(JSON.stringify(payload))
        .digest('hex');
    const data = id + '|' + createdAt + '|' + hash;
    if (!key)
        return '';
    const signer = crypto_1.default.createSign('RSA-SHA256');
    signer.update(data);
    signer.end();
    try {
        return signer.sign(key, 'base64');
    }
    catch {
        return '';
    }
}
async function enqueue(siteId, kind, payload) {
    const id = genId();
    const createdAt = new Date().toISOString();
    const msg = {
        id,
        kind,
        siteId,
        payload,
        createdAt,
        sig: signEnv({ id, createdAt, payload }),
    };
    await pg.query(`INSERT INTO sync_outbox(site_id, kind, ref, payload) VALUES ($1,$2,$3,$4)`, [siteId, kind, id, Buffer.from(JSON.stringify(msg))]);
    return id;
}
async function poll(siteId, max = 50) {
    const { rows } = await pg.query(`SELECT id, payload FROM sync_outbox WHERE site_id=$1 AND status='QUEUED' ORDER BY id ASC LIMIT $2`, [siteId, max]);
    return rows.map((r) => ({
        dbId: r.id,
        ...JSON.parse(r.payload.toString('utf8')),
    }));
}
async function ack(dbIds) {
    if (!dbIds?.length)
        return;
    await pg.query(`UPDATE sync_outbox SET status='ACK' WHERE id = ANY($1::bigint[])`, [dbIds]);
}
