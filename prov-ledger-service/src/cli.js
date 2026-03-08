#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBundle = verifyBundle;
const fs_1 = __importDefault(require("fs"));
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
const ledger_1 = require("./ledger");
async function readManifest(path) {
    const extract = tar_stream_1.default.extract();
    const gunzip = (0, zlib_1.createGunzip)();
    const stream = fs_1.default.createReadStream(path);
    return new Promise((resolve, reject) => {
        let manifest = '';
        extract.on('entry', (header, streamEntry, next) => {
            if (header.name === 'manifest.json') {
                streamEntry.on('data', (d) => (manifest += d.toString()));
                streamEntry.on('end', () => next());
                streamEntry.on('error', reject);
            }
            else {
                streamEntry.resume();
                streamEntry.on('end', next);
            }
        });
        extract.on('finish', () => {
            try {
                resolve(JSON.parse(manifest));
            }
            catch (err) {
                reject(err);
            }
        });
        stream.pipe(gunzip).pipe(extract);
    });
}
async function verifyBundle(path) {
    const manifest = await readManifest(path);
    for (const claim of manifest.claims) {
        if (!(0, ledger_1.verifyClaim)(claim)) {
            throw new Error(`Claim ${claim.id} failed verification`);
        }
    }
    const computedRoot = (0, ledger_1.merkleRoot)(manifest.claims.map((c) => c.hash));
    if (computedRoot !== manifest.merkleRoot) {
        throw new Error('Merkle root mismatch');
    }
    return true;
}
async function main() {
    const file = process.argv[2];
    if (!file) {
        console.error('usage: prov-verify <bundle.tgz>');
        process.exit(1);
    }
    try {
        await verifyBundle(file);
        console.log('OK');
    }
    catch (err) {
        console.error('Verification failed:', err);
        process.exit(1);
    }
}
if (require.main === module) {
    main();
}
