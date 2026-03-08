#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const index_js_1 = require("./index.js");
const schema_js_1 = require("./schema.js");
function printHelp() {
    console.log(`ig-manifest v${schema_js_1.MANIFEST_VERSION}`);
    console.log('Usage: ig-manifest verify <bundlePath> [--json]');
    console.log('Commands:');
    console.log('  verify   Validate a manifest bundle');
    console.log('  sign     Sign a manifest bundle');
    console.log('Options:');
    console.log('  --json   Output a JSON report');
    console.log('  --signature <path>   Signature file (default: signature.json)');
    console.log('  --public-key <path>  Public key PEM for verification');
    console.log('  --private-key <path> Private key PEM for signing');
    console.log('  --key-id <id>        Signer key identifier');
    console.log('  --output <path>      Output signature file (default: signature.json)');
    console.log('  --help   Show this help message');
}
async function run() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        printHelp();
        return;
    }
    const [command, bundlePath, ...rest] = args;
    if (!bundlePath || !['verify', 'sign'].includes(command)) {
        printHelp();
        process.exitCode = 1;
        return;
    }
    const jsonOutput = rest.includes('--json');
    const getArgValue = (flag) => {
        const index = rest.indexOf(flag);
        if (index === -1) {
            return undefined;
        }
        return rest[index + 1];
    };
    try {
        if (command === 'sign') {
            const privateKeyPath = getArgValue('--private-key');
            const keyId = getArgValue('--key-id');
            const outputPath = getArgValue('--output') ?? 'signature.json';
            const publicKeyPath = getArgValue('--public-key');
            if (!privateKeyPath || !keyId) {
                console.error('sign requires --private-key and --key-id');
                process.exitCode = 1;
                return;
            }
            const manifestPath = node_path_1.default.join(bundlePath, 'manifest.json');
            const manifestRaw = await node_fs_1.default.promises.readFile(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestRaw);
            const signatureFile = (0, index_js_1.signManifest)(manifest, {
                privateKeyPem: await node_fs_1.default.promises.readFile(privateKeyPath, 'utf8'),
                publicKeyPem: publicKeyPath ? await node_fs_1.default.promises.readFile(publicKeyPath, 'utf8') : undefined,
                keyId,
            });
            const output = node_path_1.default.isAbsolute(outputPath)
                ? outputPath
                : node_path_1.default.join(bundlePath, outputPath);
            await node_fs_1.default.promises.writeFile(output, JSON.stringify(signatureFile, null, 2));
            console.log(`✔ Signature written to ${output}`);
            return;
        }
        const signaturePath = getArgValue('--signature');
        const publicKeyPath = getArgValue('--public-key');
        const report = await (0, index_js_1.verifyManifest)(bundlePath);
        if (publicKeyPath) {
            const manifestRaw = await node_fs_1.default.promises.readFile(node_path_1.default.join(bundlePath, 'manifest.json'), 'utf8');
            const manifest = JSON.parse(manifestRaw);
            const signatureFilePath = signaturePath ?? node_path_1.default.join(bundlePath, 'signature.json');
            const signatureRaw = await node_fs_1.default.promises.readFile(signatureFilePath, 'utf8');
            const signatureFile = JSON.parse(signatureRaw);
            const publicKeyPem = await node_fs_1.default.promises.readFile(publicKeyPath, 'utf8');
            const signatureCheck = (0, index_js_1.verifyManifestSignature)(manifest, signatureFile, publicKeyPem);
            report.signature = {
                valid: signatureCheck.valid,
                reason: signatureCheck.reason,
                keyId: signatureFile.signature?.keyId,
                algorithm: signatureFile.signature?.algorithm,
                signedAt: signatureFile.signature?.signedAt,
                manifestHash: signatureFile.manifestHash,
            };
            if (!signatureCheck.valid) {
                report.valid = false;
            }
        }
        if (jsonOutput) {
            console.log(JSON.stringify(report, null, 2));
        }
        else if (report.valid) {
            console.log(`✔ Manifest valid (version ${report.manifestVersion ?? 'unknown'})`);
            console.log(`Files checked: ${report.filesChecked}, transforms: ${report.transformsChecked}`);
            if (report.signature) {
                console.log(`Signature: ${report.signature.valid ? 'valid' : 'invalid'}`);
            }
        }
        else {
            console.error('Manifest verification failed:');
            report.issues.forEach((issue) => {
                console.error(`- [${issue.code}] ${issue.message}${issue.path ? ` (${issue.path})` : ''}`);
            });
            if (report.signature && !report.signature.valid && report.signature.reason) {
                console.error(`- [SIGNATURE] ${report.signature.reason}`);
            }
            process.exitCode = 1;
        }
    }
    catch (error) {
        console.error('Unexpected error while verifying manifest', error);
        process.exitCode = 1;
    }
}
run();
