"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const bundle_verifier_js_1 = require("../src/bundle-verifier.js");
const index_js_1 = require("../src/index.js");
function buildBundle() {
    const ledger = new index_js_1.SimpleProvenanceLedger();
    ledger.append({
        id: 'atom-1',
        category: 'ingest',
        actor: 'collector',
        action: 'register',
        resource: 'source',
        payload: { uri: 's3://bucket/object', policyId: 'pol-1' },
    });
    ledger.append({
        id: 'atom-2',
        category: 'policy',
        actor: 'policy-engine',
        action: 'decision',
        resource: 'ingest',
        payload: { decision: 'allow', rule: 'r1', policyId: 'pol-1' },
    });
    return ledger.exportEvidence();
}
(0, vitest_1.describe)('EvidenceBundleVerifier', () => {
    (0, vitest_1.it)('accepts a bundle with proofs, snapshot commitment, and policy tokens', () => {
        const bundle = buildBundle();
        const verifier = new bundle_verifier_js_1.EvidenceBundleVerifier();
        const result = verifier.verify(bundle);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.errors).toHaveLength(0);
        (0, vitest_1.expect)(result.warnings).toEqual([]);
        (0, vitest_1.expect)(bundle.snapshotCommitment?.merkleRoot).toBeDefined();
        (0, vitest_1.expect)(bundle.policyDecisionTokens?.length).toBeGreaterThan(0);
    });
    (0, vitest_1.it)('permits redacted bundles with warnings when proofs are missing', () => {
        const bundle = buildBundle();
        const redacted = {
            ...bundle,
            inclusionProofs: { ...(bundle.inclusionProofs ?? {}) },
            snapshotCommitment: { ...bundle.snapshotCommitment, redacted: true },
        };
        delete redacted.inclusionProofs?.['atom-2'];
        const verifier = new bundle_verifier_js_1.EvidenceBundleVerifier();
        const result = verifier.verify(redacted);
        (0, vitest_1.expect)(result.valid).toBe(true);
        (0, vitest_1.expect)(result.warnings).toContain('Missing inclusion proof for atom atom-2 (redacted view)');
    });
    (0, vitest_1.it)('flags missing proofs when bundle is not marked redacted', () => {
        const bundle = buildBundle();
        delete bundle.inclusionProofs?.['atom-1'];
        const verifier = new bundle_verifier_js_1.EvidenceBundleVerifier();
        const result = verifier.verify(bundle);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors).toContain('Missing inclusion proof for atom atom-1');
    });
    (0, vitest_1.it)('detects tampered policy decision tokens', () => {
        const bundle = buildBundle();
        if (bundle.policyDecisionTokens) {
            bundle.policyDecisionTokens[0] = { ...bundle.policyDecisionTokens[0], token: 'tampered' };
        }
        const verifier = new bundle_verifier_js_1.EvidenceBundleVerifier();
        const result = verifier.verify(bundle);
        (0, vitest_1.expect)(result.valid).toBe(false);
        (0, vitest_1.expect)(result.errors).toContain('Policy decision tokens do not match derived tokens');
    });
});
