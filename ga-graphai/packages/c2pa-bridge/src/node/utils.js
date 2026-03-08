"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashFile = hashFile;
exports.hashCanonical = hashCanonical;
exports.fingerprintPublicKey = fingerprintPublicKey;
exports.determineMime = determineMime;
exports.defaultManifestPath = defaultManifestPath;
exports.computeManifestHash = computeManifestHash;
exports.computeClaimHash = computeClaimHash;
exports.ensureDirectory = ensureDirectory;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const mime_types_1 = __importDefault(require("mime-types"));
const canonical_1 = require("../common/canonical");
const manifest_1 = require("../common/manifest");
async function hashFile(filePath) {
    const file = await fs_1.promises.readFile(filePath);
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(file);
    return hash.digest('hex');
}
function hashCanonical(value) {
    const hash = (0, crypto_1.createHash)('sha256');
    if (typeof value === 'string') {
        hash.update(value);
    }
    else {
        hash.update((0, canonical_1.canonicalize)(value));
    }
    return hash.digest('hex');
}
function fingerprintPublicKey(publicKey) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(publicKey.trim());
    return hash.digest('hex');
}
function determineMime(assetPath, explicit) {
    if (explicit) {
        return explicit;
    }
    const guessed = mime_types_1.default.lookup(assetPath);
    return guessed || undefined;
}
function defaultManifestPath(assetPath) {
    return `${assetPath}.cpb.json`;
}
function computeManifestHash(manifest) {
    return hashCanonical((0, manifest_1.manifestCanonicalString)(manifest));
}
function computeClaimHash(manifest) {
    return hashCanonical(manifest.claim);
}
async function ensureDirectory(filePath) {
    const dir = path_1.default.dirname(filePath);
    await fs_1.promises.mkdir(dir, { recursive: true });
}
