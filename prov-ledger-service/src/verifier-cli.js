#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyBundle = verifyBundle;
// @ts-nocheck
const commander_1 = require("commander");
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
const tar_stream_1 = __importDefault(require("tar-stream"));
const zlib_1 = require("zlib");
const ledger_1 = require("./ledger");
const pino_1 = __importDefault(require("pino"));
const logger = (0, pino_1.default)({ name: 'prov-verifier' });
const program = new commander_1.Command();
async function verifyBundle(bundlePath) {
    const result = {
        success: false,
        errors: [],
        warnings: [],
        claimsVerified: 0,
        claimsTotal: 0,
    };
    try {
        const extract = tar_stream_1.default.extract();
        let manifestContent = null;
        extract.on('entry', (header, stream, next) => {
            if (header.name === 'manifest.json') {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => {
                    manifestContent = Buffer.concat(chunks).toString('utf8');
                    next();
                });
                stream.resume();
            }
            else {
                stream.on('end', () => next());
                stream.resume();
            }
        });
        await (0, promises_1.pipeline)((0, fs_1.createReadStream)(bundlePath), (0, zlib_1.createGunzip)(), extract);
        if (!manifestContent) {
            result.errors.push('No manifest.json found in bundle');
            return result;
        }
        let manifest;
        try {
            manifest = JSON.parse(manifestContent);
            result.manifest = manifest;
        }
        catch (error) {
            result.errors.push(`Invalid JSON in manifest: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return result;
        }
        // Validate manifest structure
        if (!manifest.merkleRoot ||
            !manifest.claims ||
            !Array.isArray(manifest.claims)) {
            result.errors.push('Invalid manifest structure');
            return result;
        }
        // Verify Merkle root
        const claimHashes = manifest.claims.map((c) => c.hash);
        const computedRoot = computeMerkleRoot(claimHashes);
        if (computedRoot !== manifest.merkleRoot) {
            result.errors.push(`Merkle root mismatch: expected ${manifest.merkleRoot}, got ${computedRoot}`);
        }
        // Verify each claim signature
        result.claimsTotal = manifest.claims.length;
        for (const claim of manifest.claims) {
            if ((0, ledger_1.verifyClaim)(claim)) {
                result.claimsVerified++;
            }
            else {
                result.errors.push(`Claim signature verification failed for claim ${claim.id}`);
            }
        }
        // Check for warnings
        if (manifest.licenses.length === 0) {
            result.warnings.push('No licenses specified in manifest');
        }
        if (result.errors.length === 0 &&
            result.claimsVerified === result.claimsTotal) {
            result.success = true;
        }
        return result;
    }
    catch (error) {
        result.errors.push(`Verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return result;
    }
}
function computeMerkleRoot(hashes) {
    if (hashes.length === 0)
        return '';
    let nodes = hashes.map((h) => Buffer.from(h, 'hex'));
    while (nodes.length > 1) {
        const next = [];
        for (let i = 0; i < nodes.length; i += 2) {
            if (i + 1 < nodes.length) {
                const combined = Buffer.concat([nodes[i], nodes[i + 1]]);
                const { createHash } = require('crypto');
                next.push(createHash('sha256').update(combined).digest());
            }
            else {
                next.push(nodes[i]);
            }
        }
        nodes = next;
    }
    return nodes[0].toString('hex');
}
function formatOutput(result, format = 'human') {
    if (format === 'json') {
        return JSON.stringify(result, null, 2);
    }
    const lines = [];
    lines.push('=== Provenance Bundle Verification Report ===\n');
    if (result.success) {
        lines.push('✅ VERIFICATION PASSED');
    }
    else {
        lines.push('❌ VERIFICATION FAILED');
    }
    lines.push(`Claims: ${result.claimsVerified}/${result.claimsTotal} verified`);
    if (result.manifest) {
        lines.push(`Merkle Root: ${result.manifest.merkleRoot}`);
        lines.push(`Licenses: ${result.manifest.licenses.join(', ') || 'None'}`);
    }
    if (result.errors.length > 0) {
        lines.push('\n🚨 ERRORS:');
        result.errors.forEach((error) => lines.push(`  • ${error}`));
    }
    if (result.warnings.length > 0) {
        lines.push('\n⚠️  WARNINGS:');
        result.warnings.forEach((warning) => lines.push(`  • ${warning}`));
    }
    return lines.join('\n');
}
program
    .name('prov-verify')
    .description('CLI tool to verify provenance bundles')
    .version('1.0.0');
program
    .command('verify')
    .description('Verify a provenance bundle')
    .argument('<bundle>', 'Path to the provenance bundle (.tgz)')
    .option('-f, --format <format>', 'Output format (human|json)', 'human')
    .option('-v, --verbose', 'Verbose logging')
    .action(async (bundlePath, options) => {
    if (options.verbose) {
        logger.level = 'debug';
    }
    logger.info({ bundlePath }, 'Starting bundle verification');
    const result = await verifyBundle(bundlePath);
    logger.info({
        success: result.success,
        claimsVerified: result.claimsVerified,
        claimsTotal: result.claimsTotal,
        errorsCount: result.errors.length,
        warningsCount: result.warnings.length,
    }, 'Verification completed');
    console.log(formatOutput(result, options.format));
    process.exit(result.success ? 0 : 1);
});
program
    .command('info')
    .description('Show information about a provenance bundle without verification')
    .argument('<bundle>', 'Path to the provenance bundle (.tgz)')
    .option('-f, --format <format>', 'Output format (human|json)', 'human')
    .action(async (bundlePath, options) => {
    try {
        const extract = tar_stream_1.default.extract();
        let manifestContent = null;
        extract.on('entry', (header, stream, next) => {
            if (header.name === 'manifest.json') {
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                stream.on('end', () => {
                    manifestContent = Buffer.concat(chunks).toString('utf8');
                    next();
                });
                stream.resume();
            }
            else {
                stream.on('end', () => next());
                stream.resume();
            }
        });
        await (0, promises_1.pipeline)((0, fs_1.createReadStream)(bundlePath), (0, zlib_1.createGunzip)(), extract);
        if (!manifestContent) {
            console.error('No manifest.json found in bundle');
            process.exit(1);
        }
        const manifest = JSON.parse(manifestContent);
        if (options.format === 'json') {
            console.log(JSON.stringify(manifest, null, 2));
        }
        else {
            console.log('=== Provenance Bundle Information ===\n');
            console.log(`Merkle Root: ${manifest.merkleRoot}`);
            console.log(`Claims Count: ${manifest.claims.length}`);
            console.log(`Licenses: ${manifest.licenses.join(', ') || 'None'}`);
            console.log('\nClaims:');
            manifest.claims.forEach((claim) => {
                console.log(`  • ID: ${claim.id}`);
                console.log(`    Text: ${claim.text.substring(0, 100)}${claim.text.length > 100 ? '...' : ''}`);
                console.log(`    Hash: ${claim.hash}`);
            });
        }
    }
    catch (error) {
        console.error(`Failed to read bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
        process.exit(1);
    }
});
if (require.main === module) {
    program.parse();
}
