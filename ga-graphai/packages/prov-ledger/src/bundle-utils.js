"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMerkleArtifacts = buildMerkleArtifacts;
exports.buildSnapshotCommitment = buildSnapshotCommitment;
exports.derivePolicyDecisionTokens = derivePolicyDecisionTokens;
exports.buildExecutionAttestation = buildExecutionAttestation;
exports.verifyMerkleProof = verifyMerkleProof;
exports.verifySnapshotSignature = verifySnapshotSignature;
exports.augmentEvidenceBundle = augmentEvidenceBundle;
const node_crypto_1 = require("node:crypto");
const data_integrity_1 = require("@ga-graphai/data-integrity");
const MERKLE_ALGORITHM = 'sha256-merkle-v1';
function sha256Hex(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
}
function hashPair(left, right) {
    return sha256Hex(`${left}${right}`);
}
function contentHash(entry) {
    return (0, data_integrity_1.stableHash)(entry.payload ?? {});
}
function metadataHash(entry) {
    return (0, data_integrity_1.stableHash)({
        id: entry.id,
        category: entry.category,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        timestamp: entry.timestamp,
        previousHash: entry.previousHash ?? null,
        hash: entry.hash,
    });
}
function leafHash(content, meta) {
    return hashPair(content, meta);
}
function buildProof(leaves, index) {
    const proof = [];
    let cursorIndex = index;
    let layer = [...leaves];
    while (layer.length > 1) {
        const isRightNode = cursorIndex % 2 === 1;
        const siblingIndex = isRightNode ? cursorIndex - 1 : cursorIndex + 1;
        const sibling = layer[siblingIndex] ?? layer[cursorIndex];
        proof.push({ position: isRightNode ? 'left' : 'right', hash: sibling });
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1] ?? left;
            next.push(hashPair(left, right));
        }
        cursorIndex = Math.floor(cursorIndex / 2);
        layer = next;
    }
    return proof;
}
function buildMerkleArtifacts(entries) {
    const atomIds = [];
    const contentHashes = {};
    const metadataHashes = {};
    const leaves = [];
    entries.forEach((entry) => {
        const atomId = entry.id;
        const content = contentHash(entry);
        const meta = metadataHash(entry);
        atomIds.push(atomId);
        contentHashes[atomId] = content;
        metadataHashes[atomId] = meta;
        leaves.push(leafHash(content, meta));
    });
    if (leaves.length === 0) {
        return { atomIds, contentHashes, metadataHashes, inclusionProofs: {}, merkleRoot: '' };
    }
    let layer = [...leaves];
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1] ?? left;
            next.push(hashPair(left, right));
        }
        layer = next;
    }
    const root = layer[0];
    const inclusionProofs = {};
    leaves.forEach((_, index) => {
        inclusionProofs[atomIds[index]] = buildProof(leaves, index);
    });
    return { atomIds, contentHashes, metadataHashes, inclusionProofs, merkleRoot: root };
}
function buildSnapshotCommitment(options) {
    const issuedAt = (options.issuedAt ?? new Date()).toISOString();
    const bundleHash = sha256Hex(`${options.merkleRoot}|${options.headHash ?? ''}`);
    return {
        merkleRoot: options.merkleRoot,
        headHash: options.headHash,
        algorithm: options.algorithm ?? MERKLE_ALGORITHM,
        issuedAt,
        bundleHash,
        signer: options.signer,
        signature: options.signature,
        publicKey: options.publicKey,
        redacted: options.redacted,
    };
}
function derivePolicyDecisionTokens(entries, merkleRoot, issuedAt = new Date()) {
    const issuedAtIso = issuedAt.toISOString();
    const tokens = [];
    entries.forEach((entry) => {
        const maybePolicyId = typeof entry.payload === 'object' && entry.payload && 'policyId' in entry.payload
            ? String(entry.payload.policyId)
            : undefined;
        if (entry.category === 'policy' || maybePolicyId) {
            tokens.push({
                token: sha256Hex(`${entry.hash}|${merkleRoot}`),
                policyId: maybePolicyId,
                issuedAt: issuedAtIso,
                signer: entry.actor,
            });
        }
    });
    if (tokens.length === 0) {
        tokens.push({ token: sha256Hex(`${merkleRoot}|policy`), issuedAt: issuedAtIso });
    }
    return tokens;
}
function buildExecutionAttestation(report, verified, issuedAt, verifier) {
    return {
        format: 'verifiable-execution',
        report,
        verified,
        issuedAt: issuedAt.toISOString(),
        verifier,
    };
}
function verifyMerkleProof(leaf, proof, expectedRoot) {
    let cursor = leaf;
    proof.forEach((step) => {
        cursor =
            step.position === 'left' ? hashPair(step.hash, cursor) : hashPair(cursor, step.hash);
    });
    return cursor === expectedRoot;
}
function verifySnapshotSignature(commitment) {
    if (!commitment.signature || !commitment.publicKey) {
        return true;
    }
    const verifier = (0, node_crypto_1.createVerify)('SHA256');
    verifier.update(commitment.bundleHash ?? commitment.merkleRoot);
    verifier.end();
    return verifier.verify(commitment.publicKey, Buffer.from(commitment.signature, 'base64'));
}
function augmentEvidenceBundle(bundle, entries, options = {}) {
    const { atomIds, contentHashes, metadataHashes, inclusionProofs, merkleRoot } = buildMerkleArtifacts(entries);
    const snapshotCommitment = buildSnapshotCommitment({
        merkleRoot,
        headHash: bundle.headHash,
        signer: options.signer,
        publicKey: options.publicKey,
        signature: options.signature,
        issuedAt: options.issuedAt,
        redacted: options.redacted,
    });
    const policyDecisionTokens = derivePolicyDecisionTokens(entries, snapshotCommitment.merkleRoot, options.issuedAt ?? new Date());
    return {
        ...bundle,
        atomIds,
        contentHashes,
        metadataHashes,
        inclusionProofs,
        snapshotCommitment,
        policyDecisionTokens,
    };
}
