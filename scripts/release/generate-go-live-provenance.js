#!/usr/bin/env npx tsx
"use strict";
/**
 * Go-Live Provenance Attestation Generator
 *
 * Generates SLSA-style provenance attestation for go-live releases.
 * Creates an in-toto attestation linking the build to source.
 *
 * Usage:
 *   npx tsx scripts/release/generate-go-live-provenance.ts [evidence-dir]
 *   pnpm release:go-live:provenance
 *
 * Environment variables:
 *   EVIDENCE_DIR     Path to evidence directory
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_child_process_1 = require("node:child_process");
const node_crypto_1 = __importDefault(require("node:crypto"));
function getDefaultEvidenceDir() {
    const result = (0, node_child_process_1.spawnSync)('git', ['rev-parse', 'HEAD'], {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    const sha = result.stdout?.trim() || 'unknown';
    return node_path_1.default.join('artifacts', 'evidence', 'go-live', sha);
}
function getGitRemoteUrl() {
    const result = (0, node_child_process_1.spawnSync)('git', ['remote', 'get-url', 'origin'], {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    return result.stdout?.trim() || 'unknown';
}
function getFileHash(filePath) {
    if (!node_fs_1.default.existsSync(filePath))
        return '';
    const content = node_fs_1.default.readFileSync(filePath);
    return node_crypto_1.default.createHash('sha256').update(content).digest('hex');
}
function main() {
    console.log('========================================');
    console.log('  Go-Live Provenance Generator');
    console.log('========================================\n');
    // Get evidence directory
    const evidenceDir = process.argv[2] || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
    console.log(`[provenance] Evidence directory: ${evidenceDir}`);
    // Load evidence
    const evidencePath = node_path_1.default.join(evidenceDir, 'evidence.json');
    if (!node_fs_1.default.existsSync(evidencePath)) {
        console.error(`\n❌ Evidence not found: ${evidencePath}`);
        console.error('   Run "pnpm evidence:go-live:gen" first.');
        process.exit(1);
    }
    const evidence = JSON.parse(node_fs_1.default.readFileSync(evidencePath, 'utf8'));
    console.log(`[provenance] Loaded evidence for commit ${evidence.git.sha}`);
    // Get repository info
    const repoUrl = getGitRemoteUrl();
    const buildInvocationId = evidence.metadata?.runId || node_crypto_1.default.randomUUID();
    // Collect subjects (files we're attesting to)
    const subjects = [];
    for (const filename of ['evidence.json', 'evidence.md', 'sbom.cdx.json']) {
        const filePath = node_path_1.default.join(evidenceDir, filename);
        if (node_fs_1.default.existsSync(filePath)) {
            subjects.push({
                name: filename,
                digest: { sha256: getFileHash(filePath) },
            });
        }
    }
    // Build SLSA provenance attestation
    const provenance = {
        _type: 'https://in-toto.io/Statement/v0.1',
        subject: subjects,
        predicateType: 'https://slsa.dev/provenance/v0.2',
        predicate: {
            buildType: 'https://summit.io/go-live-evidence/v1',
            builder: {
                id: evidence.metadata?.ci
                    ? `https://github.com/${process.env.GITHUB_REPOSITORY || 'unknown'}/actions`
                    : 'local',
            },
            invocation: {
                configSource: {
                    uri: repoUrl,
                    digest: { sha1: evidence.git.sha },
                    entryPoint: 'scripts/evidence/generate-go-live-evidence.ts',
                },
                parameters: {
                    evidenceSchemaVersion: evidence.version,
                    branch: evidence.git.branch,
                },
                environment: {
                    NODE_VERSION: evidence.toolchain.node,
                    PNPM_VERSION: evidence.toolchain.pnpm,
                    PLATFORM: evidence.toolchain.platform,
                    ARCH: evidence.toolchain.arch,
                },
            },
            buildConfig: {
                steps: [
                    {
                        command: ['pnpm', 'lint'],
                        env: {},
                    },
                    {
                        command: ['pnpm', 'build'],
                        env: {},
                    },
                    {
                        command: ['pnpm', '--filter', 'intelgraph-server', 'test:unit'],
                        env: { GA_VERIFY_MODE: 'true' },
                    },
                    {
                        command: ['scripts/go-live/smoke-prod.sh'],
                        env: {},
                    },
                ],
            },
            metadata: {
                buildInvocationId,
                buildStartedOn: evidence.generatedAt,
                buildFinishedOn: evidence.generatedAt,
                completeness: {
                    parameters: true,
                    environment: true,
                    materials: true,
                },
                reproducible: !evidence.git.dirty,
            },
            materials: [
                {
                    uri: `git+${repoUrl}@refs/heads/${evidence.git.branch}`,
                    digest: { sha1: evidence.git.sha },
                },
                {
                    uri: 'https://registry.npmjs.org',
                    digest: {},
                },
            ],
        },
    };
    // Write provenance
    const outputPath = node_path_1.default.join(evidenceDir, 'provenance.json');
    node_fs_1.default.writeFileSync(outputPath, JSON.stringify(provenance, null, 2));
    console.log(`[provenance] Wrote ${outputPath}`);
    // Update checksums
    const checksumPath = node_path_1.default.join(evidenceDir, 'checksums.txt');
    const provenanceHash = getFileHash(outputPath);
    let checksums = '';
    if (node_fs_1.default.existsSync(checksumPath)) {
        checksums = node_fs_1.default.readFileSync(checksumPath, 'utf8');
        checksums = checksums
            .split('\n')
            .filter((line) => !line.includes('provenance.json'))
            .join('\n');
    }
    checksums = checksums.trim() + `\n${provenanceHash}  provenance.json\n`;
    node_fs_1.default.writeFileSync(checksumPath, checksums);
    console.log('[provenance] Updated checksums.txt');
    // Summary
    console.log('\n========================================');
    console.log('  ✅ Provenance Attestation Generated');
    console.log(`  Subjects: ${subjects.length} files`);
    console.log(`  Builder: ${provenance.predicate.builder.id}`);
    console.log('========================================\n');
}
main();
