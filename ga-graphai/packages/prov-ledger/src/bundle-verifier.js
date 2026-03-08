"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceBundleVerifier = void 0;
const node_crypto_1 = require("node:crypto");
const bundle_utils_js_1 = require("./bundle-utils.js");
function computeLeafFromStoredHashes(atomId, bundle, fallbackContent, fallbackMetadata) {
    const contentHash = bundle.contentHashes?.[atomId];
    const metadataHash = bundle.metadataHashes?.[atomId];
    if (contentHash && metadataHash) {
        return (0, node_crypto_1.createHash)('sha256').update(`${contentHash}${metadataHash}`).digest('hex');
    }
    const fallbackContentHash = fallbackContent[atomId];
    const fallbackMetadataHash = fallbackMetadata[atomId];
    return (0, node_crypto_1.createHash)('sha256')
        .update(`${fallbackContentHash ?? ''}${fallbackMetadataHash ?? ''}`)
        .digest('hex');
}
function normalizeProofs(bundle) {
    return bundle.inclusionProofs ?? {};
}
class EvidenceBundleVerifier {
    verify(bundle) {
        const errors = [];
        const warnings = [];
        if (!bundle.entries.length) {
            return { valid: false, errors: ['Bundle contains no entries'], warnings };
        }
        const computedArtifacts = (0, bundle_utils_js_1.buildMerkleArtifacts)(bundle.entries);
        const atomIds = bundle.atomIds ?? computedArtifacts.atomIds;
        const proofs = normalizeProofs(bundle);
        atomIds.forEach((atomId) => {
            if (!computedArtifacts.contentHashes[atomId]) {
                errors.push(`Atom ${atomId} not present in entries`);
            }
        });
        if (!bundle.snapshotCommitment) {
            errors.push('Snapshot commitment is missing');
        }
        const merkleRoot = bundle.snapshotCommitment?.merkleRoot ?? computedArtifacts.merkleRoot;
        atomIds.forEach((atomId) => {
            const leaf = computeLeafFromStoredHashes(atomId, bundle, computedArtifacts.contentHashes, computedArtifacts.metadataHashes);
            const proof = proofs[atomId];
            if (!proof) {
                if (bundle.snapshotCommitment?.redacted) {
                    warnings.push(`Missing inclusion proof for atom ${atomId} (redacted view)`);
                }
                else {
                    errors.push(`Missing inclusion proof for atom ${atomId}`);
                }
                return;
            }
            if (!(0, bundle_utils_js_1.verifyMerkleProof)(leaf, proof, merkleRoot)) {
                errors.push(`Invalid Merkle proof for atom ${atomId}`);
            }
        });
        if (!merkleRoot) {
            errors.push('Merkle root is empty');
        }
        else if (computedArtifacts.merkleRoot && merkleRoot !== computedArtifacts.merkleRoot) {
            errors.push('Merkle root mismatch with recomputed tree');
        }
        if (bundle.snapshotCommitment && !(0, bundle_utils_js_1.verifySnapshotSignature)(bundle.snapshotCommitment)) {
            errors.push('Snapshot signature verification failed');
        }
        if (bundle.policyDecisionTokens && bundle.policyDecisionTokens.length > 0) {
            const derived = (0, bundle_utils_js_1.augmentEvidenceBundle)({ ...bundle, policyDecisionTokens: undefined }, bundle.entries, { issuedAt: bundle.snapshotCommitment ? new Date(bundle.snapshotCommitment.issuedAt) : undefined }).policyDecisionTokens;
            const derivedTokens = (derived ?? []).map((token) => token.token).sort();
            const providedTokens = bundle.policyDecisionTokens.map((token) => token.token).sort();
            if (derivedTokens.join('|') !== providedTokens.join('|')) {
                errors.push('Policy decision tokens do not match derived tokens');
            }
        }
        else {
            warnings.push('No policy decision tokens supplied');
        }
        if (bundle.executionAttestation) {
            if (!bundle.executionAttestation.report) {
                errors.push('Execution attestation report missing');
            }
        }
        return { valid: errors.length === 0, errors, warnings };
    }
}
exports.EvidenceBundleVerifier = EvidenceBundleVerifier;
