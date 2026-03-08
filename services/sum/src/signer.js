"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDeterministicSnapshot = buildDeterministicSnapshot;
exports.signArtifact = signArtifact;
exports.finalizePipeline = finalizePipeline;
// @ts-nocheck
const canonical_js_1 = require("./utils/canonical.js");
const POLICY_VERSION = 'sum-signer-v1';
const DEFAULT_SECRET = 'sum-secret-not-for-production';
function buildDeterministicSnapshot(submission) {
    return {
        codeHash: (0, canonical_js_1.sha256)(submission.code),
        metadataHash: (0, canonical_js_1.sha256)((0, canonical_js_1.canonicalize)(submission.metadata ?? {})),
        tenantId: submission.tenantId,
        policyVersion: POLICY_VERSION,
    };
}
function signArtifact(submission, analysis, sandbox, rating, config = {}) {
    const snapshot = buildDeterministicSnapshot(submission);
    const payload = (0, canonical_js_1.canonicalize)({
        snapshot,
        analysis,
        sandbox,
        rating,
        policyVersion: config.policyVersion ?? POLICY_VERSION,
    });
    const secret = config.secret ?? process.env.SUM_SIGNING_SECRET ?? DEFAULT_SECRET;
    const signature = (0, canonical_js_1.hmacSha256)(secret, payload);
    return {
        submissionHash: snapshot.codeHash,
        tenantId: submission.tenantId,
        analysis,
        sandbox,
        rating,
        signature,
        issuedAt: new Date().toISOString(),
        policyVersion: config.policyVersion ?? POLICY_VERSION,
    };
}
function finalizePipeline(submission, analysis, sandbox, rating, config = {}) {
    const artifact = signArtifact(submission, canonicalClone(analysis), canonicalClone(sandbox), canonicalClone(rating), config);
    const accepted = analysis.passed && sandbox.status === 'success';
    return { accepted, artifact };
}
function canonicalClone(value) {
    return JSON.parse((0, canonical_js_1.canonicalize)(value));
}
