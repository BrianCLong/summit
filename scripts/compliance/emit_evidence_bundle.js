#!/usr/bin/env node
"use strict";
/**
 * Emit Evidence Bundle
 *
 * Collects release artifacts and structures them into a compliant evidence bundle.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const url_1 = require("url");
const __filename = (0, url_1.fileURLToPath)(import.meta.url);
const __dirname = path_1.default.dirname(__filename);
const ARGS = process.argv.slice(2);
const VERSION = ARGS.find(a => a.startsWith('--version='))?.split('=')[1] || process.env.GITHUB_REF_NAME || 'dev';
const OUTPUT_DIR = ARGS.find(a => a.startsWith('--output='))?.split('=')[1] || 'release-assets';
const ARTIFACTS_DIR = ARGS.find(a => a.startsWith('--artifacts='))?.split('=')[1] || '.';
const BUNDLE_DIR = path_1.default.join(OUTPUT_DIR, `evidence-${VERSION}`);
function main() {
    console.log(`📦 Creating Evidence Bundle for ${VERSION}...`);
    // 1. Prepare Directory
    if (fs_1.default.existsSync(BUNDLE_DIR)) {
        fs_1.default.rmSync(BUNDLE_DIR, { recursive: true, force: true });
    }
    fs_1.default.mkdirSync(BUNDLE_DIR, { recursive: true });
    fs_1.default.mkdirSync(path_1.default.join(BUNDLE_DIR, 'security'));
    fs_1.default.mkdirSync(path_1.default.join(BUNDLE_DIR, 'testing'));
    fs_1.default.mkdirSync(path_1.default.join(BUNDLE_DIR, 'provenance'));
    // 2. Copy Template
    const templatePath = path_1.default.join(process.cwd(), 'evidence/v1/template/README.md');
    if (fs_1.default.existsSync(templatePath)) {
        fs_1.default.copyFileSync(templatePath, path_1.default.join(BUNDLE_DIR, 'README.md'));
    }
    else {
        fs_1.default.writeFileSync(path_1.default.join(BUNDLE_DIR, 'README.md'), '# Evidence Bundle\n\nGenerated automatically.');
    }
    // 3. Collect Artifacts (Handling structured input from release-ga.yml)
    // Security
    const securitySrc = path_1.default.join(ARTIFACTS_DIR, 'security');
    if (fs_1.default.existsSync(securitySrc)) {
        const files = fs_1.default.readdirSync(securitySrc);
        files.forEach(f => {
            fs_1.default.copyFileSync(path_1.default.join(securitySrc, f), path_1.default.join(BUNDLE_DIR, 'security', f));
        });
    }
    else {
        // Fallback for flat structure
        copyIfExists(path_1.default.join(ARTIFACTS_DIR, 'sbom.cdx.json'), path_1.default.join(BUNDLE_DIR, 'security/sbom.cdx.json'));
        copyIfExists(path_1.default.join(ARTIFACTS_DIR, 'vuln-report.json'), path_1.default.join(BUNDLE_DIR, 'security/vuln-report.json'));
    }
    // Testing
    const testingSrc = path_1.default.join(ARTIFACTS_DIR, 'testing');
    if (fs_1.default.existsSync(testingSrc)) {
        const files = fs_1.default.readdirSync(testingSrc);
        files.forEach(f => {
            fs_1.default.copyFileSync(path_1.default.join(testingSrc, f), path_1.default.join(BUNDLE_DIR, 'testing', f));
        });
    }
    else {
        copyIfExists(path_1.default.join(ARTIFACTS_DIR, 'test-results.txt'), path_1.default.join(BUNDLE_DIR, 'testing/test-summary.txt'));
        copyIfExists(path_1.default.join(ARTIFACTS_DIR, 'soc-controls.txt'), path_1.default.join(BUNDLE_DIR, 'testing/soc-controls.txt'));
    }
    // Provenance (if available)
    copyIfExists(path_1.default.join(ARTIFACTS_DIR, 'provenance.json'), path_1.default.join(BUNDLE_DIR, 'provenance/slsa-provenance.json'));
    // 4. Generate Metadata
    const metadata = {
        version: VERSION,
        timestamp: new Date().toISOString(),
        sha: process.env.GITHUB_SHA || 'unknown',
        actor: process.env.GITHUB_ACTOR || 'unknown',
        repo: process.env.GITHUB_REPOSITORY || 'unknown'
    };
    fs_1.default.writeFileSync(path_1.default.join(BUNDLE_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));
    // 5. Create Archive
    const archiveName = path_1.default.join(OUTPUT_DIR, `evidence-bundle-${VERSION}.tar.gz`);
    try {
        (0, child_process_1.execSync)(`tar -czf "${archiveName}" -C "${OUTPUT_DIR}" "evidence-${VERSION}"`);
        console.log(`✅ Evidence bundle created: ${archiveName}`);
    }
    catch (e) {
        console.error('Failed to create archive:', e);
        process.exit(1);
    }
}
function copyIfExists(src, dest) {
    if (fs_1.default.existsSync(src)) {
        fs_1.default.copyFileSync(src, dest);
        console.log(`  Included: ${path_1.default.basename(src)}`);
    }
    else {
        // console.warn(`  Missing: ${path.basename(src)}`);
    }
}
main();
