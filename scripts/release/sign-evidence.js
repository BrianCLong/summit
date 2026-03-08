#!/usr/bin/env npx tsx
"use strict";
/**
 * Evidence Bundle Signer
 *
 * Signs the evidence bundle to provide cryptographic proof of integrity.
 * Supports both keyless signing (cosign via OIDC in CI) and GPG signing locally.
 *
 * Usage:
 *   npx tsx scripts/release/sign-evidence.ts <evidence-dir>
 *   pnpm release:go-live:sign
 *
 * Options:
 *   --method <cosign|gpg>  Signing method (default: auto-detect)
 *   --verify               Verify existing signatures
 *   --dry-run              Show what would be signed without signing
 *
 * Environment:
 *   COSIGN_EXPERIMENTAL=1  Enable keyless signing (CI)
 *   GPG_KEY_ID=<id>        GPG key ID for local signing
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_child_process_1 = require("node:child_process");
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
function hasTool(name) {
    try {
        const result = (0, node_child_process_1.spawnSync)('which', [name], { encoding: 'utf8', stdio: 'pipe' });
        return result.status === 0;
    }
    catch {
        return false;
    }
}
function detectSigningMethod() {
    // In CI with OIDC, prefer cosign keyless signing
    if (process.env.CI && process.env.ACTIONS_ID_TOKEN_REQUEST_URL && hasTool('cosign')) {
        return 'cosign';
    }
    // Local with GPG key configured
    if (process.env.GPG_KEY_ID && hasTool('gpg')) {
        return 'gpg';
    }
    // Fallback: check if GPG has a default key
    if (hasTool('gpg')) {
        try {
            const result = (0, node_child_process_1.spawnSync)('gpg', ['--list-secret-keys'], { encoding: 'utf8', stdio: 'pipe' });
            if (result.status === 0 && result.stdout?.includes('sec')) {
                return 'gpg';
            }
        }
        catch {
            // Ignore
        }
    }
    // Check for cosign with local key
    if (hasTool('cosign') && node_fs_1.default.existsSync('cosign.key')) {
        return 'cosign';
    }
    return 'none';
}
function signWithCosign(filePath, keyless) {
    const signaturePath = `${filePath}.sig`;
    const bundlePath = `${filePath}.bundle`;
    const args = ['sign-blob'];
    if (keyless) {
        // Keyless signing via OIDC (requires COSIGN_EXPERIMENTAL=1 in older versions)
        args.push('--yes');
    }
    else if (node_fs_1.default.existsSync('cosign.key')) {
        args.push('--key', 'cosign.key');
    }
    else {
        return {
            file: filePath,
            method: 'cosign',
            success: false,
            error: 'No cosign key found and not in OIDC-enabled CI',
        };
    }
    args.push('--output-signature', signaturePath);
    args.push('--bundle', bundlePath);
    args.push(filePath);
    const result = (0, node_child_process_1.spawnSync)('cosign', args, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: {
            ...process.env,
            COSIGN_EXPERIMENTAL: '1', // Enable keyless for older cosign versions
        },
    });
    if (result.status !== 0) {
        return {
            file: filePath,
            method: 'cosign',
            success: false,
            error: result.stderr || 'cosign signing failed',
        };
    }
    return {
        file: filePath,
        method: 'cosign',
        signaturePath,
        success: true,
    };
}
function signWithGPG(filePath) {
    const signaturePath = `${filePath}.sig`;
    const keyId = process.env.GPG_KEY_ID;
    const args = ['--detach-sign', '--armor', '--output', signaturePath];
    if (keyId) {
        args.push('--local-user', keyId);
    }
    args.push(filePath);
    const result = (0, node_child_process_1.spawnSync)('gpg', args, {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    if (result.status !== 0) {
        return {
            file: filePath,
            method: 'gpg',
            success: false,
            error: result.stderr || 'GPG signing failed',
        };
    }
    return {
        file: filePath,
        method: 'gpg',
        signaturePath,
        success: true,
    };
}
function verifyWithCosign(filePath) {
    const signaturePath = `${filePath}.sig`;
    const bundlePath = `${filePath}.bundle`;
    if (!node_fs_1.default.existsSync(signaturePath)) {
        console.log(`  No cosign signature found: ${signaturePath}`);
        return false;
    }
    const args = ['verify-blob'];
    if (node_fs_1.default.existsSync(bundlePath)) {
        args.push('--bundle', bundlePath);
    }
    else {
        args.push('--signature', signaturePath);
    }
    // For keyless verification, we need the certificate identity
    if (process.env.COSIGN_CERTIFICATE_IDENTITY) {
        args.push('--certificate-identity', process.env.COSIGN_CERTIFICATE_IDENTITY);
        args.push('--certificate-oidc-issuer', process.env.COSIGN_CERTIFICATE_OIDC_ISSUER || 'https://token.actions.githubusercontent.com');
    }
    else if (node_fs_1.default.existsSync('cosign.pub')) {
        args.push('--key', 'cosign.pub');
    }
    else {
        console.log('  No cosign.pub or certificate identity configured for verification');
        return false;
    }
    args.push(filePath);
    const result = (0, node_child_process_1.spawnSync)('cosign', args, {
        encoding: 'utf8',
        stdio: 'pipe',
        env: { ...process.env, COSIGN_EXPERIMENTAL: '1' },
    });
    return result.status === 0;
}
function verifyWithGPG(filePath) {
    const signaturePath = `${filePath}.sig`;
    if (!node_fs_1.default.existsSync(signaturePath)) {
        console.log(`  No GPG signature found: ${signaturePath}`);
        return false;
    }
    const result = (0, node_child_process_1.spawnSync)('gpg', ['--verify', signaturePath, filePath], {
        encoding: 'utf8',
        stdio: 'pipe',
    });
    return result.status === 0;
}
function createManifest(evidenceDir) {
    const manifestPath = node_path_1.default.join(evidenceDir, 'MANIFEST.txt');
    const files = ['evidence.json', 'evidence.md', 'checksums.txt', 'sbom.cdx.json', 'provenance.json'];
    const lines = ['# Evidence Bundle Manifest', `# Generated: ${new Date().toISOString()}`, ''];
    for (const file of files) {
        const filePath = node_path_1.default.join(evidenceDir, file);
        if (node_fs_1.default.existsSync(filePath)) {
            const content = node_fs_1.default.readFileSync(filePath);
            const hash = node_crypto_1.default.createHash('sha256').update(content).digest('hex');
            const stat = node_fs_1.default.statSync(filePath);
            lines.push(`${hash}  ${file}  ${stat.size} bytes`);
        }
    }
    const manifest = lines.join('\n') + '\n';
    node_fs_1.default.writeFileSync(manifestPath, manifest);
    return manifestPath;
}
async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const verifyMode = args.includes('--verify');
    const methodArg = args.find((a) => a.startsWith('--method='))?.split('=')[1];
    const evidenceDir = args.find((a) => !a.startsWith('--')) || '';
    console.log('========================================');
    console.log('  Evidence Bundle Signer');
    console.log('========================================\n');
    // Find evidence directory
    let targetDir = evidenceDir;
    if (!targetDir) {
        // Find latest evidence bundle
        const baseDir = node_path_1.default.join(process.cwd(), 'artifacts', 'evidence', 'go-live');
        if (node_fs_1.default.existsSync(baseDir)) {
            const dirs = node_fs_1.default.readdirSync(baseDir)
                .filter((d) => node_fs_1.default.statSync(node_path_1.default.join(baseDir, d)).isDirectory())
                .sort((a, b) => {
                const statA = node_fs_1.default.statSync(node_path_1.default.join(baseDir, a));
                const statB = node_fs_1.default.statSync(node_path_1.default.join(baseDir, b));
                return statB.mtimeMs - statA.mtimeMs;
            });
            if (dirs.length > 0) {
                targetDir = node_path_1.default.join(baseDir, dirs[0]);
            }
        }
    }
    if (!targetDir || !node_fs_1.default.existsSync(targetDir)) {
        console.error('❌ Evidence directory not found');
        console.error('   Usage: npx tsx scripts/release/sign-evidence.ts <evidence-dir>');
        process.exit(1);
    }
    console.log(`[sign] Evidence directory: ${targetDir}`);
    // Detect signing method
    const method = methodArg || detectSigningMethod();
    console.log(`[sign] Signing method: ${method}`);
    if (method === 'none' && !verifyMode) {
        console.log('\n⚠️  No signing method available');
        console.log('   Install cosign or configure GPG to enable signing');
        console.log('   CI environments with OIDC can use keyless cosign signing');
        process.exit(0);
    }
    // Files to sign
    const filesToSign = ['evidence.json', 'sbom.cdx.json', 'provenance.json'];
    const results = [];
    if (verifyMode) {
        // Verification mode
        console.log('\n[sign] Verifying signatures...\n');
        let allValid = true;
        for (const file of filesToSign) {
            const filePath = node_path_1.default.join(targetDir, file);
            if (!node_fs_1.default.existsSync(filePath)) {
                console.log(`⏭️  ${file}: Not found`);
                continue;
            }
            let valid = false;
            if (method === 'cosign' || node_fs_1.default.existsSync(`${filePath}.bundle`)) {
                valid = verifyWithCosign(filePath);
            }
            else if (method === 'gpg' || node_fs_1.default.existsSync(`${filePath}.sig`)) {
                valid = verifyWithGPG(filePath);
            }
            if (valid) {
                console.log(`✅ ${file}: Valid signature`);
            }
            else {
                console.log(`❌ ${file}: Invalid or missing signature`);
                allValid = false;
            }
        }
        if (!allValid) {
            process.exit(1);
        }
        return;
    }
    if (dryRun) {
        console.log('\n[sign] DRY-RUN: Would sign the following files:\n');
        for (const file of filesToSign) {
            const filePath = node_path_1.default.join(targetDir, file);
            if (node_fs_1.default.existsSync(filePath)) {
                console.log(`  - ${file} (${method})`);
            }
        }
        return;
    }
    // Create manifest first
    console.log('\n[sign] Creating manifest...');
    const manifestPath = createManifest(targetDir);
    console.log(`[sign] Created ${manifestPath}`);
    // Sign files
    console.log('\n[sign] Signing files...\n');
    const isKeyless = process.env.CI && process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
    for (const file of filesToSign) {
        const filePath = node_path_1.default.join(targetDir, file);
        if (!node_fs_1.default.existsSync(filePath)) {
            console.log(`⏭️  ${file}: Not found, skipping`);
            continue;
        }
        let result;
        if (method === 'cosign') {
            result = signWithCosign(filePath, !!isKeyless);
        }
        else if (method === 'gpg') {
            result = signWithGPG(filePath);
        }
        else {
            result = { file: filePath, method: 'none', success: false, error: 'No signing method' };
        }
        results.push(result);
        if (result.success) {
            console.log(`✅ ${file}: Signed (${result.signaturePath})`);
        }
        else {
            console.log(`❌ ${file}: ${result.error}`);
        }
    }
    // Summary
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    console.log('\n========================================');
    console.log('  Signing Summary');
    console.log('========================================');
    console.log(`  ✅ Signed:  ${successful}`);
    console.log(`  ❌ Failed:  ${failed}`);
    console.log(`  📁 Output:  ${targetDir}`);
    // List signature files
    const sigFiles = node_fs_1.default.readdirSync(targetDir).filter((f) => f.endsWith('.sig') || f.endsWith('.bundle'));
    if (sigFiles.length > 0) {
        console.log('\n  Signature files:');
        for (const file of sigFiles) {
            console.log(`    - ${file}`);
        }
    }
    if (failed > 0) {
        process.exit(1);
    }
}
main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
