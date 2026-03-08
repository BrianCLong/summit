#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBundle = verifyBundle;
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function readJsonFile(filePath) {
    if (!fs_1.default.existsSync(filePath)) {
        throw new Error(`Missing required file: ${filePath}`);
    }
    const content = fs_1.default.readFileSync(filePath, 'utf8');
    try {
        return JSON.parse(content);
    }
    catch (err) {
        throw new Error(`Invalid JSON in ${filePath}: ${err.message}`);
    }
}
function computeSha256(buffer) {
    return crypto_1.default.createHash('sha256').update(buffer).digest('hex');
}
function validateHashesDocument(doc) {
    if (doc.algorithm !== 'sha256') {
        throw new Error(`Unsupported hash algorithm: ${doc.algorithm}`);
    }
    if (!Array.isArray(doc.files) || doc.files.length === 0) {
        throw new Error('hashes.json must include at least one file entry');
    }
    for (const entry of doc.files) {
        if (!entry.path || !entry.sha256) {
            throw new Error('Each hash entry requires path and sha256');
        }
    }
}
function validateSignatureDocument(doc) {
    const requiredFields = ['algorithm', 'keyId', 'target', 'signature'];
    for (const field of requiredFields) {
        if (!doc[field]) {
            throw new Error(`signature.json missing field: ${field}`);
        }
    }
}
function computePlaceholderSignature(targetDigest, signature) {
    return crypto_1.default
        .createHash('sha256')
        .update(`${signature.algorithm}:${signature.keyId}:${targetDigest}`)
        .digest('base64');
}
function verifyBundle(bundleDir, options = {}) {
    const errors = [];
    const manifestPath = path_1.default.join(bundleDir, 'manifest.json');
    const hashesPath = path_1.default.join(bundleDir, 'hashes.json');
    const signaturePath = path_1.default.join(bundleDir, 'signature.json');
    const checkedFiles = [];
    try {
        // Ensure manifest exists and is valid JSON. The structure is validated elsewhere; here we just require readability.
        readJsonFile(manifestPath);
    }
    catch (err) {
        errors.push(err.message);
        return { ok: false, errors, checkedFiles, signatureVerified: false };
    }
    let hashes;
    try {
        hashes = readJsonFile(hashesPath);
        validateHashesDocument(hashes);
    }
    catch (err) {
        errors.push(err.message);
        return { ok: false, errors, checkedFiles, signatureVerified: false };
    }
    for (const entry of hashes.files) {
        const filePath = path_1.default.join(bundleDir, entry.path);
        if (!fs_1.default.existsSync(filePath)) {
            errors.push(`Missing file referenced in hashes.json: ${entry.path}`);
            continue;
        }
        const digest = computeSha256(fs_1.default.readFileSync(filePath));
        checkedFiles.push(entry.path);
        if (digest !== entry.sha256) {
            errors.push(`Hash mismatch for ${entry.path}: expected ${entry.sha256}, found ${digest}`);
        }
    }
    let signatureVerified = false;
    if (fs_1.default.existsSync(signaturePath)) {
        try {
            const signatureDoc = readJsonFile(signaturePath);
            validateSignatureDocument(signatureDoc);
            if (signatureDoc.target !== 'hashes.json') {
                errors.push(`signature.json target must be "hashes.json" but was "${signatureDoc.target}"`);
            }
            else {
                const targetDigest = computeSha256(fs_1.default.readFileSync(hashesPath));
                const expectedSignature = computePlaceholderSignature(targetDigest, signatureDoc);
                if (expectedSignature !== signatureDoc.signature) {
                    errors.push('Signature verification failed: placeholder signature mismatch');
                }
                else {
                    signatureVerified = true;
                }
            }
        }
        catch (err) {
            errors.push(err.message);
        }
    }
    else if (options.requireSignature) {
        errors.push('Signature is required but signature.json was not found.');
    }
    return {
        ok: errors.length === 0,
        errors,
        checkedFiles,
        signatureVerified,
    };
}
if (require.main === module) {
    const bundleDir = process.argv[2];
    if (!bundleDir) {
        console.error('Usage: ts-node scripts/bundle/verify.ts <bundle-directory>');
        process.exit(1);
    }
    const result = verifyBundle(bundleDir);
    if (!result.ok) {
        console.error('Bundle verification failed:');
        result.errors.forEach((err) => console.error(`- ${err}`));
        process.exit(1);
    }
    console.log(`Bundle verified. Checked ${result.checkedFiles.length} files.`);
    if (result.signatureVerified) {
        console.log('Signature placeholder verified.');
    }
}
