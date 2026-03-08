"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpReceiptSigner = void 0;
exports.issueReceipt = issueReceipt;
exports.getReceipt = getReceipt;
exports.listReceipts = listReceipts;
exports.redactReceipt = redactReceipt;
// @ts-nocheck
const provenance_1 = require("@intelgraph/provenance");
const crypto_1 = require("crypto");
class LocalReceiptSigner {
    privateKey;
    publicKey;
    keyId;
    constructor(keyId = 'local-dev') {
        this.keyId = keyId;
        const pair = (0, crypto_1.generateKeyPairSync)('ed25519');
        this.privateKey = pair.privateKey;
        this.publicKey = pair.publicKey
            .export({ type: 'spki', format: 'der' })
            .toString('base64');
    }
    async sign(payloadHash) {
        const signedAt = new Date().toISOString();
        const value = (0, crypto_1.sign)(null, Buffer.from(payloadHash, 'hex'), this.privateKey).toString('base64');
        return {
            algorithm: 'ed25519',
            keyId: this.keyId,
            publicKey: this.publicKey,
            value,
            signedAt,
        };
    }
    async verify(payloadHash, signature) {
        return (0, crypto_1.verify)(null, Buffer.from(payloadHash, 'hex'), {
            key: Buffer.from(signature.publicKey, 'base64'),
            format: 'der',
            type: 'spki',
        }, Buffer.from(signature.value, 'base64'));
    }
}
class HttpReceiptSigner {
    baseUrl;
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    async sign(payloadHash) {
        const res = await fetch(`${this.baseUrl}/sign`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ payload: payloadHash }),
        });
        if (!res.ok) {
            const body = await res.text();
            throw new Error(`Failed to sign payload: ${res.status} ${body}`);
        }
        const json = (await res.json());
        return json.signature;
    }
}
exports.HttpReceiptSigner = HttpReceiptSigner;
const receiptStore = new Map();
const defaultSigner = process.env.SIGNER_URL
    ? new HttpReceiptSigner(process.env.SIGNER_URL)
    : new LocalReceiptSigner();
async function issueReceipt(manifest, context, signer = defaultSigner) {
    const issuedAt = new Date().toISOString();
    const receiptBase = {
        id: (0, crypto_1.randomUUID)(),
        version: provenance_1.RECEIPT_VERSION,
        caseId: context.caseId ?? 'unassigned',
        claimIds: context.claimIds,
        createdAt: issuedAt,
        actor: context.actor,
        pipeline: context.pipeline,
        payloadHash: '',
        signature: {
            algorithm: 'ed25519',
            keyId: 'pending',
            publicKey: '',
            value: '',
            signedAt: issuedAt,
        },
        proofs: {
            receiptHash: '',
            manifestMerkleRoot: manifest.merkleRoot,
            claimHashes: manifest.claims.map((c) => c.hash),
        },
        metadata: context.metadata,
        redactions: context.redactions,
    };
    const payloadHash = (0, provenance_1.computeReceiptPayloadHash)(receiptBase);
    const signature = await signer.sign(payloadHash);
    const signed = {
        ...receiptBase,
        payloadHash,
        signature,
    };
    signed.proofs.receiptHash = (0, provenance_1.computeReceiptHash)(signed);
    receiptStore.set(signed.id, signed);
    return signed;
}
function getReceipt(id) {
    return receiptStore.get(id);
}
function listReceipts(ids) {
    if (!ids)
        return Array.from(receiptStore.values());
    return ids.map((id) => receiptStore.get(id)).filter((r) => Boolean(r));
}
function redactReceipt(receipt, redactions = []) {
    return (0, provenance_1.applyRedactions)(receipt, [...(receipt.redactions ?? []), ...redactions]);
}
