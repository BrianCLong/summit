"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addEvidence = addEvidence;
exports.addClaim = addClaim;
exports.exportManifest = exportManifest;
// @ts-nocheck
const crypto_1 = __importDefault(require("crypto"));
const db_1 = require("./db");
const cryptographic_agility_1 = require("@intelgraph/cryptographic-agility");
async function addEvidence(sha256, contentType) {
    if (!/^[a-fA-F0-9]{64}$/.test(sha256)) {
        throw new Error('invalid_sha');
    }
    if (!contentType || typeof contentType !== 'string') {
        throw new Error('invalid_content_type');
    }
    const { rows } = await (0, db_1.query)('INSERT INTO evidence(sha256, content_type) VALUES ($1,$2) RETURNING id, sha256, content_type as "contentType", created_at as "createdAt"', [sha256, contentType]);
    return rows[0];
}
async function addClaim(evidenceIds, transformChain) {
    if (!Array.isArray(evidenceIds) || evidenceIds.length === 0) {
        throw new Error('evidence_required');
    }
    if (!Array.isArray(transformChain) || transformChain.length === 0) {
        throw new Error('transform_chain_required');
    }
    const leaf = crypto_1.default
        .createHash('sha256')
        .update(evidenceIds.sort().join(':'))
        .digest('hex');
    const root = crypto_1.default
        .createHash('sha256')
        .update(`${leaf}:${transformChain.join('|')}`)
        .digest('hex');
    const { rows } = await (0, db_1.query)('INSERT INTO claim(transform_chain, hash_root, evidence_ids) VALUES ($1,$2,$3) RETURNING id, hash_root as "hashRoot"', [transformChain, root, evidenceIds]);
    return { id: rows[0].id, hashRoot: rows[0].hashRoot, transformChain };
}
async function exportManifest(caseId) {
    const { rows: claims } = await (0, db_1.query)('SELECT * FROM claim ORDER BY created_at DESC LIMIT 50');
    const manifest = {
        caseId,
        version: 1,
        issuedAt: new Date().toISOString(),
        claims: claims.map((c) => ({ id: c.id, hashRoot: c.hash_root, chain: c.transform_chain })),
    };
    const manifestContent = JSON.stringify(manifest);
    const sig = await cryptographic_agility_1.fipsService.sign(manifestContent, 'ledger-key');
    const signedManifest = {
        ...manifest,
        signature: {
            alg: 'ECDSA-P-384',
            kid: 'ledger-key',
            sig
        },
    };
    return Buffer.from(JSON.stringify(signedManifest)).toString('base64');
}
