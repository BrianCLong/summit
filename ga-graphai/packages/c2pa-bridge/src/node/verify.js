"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyProvenance = verifyProvenance;
const fs_1 = require("fs");
const manifest_1 = require("../common/manifest");
const utils_1 = require("./utils");
const signature_1 = require("./signature");
async function readManifest(filePath) {
    const raw = await fs_1.promises.readFile(filePath, 'utf8');
    return JSON.parse(raw);
}
function collectIssue(message, level = 'error') {
    return { message, level };
}
async function verifyProvenance(options) {
    const manifest = await readManifest(options.manifestPath);
    const payload = (0, manifest_1.manifestCanonicalString)(manifest);
    const issues = [];
    const validSignature = (0, signature_1.verifyPayload)(payload, manifest.signature, options.publicKey, manifest.claim.signer.algorithm);
    if (!validSignature) {
        issues.push(collectIssue('Signature verification failed'));
    }
    const providedFingerprint = (0, utils_1.fingerprintPublicKey)(options.publicKey);
    if (providedFingerprint !== manifest.claim.signer.publicKeyFingerprint) {
        issues.push(collectIssue('Signer fingerprint mismatch with provided public key', 'warning'));
    }
    let validAssetHash = true;
    if (options.assetPath) {
        const assetHash = await (0, utils_1.hashFile)(options.assetPath);
        if (assetHash !== manifest.asset.hash) {
            validAssetHash = false;
            issues.push(collectIssue('Asset hash does not match manifest'));
        }
    }
    else {
        validAssetHash = false;
        issues.push(collectIssue('Asset path not provided for verification', 'warning'));
    }
    const manifestHash = (0, utils_1.computeManifestHash)(manifest);
    const claimHash = (0, utils_1.computeClaimHash)(manifest);
    let parent;
    if (manifest.parent) {
        if (!options.parentManifestPath || !options.parentPublicKey) {
            issues.push(collectIssue('Parent manifest/public key required for chain verification', 'warning'));
        }
        else {
            parent = await verifyProvenance({
                manifestPath: options.parentManifestPath,
                publicKey: options.parentPublicKey,
                assetPath: options.parentAssetPath,
            });
            const expectedHash = manifest.parent.manifestHash;
            if (parent.manifestHash !== expectedHash) {
                issues.push(collectIssue('Parent manifest hash mismatch'));
            }
            if (manifest.parent.assetHash !== parent.manifest.asset.hash) {
                issues.push(collectIssue('Parent asset hash mismatch'));
            }
            if (manifest.parent.signerId !== parent.manifest.claim.signer.id) {
                issues.push(collectIssue('Parent signer mismatch'));
            }
        }
    }
    return {
        manifest,
        manifestHash,
        claimHash,
        validSignature,
        validAssetHash,
        issues,
        signerId: manifest.claim.signer.id,
        parent,
    };
}
