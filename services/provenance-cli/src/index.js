#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = require("node:fs");
const node_url_1 = require("node:url");
const node_crypto_1 = require("node:crypto");
const canonicalize_js_1 = require("./canonicalize.js");
const hash_js_1 = require("./hash.js");
const ledger_js_1 = require("./ledger.js");
const manifest_js_1 = require("./manifest.js");
__exportStar(require("./canonicalize.js"), exports);
__exportStar(require("./hash.js"), exports);
__exportStar(require("./ledger.js"), exports);
__exportStar(require("./manifest.js"), exports);
__exportStar(require("./signing.js"), exports);
function parseArgs(argv) {
    const [command, ...rest] = argv;
    const positional = [];
    const flags = {};
    for (let i = 0; i < rest.length; i += 1) {
        const arg = rest[i];
        if (arg.startsWith('--')) {
            const key = arg.slice(2);
            const next = rest[i + 1];
            if (next && !next.startsWith('--')) {
                flags[key] = next;
                i += 1;
            }
            else {
                flags[key] = true;
            }
        }
        else {
            positional.push(arg);
        }
    }
    return { command, positional, flags };
}
function loadJson(path) {
    return JSON.parse((0, node_fs_1.readFileSync)(path, 'utf8'));
}
function saveJson(path, data) {
    (0, node_fs_1.writeFileSync)(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}
function ensureLedger(path, ledgerId) {
    if ((0, node_fs_1.existsSync)(path)) {
        return loadJson(path);
    }
    return {
        version: '1.0',
        ledgerId: ledgerId ?? 'default-ledger',
        publicKeys: [],
        entries: [],
        rootHash: '',
    };
}
function ensurePublicKey(ledger, keyId, privateKeyPem) {
    const existing = ledger.publicKeys.find((key) => key.keyId === keyId);
    if (existing) {
        return;
    }
    const publicKeyPem = (0, node_crypto_1.createPublicKey)(privateKeyPem).export({ type: 'spki', format: 'pem' }).toString();
    ledger.publicKeys.push({ keyId, algorithm: 'ed25519', publicKey: publicKeyPem });
}
function appendFromCli(flags) {
    const ledgerPath = flags.ledger;
    const privateKeyPath = flags['private-key'];
    const keyId = flags['key-id'];
    const claimId = flags.claim;
    const entityId = flags.entity;
    const evidenceId = flags.evidence;
    const stage = flags.stage;
    const contentHash = flags.hash;
    const actor = flags.actor ?? 'unknown';
    const ledgerId = flags['ledger-id'] ?? 'export-ledger';
    const timestamp = flags.timestamp;
    const artifactUri = flags['artifact-uri'];
    const metadataPath = flags.metadata;
    if (!ledgerPath || !privateKeyPath || !keyId || !claimId || !entityId || !evidenceId || !stage || !contentHash) {
        throw new Error('missing required flag for append-ledger-entry');
    }
    const privateKeyPem = (0, node_fs_1.readFileSync)(privateKeyPath, 'utf8');
    const ledger = ensureLedger(ledgerPath, ledgerId);
    ensurePublicKey(ledger, keyId, privateKeyPem);
    let metadata;
    if (metadataPath) {
        metadata = loadJson(metadataPath);
    }
    const input = {
        claimId,
        entityId,
        evidenceId,
        stage,
        contentHash,
        actor,
        signingKeyId: keyId,
        timestamp,
        artifactUri,
        metadata,
    };
    const entry = (0, ledger_js_1.appendLedgerEntry)(ledger, input, privateKeyPem);
    saveJson(ledgerPath, ledger);
    console.log(JSON.stringify(entry, null, 2));
}
function verifyLedgerCli(flags) {
    const ledgerPath = flags.ledger;
    if (!ledgerPath) {
        throw new Error('verify-ledger requires --ledger');
    }
    const ledger = loadJson(ledgerPath);
    const result = (0, ledger_js_1.verifyLedger)(ledger);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.valid ? 0 : 1;
}
function signManifestCli(flags) {
    const manifestPath = flags.manifest;
    const privateKeyPath = flags['private-key'];
    const keyId = flags['key-id'];
    const outPath = flags.out ?? manifestPath;
    if (!manifestPath || !privateKeyPath || !keyId) {
        throw new Error('sign-manifest requires --manifest, --private-key, and --key-id');
    }
    const manifest = loadJson(manifestPath);
    const privateKey = (0, node_fs_1.readFileSync)(privateKeyPath, 'utf8');
    const integrity = (0, manifest_js_1.signManifest)(manifest, privateKey, keyId);
    saveJson(outPath, manifest);
    console.log(JSON.stringify(integrity, null, 2));
}
function verifyManifestCli(flags) {
    const manifestPath = flags.manifest;
    const ledgerPath = flags.ledger;
    const publicKeyPath = flags['public-key'];
    if (!manifestPath || !ledgerPath) {
        throw new Error('verify-manifest requires --manifest and --ledger');
    }
    const manifest = loadJson(manifestPath);
    const ledger = loadJson(ledgerPath);
    const options = {};
    if (publicKeyPath) {
        options.manifestPublicKey = (0, node_fs_1.readFileSync)(publicKeyPath, 'utf8');
    }
    const result = (0, manifest_js_1.verifyManifest)(manifest, ledger, options);
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.valid ? 0 : 1;
}
function evidenceChainCli(flags) {
    const manifestPath = flags.manifest;
    const ledgerPath = flags.ledger;
    const entity = flags.entity;
    if (!manifestPath || !ledgerPath || !entity) {
        throw new Error('evidence-chain requires --manifest, --ledger, and --entity');
    }
    const manifest = loadJson(manifestPath);
    const ledger = loadJson(ledgerPath);
    const chains = (0, manifest_js_1.buildEvidenceChain)(entity, manifest, ledger);
    console.log(JSON.stringify(chains, null, 2));
}
function hashCli(positional) {
    if (positional.length === 0) {
        throw new Error('hash requires at least one file path');
    }
    const result = {};
    for (const path of positional) {
        result[path] = (0, hash_js_1.hashFile)(path);
    }
    console.log(JSON.stringify(result, null, 2));
}
function manifestHashCli(flags) {
    const manifestPath = flags.manifest;
    if (!manifestPath) {
        throw new Error('manifest-hash requires --manifest');
    }
    const manifest = loadJson(manifestPath);
    const payloadHash = (0, manifest_js_1.calculateManifestHash)(manifest);
    const { integrity: _integrity, ...payload } = manifest;
    const canonical = (0, canonicalize_js_1.canonicalString)(payload);
    console.log(JSON.stringify({
        manifestHash: payloadHash,
        canonical,
    }, null, 2));
}
function usage() {
    console.log(`provenance-cli <command> [options]\n\nCommands:\n  hash <file...>\n  append-ledger-entry --ledger <path> --private-key <path> --key-id <id> --claim <id> --entity <id> --evidence <id> --stage <name> --hash <sha256> [--actor <name>] [--artifact-uri <uri>] [--metadata <json>]\n  verify-ledger --ledger <path>\n  sign-manifest --manifest <path> --private-key <path> --key-id <id> [--out <path>]\n  verify-manifest --manifest <path> --ledger <path> [--public-key <path>]\n  evidence-chain --manifest <path> --ledger <path> --entity <id>\n  manifest-hash --manifest <path>\n`);
}
function runCli() {
    const parsed = parseArgs(process.argv.slice(2));
    const { command, positional, flags } = parsed;
    try {
        switch (command) {
            case 'hash':
                hashCli(positional);
                break;
            case 'append-ledger-entry':
                appendFromCli(flags);
                break;
            case 'verify-ledger':
                verifyLedgerCli(flags);
                break;
            case 'sign-manifest':
                signManifestCli(flags);
                break;
            case 'verify-manifest':
                verifyManifestCli(flags);
                break;
            case 'evidence-chain':
                evidenceChainCli(flags);
                break;
            case 'manifest-hash':
                manifestHashCli(flags);
                break;
            case undefined:
                usage();
                process.exitCode = 1;
                break;
            default:
                console.error(`unknown command ${command}`);
                usage();
                process.exitCode = 1;
        }
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(error.message);
        }
        else {
            console.error(error);
        }
        process.exitCode = 1;
    }
}
if (process.argv[1] && (0, node_url_1.fileURLToPath)(import.meta.url) === process.argv[1]) {
    runCli();
}
