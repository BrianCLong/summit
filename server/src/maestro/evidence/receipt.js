"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalStringify = canonicalStringify;
exports.hashCanonical = hashCanonical;
exports.getCodeDigest = getCodeDigest;
exports.resolveSigningSecret = resolveSigningSecret;
exports.buildInputsPayload = buildInputsPayload;
exports.buildOutputsPayload = buildOutputsPayload;
exports.signReceiptPayload = signReceiptPayload;
exports.buildProvenanceReceipt = buildProvenanceReceipt;
const crypto_1 = __importDefault(require("crypto"));
function canonicalStringify(value) {
    const seen = new WeakSet();
    const order = (input) => {
        if (input === null || typeof input !== 'object') {
            return input;
        }
        if (seen.has(input)) {
            return null;
        }
        seen.add(input);
        if (Array.isArray(input)) {
            return input.map((item) => order(item));
        }
        const orderedEntries = Object.keys(input)
            .sort()
            .map((key) => [key, order(input[key])]);
        return Object.fromEntries(orderedEntries);
    };
    return JSON.stringify(order(value));
}
function hashCanonical(value) {
    return crypto_1.default.createHash('sha256').update(canonicalStringify(value)).digest('hex');
}
function getCodeDigest() {
    return (process.env.GIT_SHA ||
        process.env.SOURCE_COMMIT ||
        process.env.BUILD_SHA ||
        'unknown');
}
function resolveSigningSecret() {
    const secret = process.env.EVIDENCE_SIGNING_SECRET ||
        (process.env.NODE_ENV !== 'production' ? 'dev-secret' : undefined);
    if (!secret) {
        throw new Error('EVIDENCE_SIGNING_SECRET is required to sign receipts');
    }
    return {
        secret,
        kid: process.env.EVIDENCE_SIGNER_KID || 'dev',
        alg: 'HS256',
    };
}
function buildInputsPayload(run, events) {
    const relevantEvents = events
        .filter((event) => event.kind === 'schedule.dispatched' || event.kind === 'input.provided')
        .map((event) => ({
        kind: event.kind,
        payload: event.payload,
    }));
    return {
        runbook: run.runbook,
        startedAt: run.started_at,
        events: relevantEvents,
    };
}
function buildOutputsPayload(run, artifacts) {
    const artifactHashes = [...artifacts]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((artifact) => ({ id: artifact.id, sha256: artifact.sha256_hash }));
    return {
        status: run.status,
        endedAt: run.ended_at,
        artifacts: artifactHashes,
    };
}
function signReceiptPayload(payload, secret) {
    return crypto_1.default
        .createHmac('sha256', secret)
        .update(canonicalStringify(payload))
        .digest('base64url');
}
function buildProvenanceReceipt(run, events, artifacts) {
    const createdAt = new Date().toISOString();
    const receiptId = crypto_1.default.randomUUID();
    const inputsPayload = buildInputsPayload(run, events);
    const outputsPayload = buildOutputsPayload(run, artifacts);
    const inputsHash = hashCanonical(inputsPayload);
    const outputsHash = hashCanonical(outputsPayload);
    const signerInfo = resolveSigningSecret();
    const baseReceipt = {
        receiptId,
        runId: run.id,
        createdAt,
        codeDigest: getCodeDigest(),
        inputsHash,
        outputsHash,
        signer: { kid: signerInfo.kid, alg: signerInfo.alg },
        summary: {
            runbook: run.runbook,
            status: run.status,
            startedAt: run.started_at,
            endedAt: run.ended_at,
        },
        evidence: {
            artifacts: artifacts.map((artifact) => ({
                id: artifact.id,
                type: artifact.artifact_type,
                sha256: artifact.sha256_hash,
                createdAt: artifact.created_at,
            })),
        },
    };
    const signature = signReceiptPayload(baseReceipt, signerInfo.secret);
    return {
        ...baseReceipt,
        signature,
    };
}
