#!/usr/bin/env ts-node
"use strict";
/**
 * Governance bundle CLI
 *
 * Generates a tarball containing:
 * - Audit events slice
 * - Policy decision logs
 * - SBOM references
 * - Provenance references
 *
 * Example:
 *   pnpm ts-node tools/generate-governance-bundle.ts \\
 *     --tenant t0 \\
 *     --start 2025-08-01T00:00:00Z \\
 *     --end 2025-08-02T00:00:00Z
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_path_1 = __importDefault(require("node:path"));
const node_process_1 = __importDefault(require("node:process"));
const governance_bundle_js_1 = require("../server/src/governance/governance-bundle.js");
function parseList(flag) {
    const value = readFlag(flag);
    if (!value)
        return undefined;
    return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => node_path_1.default.resolve(item));
}
function readFlag(flag) {
    const index = node_process_1.default.argv.indexOf(flag);
    if (index === -1)
        return undefined;
    return node_process_1.default.argv[index + 1];
}
function parseArgs() {
    const tenant = readFlag('--tenant');
    const start = readFlag('--start') ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const end = readFlag('--end') ?? new Date().toISOString();
    if (!tenant) {
        throw new Error('Missing required flag --tenant');
    }
    return {
        tenant,
        start,
        end,
        output: readFlag('--output'),
        auditPaths: parseList('--audit-paths'),
        policyPaths: parseList('--policy-paths'),
        sbomPaths: parseList('--sbom-paths'),
        provenancePaths: parseList('--provenance-paths'),
    };
}
async function main() {
    try {
        const args = parseArgs();
        const result = await (0, governance_bundle_js_1.generateGovernanceBundle)({
            tenantId: args.tenant,
            startTime: args.start,
            endTime: args.end,
            outputRoot: args.output,
            auditLogPaths: args.auditPaths,
            policyLogPaths: args.policyPaths,
            sbomPaths: args.sbomPaths,
            provenancePaths: args.provenancePaths,
        });
        console.log('✅ Governance bundle created');
        console.log(`   ID:        ${result.id}`);
        console.log(`   Tenant:    ${args.tenant}`);
        console.log(`   Window:    ${args.start} -> ${args.end}`);
        console.log(`   Tarball:   ${result.tarPath}`);
        console.log(`   SHA256:    ${result.sha256}`);
        console.log(`   Checksums: ${result.checksumsPath}`);
        console.log(`   Manifest:  ${result.manifestPath}`);
        console.log(`   Counts:    audit=${result.counts.auditEvents}, policy=${result.counts.policyDecisions}, sbom=${result.counts.sbomRefs}, provenance=${result.counts.provenanceRefs}`);
        if (result.warnings.length) {
            console.log(`   Warnings:  ${result.warnings.join(', ')}`);
        }
    }
    catch (error) {
        console.error('❌ Failed to generate governance bundle:', error?.message || error);
        node_process_1.default.exitCode = 1;
    }
}
main();
