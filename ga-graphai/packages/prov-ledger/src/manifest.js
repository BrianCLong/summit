"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransparencyLog = void 0;
exports.createExportManifest = createExportManifest;
exports.verifyManifest = verifyManifest;
const node_crypto_1 = require("node:crypto");
const data_integrity_1 = require("@ga-graphai/data-integrity");
function hashPayload(payload) {
    return (0, data_integrity_1.stableHash)(payload);
}
function buildMerkleRoot(hashes) {
    if (hashes.length === 0) {
        return '';
    }
    let layer = [...hashes];
    while (layer.length > 1) {
        const next = [];
        for (let i = 0; i < layer.length; i += 2) {
            const left = layer[i];
            const right = layer[i + 1] ?? left;
            next.push((0, node_crypto_1.createHash)('sha256')
                .update(left + right)
                .digest('hex'));
        }
        layer = next;
    }
    return layer[0];
}
function deriveTransforms(entries) {
    return entries.map((entry) => ({
        id: entry.id,
        category: entry.category,
        actor: entry.actor,
        action: entry.action,
        resource: entry.resource,
        payloadHash: hashPayload(entry.payload),
        timestamp: entry.timestamp,
        previousHash: entry.previousHash,
    }));
}
const defaultKeyPair = (0, node_crypto_1.generateKeyPairSync)('rsa', { modulusLength: 2048 });
const DEFAULT_PRIVATE_KEY = defaultKeyPair.privateKey
    .export({ format: 'pem', type: 'pkcs1' })
    .toString();
const DEFAULT_PUBLIC_KEY = defaultKeyPair.publicKey
    .export({ format: 'pem', type: 'pkcs1' })
    .toString();
function createExportManifest(options) {
    const now = options.now ?? (() => new Date());
    const transforms = deriveTransforms(options.ledger);
    const hashes = transforms.map((node) => (0, node_crypto_1.createHash)('sha256')
        .update(node.id + node.payloadHash)
        .digest('hex'));
    const ledgerHead = options.ledger.at(-1)?.hash ?? '';
    const snapshotId = options.snapshotId ?? (0, node_crypto_1.randomUUID)();
    const issuer = options.issuer ?? 'prov-ledger';
    const keyId = options.keyId ?? 'issuer-key';
    const privateKey = options.privateKey ?? DEFAULT_PRIVATE_KEY;
    const publicKey = options.publicKey ?? DEFAULT_PUBLIC_KEY;
    const merkleRoot = buildMerkleRoot(hashes);
    const commitment = (0, data_integrity_1.stableHash)({ merkleRoot, ledgerHead, snapshotId });
    const signer = (0, node_crypto_1.createSign)('RSA-SHA256');
    signer.update(commitment);
    const signature = signer.sign(privateKey, 'base64');
    const manifest = {
        caseId: options.caseId,
        generatedAt: now().toISOString(),
        version: '1.0.0',
        ledgerHead,
        merkleRoot,
        transforms,
        signature: {
            issuer,
            keyId,
            algorithm: 'rsa-sha256',
            signedAt: now().toISOString(),
            snapshotId,
            commitment,
            signature,
            publicKey,
        },
    };
    options.transparencyLog?.record(manifest);
    return manifest;
}
function verifyManifest(manifest, ledger, options = {}) {
    const reasons = [];
    const { evidence, publicKey, transparencyLog, requireSignature = true } = options;
    const expectedTransforms = deriveTransforms(ledger);
    if (expectedTransforms.length !== manifest.transforms.length) {
        reasons.push('Transform count mismatch');
    }
    expectedTransforms.forEach((transform, index) => {
        const candidate = manifest.transforms[index];
        if (!candidate) {
            return;
        }
        if (candidate.payloadHash !== transform.payloadHash) {
            reasons.push(`Payload hash mismatch for transform ${transform.id}`);
        }
        if (candidate.previousHash !== transform.previousHash) {
            reasons.push(`Previous hash mismatch for transform ${transform.id}`);
        }
    });
    const expectedHashes = expectedTransforms.map((node) => (0, node_crypto_1.createHash)('sha256')
        .update(node.id + node.payloadHash)
        .digest('hex'));
    const expectedRoot = buildMerkleRoot(expectedHashes);
    if (expectedRoot !== manifest.merkleRoot) {
        reasons.push('Merkle root mismatch');
    }
    const ledgerHead = ledger.at(-1)?.hash ?? '';
    if (ledgerHead !== manifest.ledgerHead) {
        reasons.push('Ledger head hash mismatch');
    }
    if (evidence && evidence.headHash !== manifest.ledgerHead) {
        reasons.push('Evidence bundle head hash mismatch');
    }
    if (requireSignature) {
        const signature = manifest.signature;
        if (!signature) {
            reasons.push('Missing issuer signature');
        }
        else {
            const commitment = (0, data_integrity_1.stableHash)({
                merkleRoot: manifest.merkleRoot,
                ledgerHead: manifest.ledgerHead,
                snapshotId: signature.snapshotId,
            });
            if (commitment !== signature.commitment) {
                reasons.push('Commitment mismatch');
            }
            const verifier = (0, node_crypto_1.createVerify)('RSA-SHA256');
            verifier.update(signature.commitment);
            const keyToUse = publicKey ?? signature.publicKey;
            if (!keyToUse) {
                reasons.push('Missing issuer public key');
            }
            else if (!verifier.verify(keyToUse, signature.signature, 'base64')) {
                reasons.push('Invalid issuer signature');
            }
            if (transparencyLog && !transparencyLog.verify(manifest)) {
                reasons.push('Transparency log replay or omission detected');
            }
        }
    }
    return { valid: reasons.length === 0, reasons };
}
class TransparencyLog {
    entries = [];
    bySnapshot = new Map();
    now;
    constructor(now = () => new Date()) {
        this.now = now;
    }
    record(manifest) {
        const { snapshotId, commitment } = manifest.signature;
        const existing = this.bySnapshot.get(snapshotId);
        if (existing) {
            if (existing.commitment !== commitment) {
                throw new Error('Snapshot replay detected');
            }
            return existing;
        }
        const entry = {
            snapshotId,
            commitment,
            manifestHash: (0, data_integrity_1.stableHash)(manifest),
            recordedAt: this.now().toISOString(),
        };
        this.entries.push(entry);
        this.bySnapshot.set(snapshotId, entry);
        return entry;
    }
    verify(manifest) {
        const { snapshotId, commitment } = manifest.signature;
        const entry = this.bySnapshot.get(snapshotId);
        return Boolean(entry && entry.commitment === commitment);
    }
    list() {
        return [...this.entries];
    }
}
exports.TransparencyLog = TransparencyLog;
