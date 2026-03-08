"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySiteAuth = verifySiteAuth;
const pg_1 = require("pg");
const crypto_1 = __importDefault(require("crypto"));
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function verifySiteAuth(req, res, next) {
    try {
        const siteId = (req.body?.siteId ||
            req.headers['x-site-id'] ||
            '').toString();
        const sig = (req.headers['x-sig'] || '').toString();
        if (!siteId || !sig)
            return res.status(401).json({ error: 'missing auth' });
        const body = Buffer.from(JSON.stringify(req.body || {}));
        const { rows: [s], } = await pg.query(`SELECT trust_pubkey FROM sites WHERE id=$1`, [siteId]);
        if (!s)
            return res.status(403).json({ error: 'unknown site' });
        const v = crypto_1.default.createVerify('RSA-SHA256');
        v.update(body);
        v.end();
        if (!v.verify(s.trust_pubkey, Buffer.from(sig, 'base64')))
            return res.status(401).json({ error: 'bad sig' });
        req.siteId = siteId;
        next();
    }
    catch (e) {
        return res.status(400).json({ error: 'auth failed' });
    }
}
