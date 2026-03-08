#!/usr/bin/env ts-node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const audit_bundle_js_1 = require("../../server/src/disclosure/audit-bundle.js");
function parseArgs(argv) {
    return argv.reduce((acc, curr) => {
        if (curr.startsWith('--')) {
            const [key, value = 'true'] = curr.replace(/^--/, '').split('=');
            acc[key] = value;
        }
        return acc;
    }, {});
}
async function main() {
    const args = parseArgs(process.argv.slice(2));
    const tenantId = args.tenant || args.tenantId || 'default';
    const startTime = args.start || args.from
        ? new Date(args.start || args.from)
        : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = args.end ? new Date(args.end) : new Date();
    const format = args.format ?? 'tar';
    const output = args.out ? path_1.default.resolve(args.out) : undefined;
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        throw new Error('Invalid start or end time supplied');
    }
    const bundle = await (0, audit_bundle_js_1.buildAuditBundle)({
        tenantId,
        startTime,
        endTime,
        format,
        outputPath: output,
    });
    const checksumPath = `${bundle.bundlePath}.sha256`;
    await (0, promises_1.writeFile)(checksumPath, `${bundle.sha256}  ${path_1.default.basename(bundle.bundlePath)}\n`, 'utf8');
    // Emit CLI-friendly summary
    console.log('✅ Audit bundle generated');
    console.log(`  tenant: ${tenantId}`);
    console.log(`  window: ${startTime.toISOString()} - ${endTime.toISOString()}`);
    console.log(`  bundle: ${bundle.bundlePath}`);
    console.log(`  sha256: ${bundle.sha256}`);
    console.log(`  checksums: ${checksumPath}`);
}
main().catch((err) => {
    console.error('Failed to build audit bundle:', err?.message || err);
    process.exitCode = 1;
});
