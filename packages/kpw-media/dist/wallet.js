import { createSign, createVerify } from 'crypto';
import { leafHash, buildMerkle, proofForLeaf, verifyProof } from './merkle';
export function signManifest(m, privatePem) {
    const signer = createSign('RSA-SHA256');
    signer.update(JSON.stringify(m));
    return { ...m, signature: signer.sign(privatePem, 'base64') };
}
export function verifyManifest(m, publicPem) {
    const v = createVerify('RSA-SHA256');
    const body = { ...m };
    delete body.signature;
    v.update(JSON.stringify(body));
    return v.verify(publicPem, Buffer.from(m.signature, 'base64'));
}
export function buildWallet(runId, caseId, steps, privatePem, signer = 'kpw-media @intelgraph') {
    const leaves = steps.map(leafHash);
    const { root, layers } = buildMerkle(leaves);
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
export function disclose(selectIds, manifest, steps, leaves) {
    const index = new Map(steps.map((s, i) => [s.id, i]));
    const { layers } = buildMerkle(leaves);
    const disclosed = [];
    const proofs = [];
    for (const id of selectIds) {
        const i = index.get(id);
        if (i === undefined)
            continue;
        disclosed.push(steps[i]);
        proofs.push({ stepId: id, leaf: leaves[i], path: proofForLeaf(i, layers) });
    }
    return { manifest, disclosedSteps: disclosed, proofs };
}
export function verifyDisclosure(bundle, publicPem) {
    if (!verifyManifest(bundle.manifest, publicPem))
        return false;
    for (const s of bundle.disclosedSteps) {
        const pr = bundle.proofs.find((p) => p.stepId === s.id);
        if (!pr)
            return false;
        const lh = leafHash(s);
        if (lh !== pr.leaf)
            return false;
        if (!verifyProof(pr.leaf, pr.path, bundle.manifest.merkleRoot))
            return false;
    }
    return true;
}
