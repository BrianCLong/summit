"use strict";
/**
 * Canonical Entities - Provenance Carriers
 *
 * Implements cryptographically-verifiable provenance tracking:
 * source → assertion → transform pipeline with content hashing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashSource = hashSource;
exports.hashAssertion = hashAssertion;
exports.hashTransform = hashTransform;
exports.hashChain = hashChain;
exports.hashManifest = hashManifest;
exports.verifyChain = verifyChain;
exports.verifyManifest = verifyManifest;
exports.createProvenanceChain = createProvenanceChain;
exports.createProvenanceManifest = createProvenanceManifest;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Hash a provenance source
 */
function hashSource(source) {
    const content = JSON.stringify({
        sourceId: source.sourceId,
        sourceType: source.sourceType,
        retrievedAt: source.retrievedAt.toISOString(),
        sourceMetadata: source.sourceMetadata,
    });
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Hash a provenance assertion
 */
function hashAssertion(assertion) {
    const content = JSON.stringify({
        assertionId: assertion.assertionId,
        claim: assertion.claim,
        assertedBy: assertion.assertedBy,
        assertedAt: assertion.assertedAt.toISOString(),
        confidence: assertion.confidence,
        evidence: assertion.evidence.sort(),
    });
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Hash a provenance transform
 */
function hashTransform(transform) {
    const content = JSON.stringify({
        transformId: transform.transformId,
        transformType: transform.transformType,
        algorithm: transform.algorithm,
        algorithmVersion: transform.algorithmVersion,
        inputs: transform.inputs.sort(),
        parameters: transform.parameters,
        transformedAt: transform.transformedAt.toISOString(),
    });
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Hash a complete provenance chain
 */
function hashChain(chain) {
    const content = JSON.stringify({
        chainId: chain.chainId,
        sourceHash: chain.source.sourceContentHash,
        assertionHashes: chain.assertions.map(a => a.assertionHash).sort(),
        transformHashes: chain.transforms.map(t => t.transformHash).sort(),
        createdAt: chain.createdAt.toISOString(),
    });
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Hash a complete provenance manifest
 */
function hashManifest(manifest) {
    const content = JSON.stringify({
        version: manifest.version,
        scope: manifest.scope,
        chainHashes: manifest.chains.map(c => c.chainHash).sort(),
        metadata: manifest.metadata,
    });
    return crypto_1.default.createHash('sha256').update(content).digest('hex');
}
/**
 * Verify integrity of a provenance chain
 */
function verifyChain(chain) {
    const errors = [];
    // Verify source hash
    const sourceHash = hashSource(chain.source);
    if (sourceHash !== chain.source.sourceContentHash) {
        errors.push(`Source hash mismatch: expected ${chain.source.sourceContentHash}, got ${sourceHash}`);
    }
    // Verify assertion hashes
    for (const assertion of chain.assertions) {
        const assertionHash = hashAssertion(assertion);
        if (assertionHash !== assertion.assertionHash) {
            errors.push(`Assertion ${assertion.assertionId} hash mismatch`);
        }
    }
    // Verify transform hashes
    for (const transform of chain.transforms) {
        const transformHash = hashTransform(transform);
        if (transformHash !== transform.transformHash) {
            errors.push(`Transform ${transform.transformId} hash mismatch`);
        }
    }
    // Verify chain hash
    const chainHash = hashChain(chain);
    if (chainHash !== chain.chainHash) {
        errors.push(`Chain hash mismatch: expected ${chain.chainHash}, got ${chainHash}`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Verify integrity of a provenance manifest
 */
function verifyManifest(manifest) {
    const errors = [];
    // Verify all chains
    for (const chain of manifest.chains) {
        const chainVerification = verifyChain(chain);
        if (!chainVerification.valid) {
            errors.push(`Chain ${chain.chainId} verification failed: ${chainVerification.errors.join(', ')}`);
        }
    }
    // Verify manifest hash
    const manifestHash = hashManifest(manifest);
    if (manifestHash !== manifest.manifestHash) {
        errors.push(`Manifest hash mismatch: expected ${manifest.manifestHash}, got ${manifestHash}`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Create a new provenance chain
 */
function createProvenanceChain(chainId, source, assertions, transforms) {
    const sourceWithHash = {
        ...source,
        sourceContentHash: hashSource(source),
    };
    const assertionsWithHash = assertions.map(a => ({
        ...a,
        assertionHash: hashAssertion(a),
    }));
    const transformsWithHash = transforms.map(t => ({
        ...t,
        transformHash: hashTransform(t),
    }));
    const chainWithoutHash = {
        chainId,
        source: sourceWithHash,
        assertions: assertionsWithHash,
        transforms: transformsWithHash,
        createdAt: new Date(),
    };
    return {
        ...chainWithoutHash,
        chainHash: hashChain(chainWithoutHash),
    };
}
/**
 * Create a provenance manifest for a set of chains
 */
function createProvenanceManifest(scope, chains, metadata) {
    const manifestWithoutHash = {
        version: '1.0.0',
        scope,
        chains,
        metadata,
    };
    return {
        ...manifestWithoutHash,
        manifestHash: hashManifest(manifestWithoutHash),
    };
}
