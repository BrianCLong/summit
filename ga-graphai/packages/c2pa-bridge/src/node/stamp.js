"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stampAsset = stampAsset;
exports.createDerivativeStamp = createDerivativeStamp;
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const manifest_1 = require("../common/manifest");
const utils_1 = require("./utils");
const signature_1 = require("./signature");
const verify_1 = require("./verify");
function sanitizeToolChain(toolChain) {
    return toolChain.map((entry) => ({
        name: entry.name,
        version: entry.version,
        parameters: entry.parameters && Object.fromEntries(Object.entries(entry.parameters).sort()),
    }));
}
function buildClaimMetadata(metadata) {
    return {
        toolChain: sanitizeToolChain(metadata.toolChain),
        datasetLineageId: metadata.datasetLineageId,
        policyHash: metadata.policyHash,
        notes: metadata.notes,
    };
}
async function stampAsset(options) {
    const assetHash = await (0, utils_1.hashFile)(options.assetPath);
    const mimeType = (0, utils_1.determineMime)(options.assetPath, options.signer.mimeType);
    const fingerprint = (0, utils_1.fingerprintPublicKey)(options.signer.publicKey);
    const claimMetadata = buildClaimMetadata(options.metadata);
    const timestamp = new Date().toISOString();
    const manifest = {
        version: '1.0',
        asset: {
            name: path_1.default.basename(options.assetPath),
            hash: assetHash,
            mimeType,
        },
        claim: {
            toolChain: claimMetadata.toolChain,
            datasetLineageId: claimMetadata.datasetLineageId,
            policyHash: claimMetadata.policyHash,
            timestamp,
            signer: {
                id: options.signer.id,
                algorithm: options.signer.algorithm,
                publicKeyFingerprint: fingerprint,
            },
            notes: claimMetadata.notes,
        },
        signature: '',
    };
    const payload = (0, manifest_1.manifestCanonicalString)(manifest);
    manifest.signature = (0, signature_1.signPayload)(payload, options.signer.privateKey, options.signer.algorithm);
    const manifestPath = options.outputPath ?? (0, utils_1.defaultManifestPath)(options.assetPath);
    await (0, utils_1.ensureDirectory)(manifestPath);
    await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    return { manifestPath, manifest };
}
async function createDerivativeStamp(options) {
    const parentRaw = await fs_1.promises.readFile(options.parentManifestPath, 'utf8');
    const parentManifest = JSON.parse(parentRaw);
    const parentVerification = await (0, verify_1.verifyProvenance)({
        manifestPath: options.parentManifestPath,
        publicKey: options.parentPublicKey,
        assetPath: options.parentAssetPath,
    });
    if (!parentVerification.validSignature) {
        throw new Error('Parent manifest signature verification failed.');
    }
    if (options.parentAssetPath && !parentVerification.validAssetHash) {
        throw new Error('Parent asset hash verification failed.');
    }
    if (parentVerification.issues.some((issue) => issue.level === 'error')) {
        throw new Error('Parent manifest contains blocking verification issues.');
    }
    const parentManifestHash = (0, utils_1.computeManifestHash)(parentManifest);
    const assetHash = await (0, utils_1.hashFile)(options.assetPath);
    const fingerprint = (0, utils_1.fingerprintPublicKey)(options.signer.publicKey);
    const mimeType = (0, utils_1.determineMime)(options.assetPath, options.signer.mimeType);
    const timestamp = new Date().toISOString();
    const combinedToolChain = [
        ...parentManifest.claim.toolChain,
        ...(options.metadata?.toolChain ? sanitizeToolChain(options.metadata.toolChain) : []),
    ];
    const manifest = {
        version: '1.0',
        asset: {
            name: path_1.default.basename(options.assetPath),
            hash: assetHash,
            mimeType,
        },
        claim: {
            toolChain: combinedToolChain,
            datasetLineageId: options.metadata?.datasetLineageId ?? parentManifest.claim.datasetLineageId,
            policyHash: options.metadata?.policyHash ?? parentManifest.claim.policyHash,
            timestamp,
            signer: {
                id: options.signer.id,
                algorithm: options.signer.algorithm,
                publicKeyFingerprint: fingerprint,
            },
            redactions: options.redactions && options.redactions.length > 0 ? [...options.redactions] : undefined,
            notes: options.metadata?.notes ?? parentManifest.claim.notes,
        },
        parent: {
            manifestHash: parentManifestHash,
            assetHash: parentManifest.asset.hash,
            signerId: parentManifest.claim.signer.id,
            timestamp: parentManifest.claim.timestamp,
        },
        signature: '',
    };
    const payload = (0, manifest_1.manifestCanonicalString)(manifest);
    manifest.signature = (0, signature_1.signPayload)(payload, options.signer.privateKey, options.signer.algorithm);
    const manifestPath = options.outputPath ?? (0, utils_1.defaultManifestPath)(options.assetPath);
    await (0, utils_1.ensureDirectory)(manifestPath);
    await fs_1.promises.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    return { manifestPath, manifest };
}
