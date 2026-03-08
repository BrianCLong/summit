#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const index_js_1 = require("../index.js");
function readManifest(bundleDir) {
    const manifestPath = (0, node_path_1.join)(bundleDir, 'manifest.json');
    if (!(0, node_fs_1.existsSync)(manifestPath)) {
        throw new Error(`manifest.json not found in ${bundleDir}`);
    }
    return JSON.parse((0, node_fs_1.readFileSync)(manifestPath, 'utf8'));
}
function readSignature(bundleDir) {
    const signaturePath = (0, node_path_1.join)(bundleDir, 'manifest.sig');
    if (!(0, node_fs_1.existsSync)(signaturePath)) {
        throw new Error(`manifest.sig not found in ${bundleDir}`);
    }
    return JSON.parse((0, node_fs_1.readFileSync)(signaturePath, 'utf8'));
}
function usage() {
    console.error('Usage: prov-verify <bundle-dir> <public-key-file>');
    process.exit(1);
}
function main() {
    const [bundleDir, publicKeyFile] = process.argv.slice(2);
    if (!bundleDir || !publicKeyFile) {
        usage();
    }
    try {
        const manifest = readManifest(bundleDir);
        const signature = readSignature(bundleDir);
        const publicKey = (0, node_fs_1.readFileSync)(publicKeyFile);
        const verified = (0, index_js_1.verifyManifestSignature)(manifest, signature, publicKey);
        if (!verified) {
            console.error('❌ Verification failed – signature mismatch');
            process.exit(2);
        }
        console.log('✅ Provenance bundle verified successfully');
    }
    catch (error) {
        console.error('❌ Verification failed:', error instanceof Error ? error.message : error);
        process.exit(2);
    }
}
main();
