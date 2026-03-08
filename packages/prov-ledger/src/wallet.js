"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signManifest = signManifest;
exports.verifyWalletManifest = verifyWalletManifest;
exports.buildWallet = buildWallet;
exports.disclose = disclose;
exports.verifyDisclosure = verifyDisclosure;
const crypto_1 = require("crypto");
const merkle_1 = require("./merkle");
function signManifest(m, privatePem) {
    const signer = (0, crypto_1.createSign)('RSA-SHA256');
    signer.update(JSON.stringify(m));
    return { ...m, signature: signer.sign(privatePem, 'base64') };
}
function verifyWalletManifest(m, publicPem) {
    const v = (0, crypto_1.createVerify)('RSA-SHA256');
    const body = { ...m };
    delete body.signature;
    v.update(JSON.stringify(body));
    return v.verify(publicPem, Buffer.from(m.signature, 'base64'));
}
// Build a full wallet from step commits
function buildWallet(runId, caseId, steps, privatePem, signerId = 'prov-ledger@intelgraph') {
    const leaves = steps.map(merkle_1.leafHash);
    const { root, layers: _layers } = (0, merkle_1.buildMerkle)(leaves);
    const manifestUnsigned = {
        runId,
        caseId,
        createdAt: new Date().toISOString(),
        merkleRoot: root,
        signer: signerId,
        algo: 'RSA-SHA256',
    };
    const manifest = signManifest(manifestUnsigned, privatePem);
    return { manifest, leaves, steps };
}
// Selectively disclose a subset (by step ids) with inclusion proofs
function disclose(selectStepIds, manifest, steps, leaves) {
    const idToIndex = new Map(steps.map((s, i) => [s.id, i]));
    const { layers } = (0, merkle_1.buildMerkle)(leaves);
    const disclosed = [];
    const proofs = [];
    for (const sid of selectStepIds) {
        const idx = idToIndex.get(sid);
        if (idx === undefined) {
            continue;
        }
        disclosed.push(steps[idx]);
        const leaf = leaves[idx];
        proofs.push({ stepId: sid, leaf, path: (0, merkle_1.proofForLeaf)(idx, layers) });
    }
    return { manifest, disclosedSteps: disclosed, proofs };
}
// Verify a selective disclosure bundle
function verifyDisclosure(b, publicPem) {
    if (!verifyWalletManifest(b.manifest, publicPem)) {
        return false;
    }
    for (let i = 0; i < b.disclosedSteps.length; i++) {
        const s = b.disclosedSteps[i];
        const pr = b.proofs.find((p) => p.stepId === s.id);
        if (!pr) {
            return false;
        }
        const leaf = (0, merkle_1.leafHash)(s);
        if (leaf !== pr.leaf) {
            return false;
        }
        if (!(0, merkle_1.verifyProof)(pr.leaf, pr.path, b.manifest.merkleRoot)) {
            return false;
        }
    }
    return true;
}
