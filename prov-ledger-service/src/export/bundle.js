"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assembleReceiptBundle = assembleReceiptBundle;
exports.unpackBundle = unpackBundle;
const crypto_1 = require("crypto");
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
const ledger_1 = require("../ledger");
function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
}
function hashEntity(entity) {
    return (0, crypto_1.createHash)('sha256')
        .update(JSON.stringify(entity))
        .digest('hex');
}
function redactEntity(entity, fields) {
    if (!fields || fields.length === 0) {
        return { redacted: entity, removed: [] };
    }
    const workingCopy = deepClone(entity);
    const removed = [];
    for (const field of fields) {
        if (field in workingCopy) {
            delete workingCopy[field];
            removed.push(field);
        }
    }
    return { redacted: workingCopy, removed };
}
function filterByIds(items, allowedIds) {
    if (!allowedIds || allowedIds.length === 0) {
        return items;
    }
    const allowed = new Set(allowedIds);
    return items.filter((item) => allowed.has(item.id));
}
async function gzipPack(pack) {
    const chunks = [];
    const gzip = (0, zlib_1.createGzip)();
    return new Promise((resolve, reject) => {
        gzip.on('data', (chunk) => chunks.push(chunk));
        gzip.on('end', () => resolve(Buffer.concat(chunks)));
        gzip.on('error', reject);
        pack.on('error', reject);
        pack.pipe(gzip);
    });
}
async function assembleReceiptBundle(input) {
    const redaction = input.redaction || {};
    const selectiveDisclosure = input.selectiveDisclosure;
    const receipts = filterByIds(input.receipts, selectiveDisclosure?.receiptIds);
    const decisions = filterByIds(input.policyDecisions, selectiveDisclosure?.decisionIds);
    const receiptRecords = receipts.map((receipt) => {
        const { redacted, removed } = redactEntity(deepClone(receipt), redaction.receipts);
        return {
            record: redacted,
            hash: hashEntity(redacted),
            removed,
        };
    });
    const decisionRecords = decisions.map((decision) => {
        const { redacted, removed } = redactEntity(deepClone(decision), redaction.policyDecisions);
        return {
            record: redacted,
            hash: hashEntity(redacted),
            removed,
        };
    });
    const manifest = {
        id: input.manifest?.id || (0, crypto_1.randomUUID)(),
        version: '1.0.0',
        generatedAt: new Date().toISOString(),
        receiptCount: receiptRecords.length,
        policyDecisionCount: decisionRecords.length,
        receipts: receiptRecords.map((receipt) => ({
            id: receipt.record.id,
            hash: receipt.hash,
            redactedFields: receipt.removed,
        })),
        policyDecisions: decisionRecords.map((decision) => ({
            id: decision.record.id,
            hash: decision.hash,
            redactedFields: decision.removed,
        })),
        merkleRoot: (0, ledger_1.merkleRoot)([
            ...receiptRecords.map((r) => r.hash),
            ...decisionRecords.map((d) => d.hash),
        ]),
        selectiveDisclosure: selectiveDisclosure,
        ...input.manifest,
    };
    const { redacted: manifestForBundle, removed: removedManifestFields } = redactEntity(manifest, redaction.manifest);
    const manifestWithRedactions = manifestForBundle;
    manifestWithRedactions.redactionsApplied = {
        ...redaction,
        manifest: redaction.manifest ?? removedManifestFields,
    };
    const pack = tar_stream_1.default.pack();
    pack.entry({ name: 'receipts.json' }, JSON.stringify(receiptRecords.map((r) => r.record), null, 2));
    pack.entry({ name: 'policy-decisions.json' }, JSON.stringify(decisionRecords.map((d) => d.record), null, 2));
    pack.entry({ name: 'manifest.json' }, JSON.stringify(manifestWithRedactions, null, 2));
    const bundlePromise = gzipPack(pack);
    pack.finalize();
    const bundle = await bundlePromise;
    return {
        bundle,
        manifest: manifestWithRedactions,
        receipts: receiptRecords.map((r) => r.record),
        policyDecisions: decisionRecords.map((d) => d.record),
    };
}
async function unpackBundle(bundle) {
    const extract = tar_stream_1.default.extract();
    const gunzip = (0, zlib_1.createGunzip)();
    const files = {};
    return new Promise((resolve, reject) => {
        extract.on('entry', (header, stream, next) => {
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', () => {
                files[header.name] = Buffer.concat(chunks).toString('utf8');
                next();
            });
            stream.on('error', reject);
            stream.resume();
        });
        extract.on('finish', () => resolve(files));
        extract.on('error', reject);
        gunzip.on('error', reject);
        gunzip.pipe(extract);
        gunzip.end(bundle);
    });
}
