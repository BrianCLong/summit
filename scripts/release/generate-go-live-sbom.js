#!/usr/bin/env npx tsx
"use strict";
/**
 * Go-Live SBOM Generator
 *
 * Generates a Software Bill of Materials (SBOM) for the go-live release.
 * Uses syft if available, falls back to npm-based generation.
 *
 * Usage:
 *   npx tsx scripts/release/generate-go-live-sbom.ts [evidence-dir]
 *   pnpm release:go-live:sbom
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
function commandExists(cmd) {
    const result = (0, node_child_process_1.spawnSync)('which', [cmd], { encoding: 'utf8', stdio: 'pipe' });
    return result.status === 0;
}
function generateWithSyft(outputPath) {
    if (!commandExists('syft')) {
        console.log('[sbom] syft not found, falling back to npm-based generation');
        return false;
    }
    console.log('[sbom] Generating SBOM with syft...');
    const result = (0, node_child_process_1.spawnSync)('syft', ['.', '-o', `cyclonedx-json=${outputPath}`], {
        encoding: 'utf8',
        stdio: 'inherit',
    });
    return result.status === 0;
}
function parseLockfile() {
    const packages = [];
    // Try pnpm-lock.yaml first
    const pnpmLockPath = 'pnpm-lock.yaml';
    if (node_fs_1.default.existsSync(pnpmLockPath)) {
        console.log('[sbom] Parsing pnpm-lock.yaml...');
        const content = node_fs_1.default.readFileSync(pnpmLockPath, 'utf8');
        // Simple regex-based parsing for package names and versions
        const packageRegex = /^\s+'?(@?[\w\/-]+)@([\d.]+)'?:/gm;
        let match;
        while ((match = packageRegex.exec(content)) !== null) {
            packages.push({
                name: match[1],
                version: match[2],
            });
        }
    }
    // Also include direct dependencies from package.json
    if (node_fs_1.default.existsSync('package.json')) {
        const pkg = JSON.parse(node_fs_1.default.readFileSync('package.json', 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const [name, versionSpec] of Object.entries(deps)) {
            const version = String(versionSpec).replace(/^[\^~>=<]/, '').split(' ')[0];
            if (!packages.find((p) => p.name === name)) {
                packages.push({ name, version });
            }
        }
    }
    return packages;
}
function generateNpmSBOM(outputPath) {
    console.log('[sbom] Generating SBOM from lockfile...');
    const packages = parseLockfile();
    const pkg = node_fs_1.default.existsSync('package.json')
        ? JSON.parse(node_fs_1.default.readFileSync('package.json', 'utf8'))
        : { name: 'unknown', version: '0.0.0' };
    const components = packages.map((p) => ({
        type: 'library',
        name: p.name,
        version: p.version,
        purl: `pkg:npm/${p.name.replace('@', '%40')}@${p.version}`,
    }));
    const sbom = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: `urn:uuid:${node_crypto_1.default.randomUUID()}`,
        version: 1,
        metadata: {
            timestamp: new Date().toISOString(),
            tools: [
                {
                    vendor: 'Summit',
                    name: 'generate-go-live-sbom',
                    version: '1.0.0',
                },
            ],
            component: {
                type: 'application',
                name: pkg.name,
                version: pkg.version,
            },
        },
        components,
    };
    node_fs_1.default.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
    return true;
}
function main() {
    console.log('========================================');
    console.log('  Go-Live SBOM Generator');
    console.log('========================================\n');
    // Get evidence directory
    const evidenceDir = process.argv[2] || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
    console.log(`[sbom] Evidence directory: ${evidenceDir}`);
    // Ensure directory exists
    if (!node_fs_1.default.existsSync(evidenceDir)) {
        node_fs_1.default.mkdirSync(evidenceDir, { recursive: true });
    }
    const outputPath = node_path_1.default.join(evidenceDir, 'sbom.cdx.json');
    // Try syft first, fall back to npm-based
    let success = generateWithSyft(outputPath);
    if (!success) {
        success = generateNpmSBOM(outputPath);
    }
    if (!success) {
        console.error('\n❌ Failed to generate SBOM');
        process.exit(1);
    }
    // Verify output
    if (!node_fs_1.default.existsSync(outputPath)) {
        console.error(`\n❌ SBOM file not created: ${outputPath}`);
        process.exit(1);
    }
    const sbom = JSON.parse(node_fs_1.default.readFileSync(outputPath, 'utf8'));
    const componentCount = sbom.components?.length ?? 0;
    console.log(`\n[sbom] ✅ Generated SBOM with ${componentCount} components`);
    console.log(`[sbom] Output: ${outputPath}`);
    // Update checksums
    const checksumPath = node_path_1.default.join(evidenceDir, 'checksums.txt');
    const sbomContent = node_fs_1.default.readFileSync(outputPath);
    const sbomHash = node_crypto_1.default.createHash('sha256').update(sbomContent).digest('hex');
    let checksums = '';
    if (node_fs_1.default.existsSync(checksumPath)) {
        checksums = node_fs_1.default.readFileSync(checksumPath, 'utf8');
        // Remove existing sbom entry if present
        checksums = checksums
            .split('\n')
            .filter((line) => !line.includes('sbom.cdx.json'))
            .join('\n');
    }
    checksums = checksums.trim() + `\n${sbomHash}  sbom.cdx.json\n`;
    node_fs_1.default.writeFileSync(checksumPath, checksums);
    console.log('[sbom] Updated checksums.txt');
    console.log('\n========================================');
    console.log('  ✅ SBOM Generation Complete');
    console.log('========================================\n');
}
main();
