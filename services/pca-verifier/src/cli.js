#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.program = void 0;
const commander_1 = require("commander");
const promises_1 = __importDefault(require("fs/promises"));
const manifest_js_1 = require("./manifest.js");
const verifier_js_1 = require("./verifier.js");
const transforms_js_1 = require("./transforms.js");
/**
 * PCA CLI - Proof-Carrying Analytics Command Line Interface
 */
const program = new commander_1.Command();
exports.program = program;
program
    .name('pca')
    .description('Proof-Carrying Analytics verifier and manifest builder')
    .version('0.1.0');
program
    .command('build')
    .description('Build provenance manifest from DAG and input data')
    .requiredOption('-i, --input <file>', 'Input CSV file')
    .requiredOption('-d, --dag <file>', 'Transform DAG JSON file')
    .option('-o, --output <file>', 'Output manifest file (default: manifest.json)')
    .option('-t, --tolerance <number>', 'Numeric tolerance for hash verification', parseFloat)
    .action(async (options) => {
    try {
        const inputData = await promises_1.default.readFile(options.input, 'utf-8');
        const dagJson = await promises_1.default.readFile(options.dag, 'utf-8');
        const dag = JSON.parse(dagJson);
        console.log('Building manifest...');
        const manifest = await manifest_js_1.ManifestBuilder.buildFromDAG(dag, inputData, transforms_js_1.defaultExecutor, options.tolerance);
        const outputFile = options.output || 'manifest.json';
        await promises_1.default.writeFile(outputFile, JSON.stringify(manifest, null, 2));
        console.log(`✓ Manifest built successfully: ${outputFile}`);
        console.log(`  Root hash: ${manifest.rootHash}`);
        console.log(`  Nodes: ${manifest.nodes.length}`);
        console.log(`  Signature: ${manifest.signature?.substring(0, 16)}...`);
    }
    catch (error) {
        console.error('Error building manifest:', error);
        process.exit(1);
    }
});
program
    .command('verify')
    .description('Verify provenance manifest by replaying transforms')
    .requiredOption('-m, --manifest <file>', 'Provenance manifest JSON file')
    .requiredOption('-i, --input <file>', 'Original input file')
    .action(async (options) => {
    try {
        const manifestJson = await promises_1.default.readFile(options.manifest, 'utf-8');
        const manifest = JSON.parse(manifestJson);
        const inputData = await promises_1.default.readFile(options.input, 'utf-8');
        console.log('Verifying manifest...');
        const verifier = new verifier_js_1.ProvenanceVerifier();
        const result = await verifier.verify(manifest, inputData, transforms_js_1.defaultExecutor);
        console.log('\n=== Verification Result ===');
        console.log(`Status: ${result.valid ? '✓ VALID' : '✗ INVALID'}`);
        console.log(`Manifest version: ${manifest.version}`);
        console.log(`Created: ${manifest.created}`);
        console.log(`Root hash: ${manifest.rootHash}`);
        console.log(`Replay hash: ${result.replayHash}`);
        if (result.tolerance) {
            console.log(`Tolerance: ${result.tolerance}`);
        }
        if (result.errors.length > 0) {
            console.log('\n❌ Errors:');
            result.errors.forEach((err) => console.log(`  - ${err}`));
        }
        if (result.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            result.warnings.forEach((warn) => console.log(`  - ${warn}`));
        }
        if (!result.valid) {
            console.log('\n❌ Verification FAILED');
            process.exit(1);
        }
        else {
            console.log('\n✓ Verification PASSED');
        }
    }
    catch (error) {
        console.error('Error verifying manifest:', error);
        process.exit(1);
    }
});
program
    .command('inspect')
    .description('Inspect provenance manifest')
    .requiredOption('-m, --manifest <file>', 'Provenance manifest JSON file')
    .action(async (options) => {
    try {
        const manifestJson = await promises_1.default.readFile(options.manifest, 'utf-8');
        const manifest = JSON.parse(manifestJson);
        console.log('=== Provenance Manifest ===');
        console.log(`Version: ${manifest.version}`);
        console.log(`Created: ${manifest.created}`);
        console.log(`Root Hash: ${manifest.rootHash}`);
        console.log(`Signature: ${manifest.signature || 'none'}`);
        console.log(`Verifier Algorithm: ${manifest.verifier.algorithm}`);
        if (manifest.verifier.tolerance) {
            console.log(`Tolerance: ${manifest.verifier.tolerance}`);
        }
        console.log(`\nNodes (${manifest.nodes.length}):`);
        manifest.nodes.forEach((node, idx) => {
            console.log(`\n  ${idx + 1}. ${node.type.toUpperCase()}`);
            console.log(`     Hash: ${node.hash}`);
            console.log(`     Timestamp: ${node.timestamp}`);
            if (node.transform) {
                console.log(`     Transform: ${node.transform.type} (${node.transform.id})`);
                console.log(`     Version: ${node.transform.version}`);
                console.log(`     Params: ${JSON.stringify(node.transform.params)}`);
                console.log(`     Input Hash: ${node.transform.inputHash}`);
                console.log(`     Output Hash: ${node.transform.outputHash}`);
            }
            if (node.metadata) {
                console.log(`     Metadata: ${JSON.stringify(node.metadata)}`);
            }
        });
    }
    catch (error) {
        console.error('Error inspecting manifest:', error);
        process.exit(1);
    }
});
// Run CLI
if (import.meta.url === `file://${process.argv[1]}`) {
    program.parse();
}
