"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerSite = registerSite;
exports.verifySignature = verifySignature;
const pg_1 = require("pg");
const crypto_1 = __importDefault(require("crypto"));
const pg = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
async function registerSite({ name, region, residency, pubkey, bandwidth, }) {
    const { rows: [s], } = await pg.query(`INSERT INTO sites(name,region,residency,trust_pubkey,bandwidth_class)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (name,region) DO UPDATE SET trust_pubkey=$4, bandwidth_class=$5
     RETURNING id, name, region, residency, bandwidth_class AS bandwidth`, [name, region, residency, pubkey, bandwidth]);
    return s;
}
function verifySignature(pubkeyPem, bytes, sigB64) {
    try {
        const v = crypto_1.default.createVerify('RSA-SHA256');
        v.update(bytes);
        v.end();
        return v.verify(pubkeyPem, Buffer.from(sigB64, 'base64'));
    }
    catch {
        return false;
    }
}
