"use strict";
// @ts-nocheck
/**
 * ManifestService - Creates and verifies bundle manifests with cryptographic integrity
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ManifestService = void 0;
const node_crypto_1 = require("node:crypto");
const uuid_1 = require("uuid");
/**
 * Generates deterministic hash from content using SHA-256
 */
function hashContent(content) {
    const canonical = JSON.stringify(content, Object.keys(content).sort());
    return (0, node_crypto_1.createHash)('sha256').update(canonical).digest('hex');
}
/**
 * Computes Merkle root hash from item hashes
 */
function computeMerkleRoot(hashes) {
    if (hashes.length === 0) {
        return (0, node_crypto_1.createHash)('sha256').update('EMPTY_MANIFEST').digest('hex');
    }
    if (hashes.length === 1) {
        return hashes[0];
    }
    const sortedHashes = [...hashes].sort();
    let level = sortedHashes;
    while (level.length > 1) {
        const nextLevel = [];
        for (let i = 0; i < level.length; i += 2) {
            const left = level[i];
            const right = level[i + 1] || left;
            const combined = (0, node_crypto_1.createHash)('sha256')
                .update(left + right)
                .digest('hex');
            nextLevel.push(combined);
        }
        level = nextLevel;
    }
    return level[0];
}
class ManifestService {
    version = '1.0.0';
    /**
     * Generate a new signing key pair
     */
    generateSigningKeys() {
        const { privateKey, publicKey } = (0, node_crypto_1.generateKeyPairSync)('ed25519');
        return {
            privateKey,
            publicKey,
            keyId: (0, uuid_1.v4)(),
        };
    }
    /**
     * Create a manifest for a bundle
     */
    createManifest(bundleId, bundleType, items, createdBy, provenanceChainId) {
        const itemHashes = items.map((item) => ({
            itemId: item.itemId,
            itemType: item.itemType,
            contentHash: hashContent(item.content),
            path: item.path,
        }));
        const rootHash = computeMerkleRoot(itemHashes.map((h) => h.contentHash));
        const manifest = {
            version: this.version,
            bundleId,
            bundleType,
            createdAt: new Date().toISOString(),
            createdBy,
            rootHash,
            itemHashes,
            provenanceChainId,
            signatures: [],
        };
        return { manifest, rootHash };
    }
    /**
     * Sign a manifest
     */
    signManifest(manifest, signerId, signerRole, privateKey, keyId) {
        const payloadToSign = JSON.stringify({
            bundleId: manifest.bundleId,
            rootHash: manifest.rootHash,
            createdAt: manifest.createdAt,
            itemHashes: manifest.itemHashes,
        });
        const signatureBuffer = (0, node_crypto_1.sign)(null, Buffer.from(payloadToSign), privateKey);
        const signature = signatureBuffer.toString('base64');
        const bundleSignature = {
            signerId,
            signerRole,
            algorithm: 'ed25519',
            signature,
            signedAt: new Date().toISOString(),
            keyId,
        };
        return bundleSignature;
    }
    /**
     * Verify a manifest's integrity and signatures
     */
    verifyManifest(manifest, items, publicKeys) {
        const errors = [];
        // Verify item hashes
        const computedHashes = new Map();
        for (const item of items) {
            const computed = hashContent(item.content);
            computedHashes.set(item.itemId, computed);
        }
        for (const entry of manifest.itemHashes) {
            const computed = computedHashes.get(entry.itemId);
            if (!computed) {
                errors.push(`Missing item: ${entry.itemId}`);
                continue;
            }
            if (computed !== entry.contentHash) {
                errors.push(`Hash mismatch for item ${entry.itemId}: expected ${entry.contentHash}, got ${computed}`);
            }
        }
        // Verify root hash
        const computedRootHash = computeMerkleRoot(manifest.itemHashes.map((h) => h.contentHash));
        if (computedRootHash !== manifest.rootHash) {
            errors.push(`Root hash mismatch: expected ${manifest.rootHash}, got ${computedRootHash}`);
        }
        // Verify signatures
        const payloadToVerify = JSON.stringify({
            bundleId: manifest.bundleId,
            rootHash: manifest.rootHash,
            createdAt: manifest.createdAt,
            itemHashes: manifest.itemHashes,
        });
        for (const sig of manifest.signatures) {
            const publicKey = publicKeys.get(sig.keyId);
            if (!publicKey) {
                errors.push(`Missing public key for signature: ${sig.keyId}`);
                continue;
            }
            try {
                const isValid = (0, node_crypto_1.verify)(null, Buffer.from(payloadToVerify), publicKey, Buffer.from(sig.signature, 'base64'));
                if (!isValid) {
                    errors.push(`Invalid signature from ${sig.signerId} (key: ${sig.keyId})`);
                }
            }
            catch (err) {
                errors.push(`Signature verification failed for ${sig.signerId}: ${err}`);
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            computedRootHash,
            itemCount: items.length,
        };
    }
    /**
     * Create manifest entries from evidence items
     */
    evidenceToManifestItems(evidence) {
        return evidence.map((e, index) => ({
            itemId: e.id,
            itemType: 'evidence',
            content: e,
            path: `evidence/${index.toString().padStart(4, '0')}_${e.id}.json`,
        }));
    }
    /**
     * Create manifest entries from claims
     */
    claimsToManifestItems(claims) {
        return claims.map((c, index) => ({
            itemId: c.id,
            itemType: 'claim',
            content: c,
            path: `claims/${index.toString().padStart(4, '0')}_${c.id}.json`,
        }));
    }
    /**
     * Hash a single piece of content
     */
    hashContent(content) {
        return hashContent(content);
    }
    /**
     * Compute hash for chain of custody linkage
     */
    computeChainHash(prevHash, payload) {
        const payloadStr = JSON.stringify(payload);
        return (0, node_crypto_1.createHash)('sha256')
            .update(prevHash + payloadStr)
            .digest('hex');
    }
}
exports.ManifestService = ManifestService;
