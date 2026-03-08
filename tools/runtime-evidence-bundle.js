#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const process_1 = __importDefault(require("process"));
const runtime_evidence_js_1 = require("../server/src/disclosure/runtime-evidence.js");
function parseArgs(argv) {
    const options = {
        auditPaths: [],
        policyPaths: [],
        sbomPaths: [],
        provenancePaths: [],
    };
    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        switch (arg) {
            case '--tenant':
            case '-t':
                options.tenantId = argv[i + 1];
                i += 1;
                break;
            case '--start':
                options.startTime = argv[i + 1];
                i += 1;
                break;
            case '--end':
                options.endTime = argv[i + 1];
                i += 1;
                break;
            case '--audit':
                options.auditPaths.push(argv[i + 1]);
                i += 1;
                break;
            case '--policy':
                options.policyPaths.push(argv[i + 1]);
                i += 1;
                break;
            case '--sbom':
                options.sbomPaths.push(argv[i + 1]);
                i += 1;
                break;
            case '--provenance':
                options.provenancePaths.push(argv[i + 1]);
                i += 1;
                break;
            case '--version':
                options.deployedVersion = argv[i + 1];
                i += 1;
                break;
            default:
                // ignore unknown flags to keep CLI lightweight
                break;
        }
    }
    return options;
}
async function main() {
    const options = parseArgs(process_1.default.argv.slice(2));
    if (!options.tenantId) {
        console.error('Usage: runtime-evidence-bundle --tenant <tenant-id> [--start ISO] [--end ISO] [--version <deployed-version>]');
        console.error('Optional: --audit <path> --policy <path> --sbom <path> --provenance <path> (flags can repeat).');
        process_1.default.exit(1);
    }
    const bundle = await runtime_evidence_js_1.runtimeEvidenceService.createBundle({
        tenantId: options.tenantId,
        startTime: options.startTime,
        endTime: options.endTime,
        auditPaths: options.auditPaths.length ? options.auditPaths : undefined,
        policyPaths: options.policyPaths.length ? options.policyPaths : undefined,
        sbomPaths: options.sbomPaths.length ? options.sbomPaths : undefined,
        provenancePaths: options.provenancePaths.length
            ? options.provenancePaths
            : undefined,
        deployedVersion: options.deployedVersion,
    });
    const summary = {
        bundleId: bundle.id,
        tenant: bundle.tenantId,
        bundlePath: bundle.bundlePath,
        sha256: bundle.sha256,
        expiresAt: bundle.expiresAt,
        deployedVersion: bundle.deployedVersion,
        warnings: bundle.warnings,
        counts: bundle.counts,
        checksumsPath: bundle.checksumsPath,
        manifestPath: bundle.manifestPath,
    };
    process_1.default.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}
main().catch((error) => {
    console.error('Failed to generate runtime evidence bundle', error);
    process_1.default.exit(1);
});
