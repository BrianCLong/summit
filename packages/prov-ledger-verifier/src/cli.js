#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_process_1 = __importDefault(require("node:process"));
const bundleVerifier_js_1 = require("./bundleVerifier.js");
const reporter_js_1 = require("./reporter.js");
function printHelp() {
    console.log(`Provenance Export Manifest Verifier

Usage:
  prov-ledger-verify <bundle-path> [--json]
  prov-ledger-verify --bundle <bundle-path> [--json]

Options:
  -b, --bundle   Path to export bundle directory or .zip
  --json         Emit machine-readable JSON report
  -h, --help     Show this message
`);
}
async function main() {
    const args = node_process_1.default.argv.slice(2);
    let bundlePath;
    let json = false;
    for (let i = 0; i < args.length; i++) {
        const arg = args[i] ?? '';
        if (arg === '--bundle' || arg === '-b') {
            const next = args[i + 1];
            if (next) {
                bundlePath = next;
                i += 1;
            }
        }
        else if (arg === '--json') {
            json = true;
        }
        else if (arg === '--help' || arg === '-h') {
            printHelp();
            return;
        }
        else if (!arg.startsWith('-') && !bundlePath) {
            bundlePath = arg;
        }
    }
    if (!bundlePath) {
        printHelp();
        node_process_1.default.exitCode = 2;
        return;
    }
    try {
        const report = await (0, bundleVerifier_js_1.verifyBundle)(bundlePath);
        if (json) {
            console.log(JSON.stringify(report, null, 2));
        }
        else {
            console.log((0, reporter_js_1.formatReport)(report));
        }
        node_process_1.default.exitCode = report.ok ? 0 : 1;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`Verification failed: ${message}`);
        node_process_1.default.exitCode = 1;
    }
}
main();
