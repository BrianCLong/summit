"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.signManifest = signManifest;
exports.verifyManifest = verifyManifest;
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
function verifyManifest(m, publicPem) {
    const v = (0, crypto_1.createVerify)('RSA-SHA256');
    const body = { ...m };
    delete body.signature;
    v.update(JSON.stringify(body));
    return v.verify(publicPem, Buffer.from(m.signature, 'base64'));
}
function buildWallet(runId, caseId, steps, privatePem, signer = 'kpw-media @intelgraph') {
    const leaves = steps.map(merkle_1.leafHash);
    const { root, layers } = (0, merkle_1.buildMerkle)(leaves);
    const manifestUnsigned = {
        runId,
        caseId,
        createdAt: new Date().toISOString(),
        merkleRoot: root,
        signer,
        algo: 'RSA-SHA256',
    };
    const manifest = signManifest(manifestUnsigned, privatePem);
    return { manifest, steps, leaves };
}
function disclose(selectIds, manifest, steps, leaves) {
    const index = new Map(steps.map((s, i) => [s.id, i]));
    const { layers } = (0, merkle_1.buildMerkle)(leaves);
    const disclosed = [];
    const proofs = [];
    for (const id of selectIds) {
        const i = index.get(id);
        if (i === undefined)
            continue;
        disclosed.push(steps[i]);
        proofs.push({ stepId: id, leaf: leaves[i], path: (0, merkle_1.proofForLeaf)(i, layers) });
    }
    return { manifest, disclosedSteps: disclosed, proofs };
}
function verifyDisclosure(bundle, publicPem) {
    if (!verifyManifest(bundle.manifest, publicPem))
        return false;
    for (const s of bundle.disclosedSteps) {
        const pr = bundle.proofs.find((p) => p.stepId === s.id);
        if (!pr)
            return false;
        const lh = (0, merkle_1.leafHash)(s);
        if (lh !== pr.leaf)
            return false;
        if (!(0, merkle_1.verifyProof)(pr.leaf, pr.path, bundle.manifest.merkleRoot))
            return false;
    }
    return true;
}
