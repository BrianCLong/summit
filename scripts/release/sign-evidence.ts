#!/usr/bin/env npx tsx
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

import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

interface SignatureResult {
  file: string;
  method: 'cosign' | 'gpg' | 'none';
  signaturePath?: string;
  success: boolean;
  error?: string;
}

function hasTool(name: string): boolean {
  try {
    const result = spawnSync('which', [name], { encoding: 'utf8', stdio: 'pipe' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function detectSigningMethod(): 'cosign' | 'gpg' | 'none' {
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
      const result = spawnSync('gpg', ['--list-secret-keys'], { encoding: 'utf8', stdio: 'pipe' });
      if (result.status === 0 && result.stdout?.includes('sec')) {
        return 'gpg';
      }
    } catch {
      // Ignore
    }
  }

  // Check for cosign with local key
  if (hasTool('cosign') && fs.existsSync('cosign.key')) {
    return 'cosign';
  }

  return 'none';
}

function signWithCosign(filePath: string, keyless: boolean): SignatureResult {
  const signaturePath = `${filePath}.sig`;
  const bundlePath = `${filePath}.bundle`;

  const args = ['sign-blob'];

  if (keyless) {
    // Keyless signing via OIDC (requires COSIGN_EXPERIMENTAL=1 in older versions)
    args.push('--yes');
  } else if (fs.existsSync('cosign.key')) {
    args.push('--key', 'cosign.key');
  } else {
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

  const result = spawnSync('cosign', args, {
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

function signWithGPG(filePath: string): SignatureResult {
  const signaturePath = `${filePath}.sig`;
  const keyId = process.env.GPG_KEY_ID;

  const args = ['--detach-sign', '--armor', '--output', signaturePath];
  if (keyId) {
    args.push('--local-user', keyId);
  }
  args.push(filePath);

  const result = spawnSync('gpg', args, {
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

function verifyWithCosign(filePath: string): boolean {
  const signaturePath = `${filePath}.sig`;
  const bundlePath = `${filePath}.bundle`;

  if (!fs.existsSync(signaturePath)) {
    console.log(`  No cosign signature found: ${signaturePath}`);
    return false;
  }

  const args = ['verify-blob'];

  if (fs.existsSync(bundlePath)) {
    args.push('--bundle', bundlePath);
  } else {
    args.push('--signature', signaturePath);
  }

  // For keyless verification, we need the certificate identity
  if (process.env.COSIGN_CERTIFICATE_IDENTITY) {
    args.push('--certificate-identity', process.env.COSIGN_CERTIFICATE_IDENTITY);
    args.push('--certificate-oidc-issuer', process.env.COSIGN_CERTIFICATE_OIDC_ISSUER || 'https://token.actions.githubusercontent.com');
  } else if (fs.existsSync('cosign.pub')) {
    args.push('--key', 'cosign.pub');
  } else {
    console.log('  No cosign.pub or certificate identity configured for verification');
    return false;
  }

  args.push(filePath);

  const result = spawnSync('cosign', args, {
    encoding: 'utf8',
    stdio: 'pipe',
    env: { ...process.env, COSIGN_EXPERIMENTAL: '1' },
  });

  return result.status === 0;
}

function verifyWithGPG(filePath: string): boolean {
  const signaturePath = `${filePath}.sig`;

  if (!fs.existsSync(signaturePath)) {
    console.log(`  No GPG signature found: ${signaturePath}`);
    return false;
  }

  const result = spawnSync('gpg', ['--verify', signaturePath, filePath], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  return result.status === 0;
}

function createManifest(evidenceDir: string): string {
  const manifestPath = path.join(evidenceDir, 'MANIFEST.txt');
  const files = ['evidence.json', 'evidence.md', 'checksums.txt', 'sbom.cdx.json', 'provenance.json'];
  const lines: string[] = ['# Evidence Bundle Manifest', `# Generated: ${new Date().toISOString()}`, ''];

  for (const file of files) {
    const filePath = path.join(evidenceDir, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const stat = fs.statSync(filePath);
      lines.push(`${hash}  ${file}  ${stat.size} bytes`);
    }
  }

  const manifest = lines.join('\n') + '\n';
  fs.writeFileSync(manifestPath, manifest);
  return manifestPath;
}

async function main(): Promise<void> {
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
    const baseDir = path.join(process.cwd(), 'artifacts', 'evidence', 'go-live');
    if (fs.existsSync(baseDir)) {
      const dirs = fs.readdirSync(baseDir)
        .filter((d) => fs.statSync(path.join(baseDir, d)).isDirectory())
        .sort((a, b) => {
          const statA = fs.statSync(path.join(baseDir, a));
          const statB = fs.statSync(path.join(baseDir, b));
          return statB.mtimeMs - statA.mtimeMs;
        });

      if (dirs.length > 0) {
        targetDir = path.join(baseDir, dirs[0]);
      }
    }
  }

  if (!targetDir || !fs.existsSync(targetDir)) {
    console.error('❌ Evidence directory not found');
    console.error('   Usage: npx tsx scripts/release/sign-evidence.ts <evidence-dir>');
    process.exit(1);
  }

  console.log(`[sign] Evidence directory: ${targetDir}`);

  // Detect signing method
  const method = (methodArg as 'cosign' | 'gpg') || detectSigningMethod();
  console.log(`[sign] Signing method: ${method}`);

  if (method === 'none' && !verifyMode) {
    console.log('\n⚠️  No signing method available');
    console.log('   Install cosign or configure GPG to enable signing');
    console.log('   CI environments with OIDC can use keyless cosign signing');
    process.exit(0);
  }

  // Files to sign
  const filesToSign = ['evidence.json', 'sbom.cdx.json', 'provenance.json'];
  const results: SignatureResult[] = [];

  if (verifyMode) {
    // Verification mode
    console.log('\n[sign] Verifying signatures...\n');

    let allValid = true;
    for (const file of filesToSign) {
      const filePath = path.join(targetDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`⏭️  ${file}: Not found`);
        continue;
      }

      let valid = false;
      if (method === 'cosign' || fs.existsSync(`${filePath}.bundle`)) {
        valid = verifyWithCosign(filePath);
      } else if (method === 'gpg' || fs.existsSync(`${filePath}.sig`)) {
        valid = verifyWithGPG(filePath);
      }

      if (valid) {
        console.log(`✅ ${file}: Valid signature`);
      } else {
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
      const filePath = path.join(targetDir, file);
      if (fs.existsSync(filePath)) {
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
    const filePath = path.join(targetDir, file);
    if (!fs.existsSync(filePath)) {
      console.log(`⏭️  ${file}: Not found, skipping`);
      continue;
    }

    let result: SignatureResult;
    if (method === 'cosign') {
      result = signWithCosign(filePath, !!isKeyless);
    } else if (method === 'gpg') {
      result = signWithGPG(filePath);
    } else {
      result = { file: filePath, method: 'none', success: false, error: 'No signing method' };
    }

    results.push(result);

    if (result.success) {
      console.log(`✅ ${file}: Signed (${result.signaturePath})`);
    } else {
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
  const sigFiles = fs.readdirSync(targetDir).filter((f) => f.endsWith('.sig') || f.endsWith('.bundle'));
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
