"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerEvidence = registerEvidence;
exports.createClaim = createClaim;
exports.getClaim = getClaim;
exports.getEvidence = getEvidence;
exports.merkleRoot = merkleRoot;
exports.buildManifest = buildManifest;
exports.checkLicenses = checkLicenses;
exports.verifyClaim = verifyClaim;
exports.recordTransform = recordTransform;
exports.getProvenance = getProvenance;
exports.checkLicensesWithContext = checkLicensesWithContext;
exports.buildHashTree = buildHashTree;
exports.getHashTreeProof = getHashTreeProof;
exports.verifyHashTreeProof = verifyHashTreeProof;
// @ts-nocheck
const crypto_1 = require("crypto");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'prov-ledger' });
const evidenceStore = new Map();
const claimStore = new Map();
const { publicKey, privateKey } = (0, crypto_1.generateKeyPairSync)('ed25519');
function registerEvidence(input) {
    const id = (0, crypto_1.randomUUID)();
    const evid = { id, ...input, timestamp: new Date() };
    evidenceStore.set(id, evid);
    return evid;
}
function createClaim(input) {
    const id = (0, crypto_1.randomUUID)();
    const hash = (0, crypto_1.createHash)('sha256').update(input.text).digest('hex');
    const sig = (0, crypto_1.sign)(null, Buffer.from(hash, 'hex'), privateKey).toString('base64');
    const claim = {
        id,
        ...input,
        hash,
        signature: sig,
        publicKey: publicKey
            .export({ type: 'spki', format: 'der' })
            .toString('base64'),
        timestamp: new Date(),
    };
    claimStore.set(id, claim);
    return claim;
}
function getClaim(id) {
    return claimStore.get(id);
}
function getEvidence(id) {
    return evidenceStore.get(id);
}
function merkleRoot(hashes) {
    if (hashes.length === 0)
        return '';
    let nodes = hashes.map((h) => Buffer.from(h, 'hex'));
    while (nodes.length > 1) {
        const next = [];
        for (let i = 0; i < nodes.length; i += 2) {
            if (i + 1 < nodes.length) {
                next.push((0, crypto_1.createHash)('sha256')
                    .update(Buffer.concat([nodes[i], nodes[i + 1]]))
                    .digest());
            }
            else {
                next.push(nodes[i]);
            }
        }
        nodes = next;
    }
    return nodes[0].toString('hex');
}
function buildManifest(claimIds) {
    const claims = [];
    const licenses = new Set();
    const hashes = [];
    for (const cid of claimIds) {
        const claim = claimStore.get(cid);
        if (!claim)
            continue;
        hashes.push(claim.hash);
        claims.push({
            id: claim.id,
            text: claim.text,
            hash: claim.hash,
            signature: claim.signature,
            publicKey: claim.publicKey,
        });
        for (const evidId of claim.evidenceIds) {
            const evid = evidenceStore.get(evidId);
            if (evid)
                licenses.add(evid.licenseId);
        }
    }
    return {
        merkleRoot: merkleRoot(hashes),
        licenses: Array.from(licenses),
        claims,
    };
}
const incompatibleLicenses = new Map([
    [
        'GPL-3.0',
        {
            reason: 'GPL-3.0 license is incompatible with export policy',
            appealCode: 'LIC001',
        },
    ],
]);
function checkLicenses(licenses) {
    for (const lic of licenses) {
        const info = incompatibleLicenses.get(lic);
        if (info) {
            return { valid: false, ...info };
        }
    }
    return { valid: true };
}
function verifyClaim(manifestClaim) {
    const hash = (0, crypto_1.createHash)('sha256').update(manifestClaim.text).digest('hex');
    if (hash !== manifestClaim.hash)
        return false;
    return (0, crypto_1.verify)(null, Buffer.from(hash, 'hex'), {
        key: Buffer.from(manifestClaim.publicKey, 'base64'),
        format: 'der',
        type: 'spki',
    }, Buffer.from(manifestClaim.signature, 'base64'));
}
const transformStore = new Map();
const provenanceStore = new Map();
function recordTransform(input) {
    const id = (0, crypto_1.randomUUID)();
    const transform = { id, ...input };
    transformStore.set(id, transform);
    // Update provenance chains for outputs
    updateProvenanceChain(input.outputId, transform);
    logger.info({
        transformId: id,
        operation: input.operation,
        inputCount: input.inputIds.length,
        outputId: input.outputId,
    }, 'Transform recorded');
    return transform;
}
function updateProvenanceChain(outputId, transform) {
    const chain = provenanceStore.get(outputId) || {
        id: outputId,
        type: claimStore.has(outputId) ? 'claim' : 'evidence',
        source: claimStore.get(outputId) || evidenceStore.get(outputId),
        transforms: [],
        derivedFrom: [],
        lineage: [],
    };
    chain.transforms.push(transform);
    chain.derivedFrom.push(...transform.inputIds);
    // Build lineage tree
    const lineageNode = {
        id: transform.id,
        type: 'transform',
        parentIds: transform.inputIds,
        metadata: {
            operation: transform.operation,
            parameters: transform.parameters || {},
        },
        timestamp: transform.timestamp,
    };
    chain.lineage.push(lineageNode);
    provenanceStore.set(outputId, chain);
}
function getProvenance(id) {
    const existing = provenanceStore.get(id);
    if (existing) {
        return existing;
    }
    // Create basic provenance for existing evidence/claims
    const evidence = evidenceStore.get(id);
    const claim = claimStore.get(id);
    if (evidence) {
        const chain = {
            id,
            type: 'evidence',
            source: evidence,
            transforms: [],
            derivedFrom: [],
            lineage: [
                {
                    id: evidence.id,
                    type: 'evidence',
                    parentIds: [],
                    metadata: {
                        source: evidence.source,
                        licenseId: evidence.licenseId,
                        contentHash: evidence.contentHash,
                    },
                    timestamp: evidence.timestamp,
                },
            ],
        };
        provenanceStore.set(id, chain);
        return chain;
    }
    if (claim) {
        const chain = {
            id,
            type: 'claim',
            source: claim,
            transforms: [],
            derivedFrom: claim.evidenceIds,
            confidence: claim.confidence,
            lineage: [
                {
                    id: claim.id,
                    type: 'claim',
                    parentIds: claim.evidenceIds,
                    metadata: {
                        text: claim.text,
                        confidence: claim.confidence,
                        hash: claim.hash,
                    },
                    timestamp: claim.timestamp,
                },
            ],
        };
        provenanceStore.set(id, chain);
        return chain;
    }
    return null;
}
function checkLicensesWithContext(licenses, context) {
    // Start with basic license check
    const basicCheck = checkLicenses(licenses);
    // Enhanced policy evaluation
    const riskFactors = [];
    let riskLevel = 'low';
    // Check for restrictive licenses
    const restrictiveLicenses = licenses.filter((l) => ['GPL-3.0', 'AGPL-3.0', 'CC-BY-NC'].includes(l));
    if (restrictiveLicenses.length > 0) {
        riskFactors.push(`Restrictive licenses: ${restrictiveLicenses.join(', ')}`);
        riskLevel = 'medium';
    }
    // Check export type and destination
    if (context.exportType === 'dataset' &&
        context.destination?.includes('external')) {
        riskFactors.push('External dataset export requires additional review');
        riskLevel = 'high';
    }
    // Commercial vs research purpose
    if (context.purpose === 'commercial' && restrictiveLicenses.length > 0) {
        riskFactors.push('Commercial use with restrictive licenses');
        riskLevel = 'high';
    }
    let policyAction = 'allow';
    const policyReasons = [];
    if (!basicCheck.valid) {
        policyAction = 'deny';
        policyReasons.push(basicCheck.reason || 'License incompatibility');
    }
    else if (riskLevel === 'high') {
        policyAction = 'review';
        policyReasons.push('High-risk export requires manual review');
    }
    else if (riskLevel === 'medium' && context.exportType === 'dataset') {
        policyAction = 'review';
        policyReasons.push('Medium-risk dataset export requires review');
    }
    return {
        valid: policyAction === 'allow',
        reason: basicCheck.reason,
        appealCode: basicCheck.appealCode,
        appealUrl: basicCheck.appealCode
            ? `https://compliance.intelgraph.io/appeal/${basicCheck.appealCode}`
            : undefined,
        policyDecision: {
            action: policyAction,
            reasons: policyReasons,
            requiredApprovals: policyAction === 'review' ? ['compliance-officer'] : undefined,
        },
        riskAssessment: {
            level: riskLevel,
            factors: riskFactors,
        },
    };
}
function buildHashTree(hashes) {
    if (hashes.length === 0)
        return null;
    let nodes = hashes.map((hash) => ({ hash, data: hash }));
    while (nodes.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < nodes.length; i += 2) {
            const left = nodes[i];
            const right = i + 1 < nodes.length ? nodes[i + 1] : left;
            const combined = Buffer.concat([
                Buffer.from(left.hash, 'hex'),
                Buffer.from(right.hash, 'hex'),
            ]);
            const parentHash = (0, crypto_1.createHash)('sha256').update(combined).digest('hex');
            nextLevel.push({
                hash: parentHash,
                left,
                right: right !== left ? right : undefined,
            });
        }
        nodes = nextLevel;
    }
    return nodes[0];
}
function getHashTreeProof(tree, targetHash) {
    const proof = [];
    function findPath(node, target) {
        if (node.data === target) {
            return true;
        }
        if (!node.left && !node.right) {
            return false;
        }
        if (node.left && findPath(node.left, target)) {
            if (node.right)
                proof.push(node.right.hash);
            return true;
        }
        if (node.right && findPath(node.right, target)) {
            if (node.left)
                proof.push(node.left.hash);
            return true;
        }
        return false;
    }
    return findPath(tree, targetHash) ? proof : null;
}
function verifyHashTreeProof(targetHash, proof, rootHash) {
    let currentHash = targetHash;
    for (const proofHash of proof) {
        const combined = Buffer.concat([
            Buffer.from(currentHash, 'hex'),
            Buffer.from(proofHash, 'hex'),
        ]);
        currentHash = (0, crypto_1.createHash)('sha256').update(combined).digest('hex');
    }
    return currentHash === rootHash;
}
