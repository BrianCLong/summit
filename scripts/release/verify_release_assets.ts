#!/usr/bin/env npx tsx
/**
 * verify_release_assets.ts - Local release asset verification
 *
 * Verifies GA release assets for integrity and compliance:
 * - Downloads release assets from GitHub
 * - Verifies evidence bundle manifest
 * - Validates trust snapshot schema
 * - Checks promotion digests
 * - Outputs verification report
 *
 * Usage:
 *   npx tsx scripts/release/verify_release_assets.ts --tag v4.1.2
 *   npx tsx scripts/release/verify_release_assets.ts --tag v4.1.2 --json
 *   npx tsx scripts/release/verify_release_assets.ts --local ./release-assets
 *
 * @version 1.0.0
 */

import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

interface VerificationResult {
  check: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  message: string;
  details?: Record<string, unknown>;
}

interface VerificationReport {
  version: string;
  tag: string;
  timestamp: string;
  overall_status: 'pass' | 'fail';
  results: VerificationResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    skipped: number;
  };
}

function parseArgs(): { tag?: string; local?: string; json: boolean; help: boolean } {
  const args = process.argv.slice(2);
  const result: { tag?: string; local?: string; json: boolean; help: boolean } = {
    json: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--tag':
        result.tag = args[++i];
        break;
      case '--local':
        result.local = args[++i];
        break;
      case '--json':
        result.json = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
    }
  }

  return result;
}

function showHelp(): void {
  console.log(`
verify_release_assets.ts - Verify GA release assets

Usage:
  npx tsx scripts/release/verify_release_assets.ts --tag <tag>
  npx tsx scripts/release/verify_release_assets.ts --local <dir>

Options:
  --tag <tag>     GitHub release tag to verify (e.g., v4.1.2)
  --local <dir>   Local directory containing release assets
  --json          Output results as JSON
  --help, -h      Show this help message

Examples:
  # Verify a GitHub release
  npx tsx scripts/release/verify_release_assets.ts --tag v4.1.2

  # Verify local assets
  npx tsx scripts/release/verify_release_assets.ts --local ./release-assets

  # JSON output for CI integration
  npx tsx scripts/release/verify_release_assets.ts --tag v4.1.2 --json
`);
}

function sha256(filePath: string): string {
  const content = readFileSync(filePath);
  return createHash('sha256').update(content).digest('hex');
}

function downloadRelease(tag: string, destDir: string): boolean {
  try {
    mkdirSync(destDir, { recursive: true });
    console.log(`Downloading assets for ${tag}...`);
    execSync(`gh release download "${tag}" --dir "${destDir}" --pattern "*"`, {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return true;
  } catch (error) {
    console.error(`Failed to download release: ${error}`);
    return false;
  }
}

function verifyEvidenceBundle(assetsDir: string): VerificationResult {
  const evidenceFiles = readdirSync(assetsDir).filter((f) => f.match(/evidence.*\.tar\.gz/));

  if (evidenceFiles.length === 0) {
    return {
      check: 'evidence_bundle',
      status: 'warn',
      message: 'No evidence bundle found',
    };
  }

  const evidenceFile = join(assetsDir, evidenceFiles[0]);
  const digest = sha256(evidenceFile);

  // Extract and verify manifest
  const extractDir = join(assetsDir, '_evidence_extracted');
  mkdirSync(extractDir, { recursive: true });

  try {
    execSync(`tar -xzf "${evidenceFile}" -C "${extractDir}"`, { stdio: 'pipe' });

    const manifestPath = join(extractDir, 'SHA256SUMS');
    if (!existsSync(manifestPath)) {
      return {
        check: 'evidence_bundle',
        status: 'warn',
        message: 'Evidence bundle has no SHA256SUMS manifest',
        details: { file: evidenceFiles[0], digest: `sha256:${digest}` },
      };
    }

    // Verify each file in manifest
    const manifest = readFileSync(manifestPath, 'utf-8');
    const lines = manifest.trim().split('\n');
    let verified = 0;
    let failed = 0;

    for (const line of lines) {
      const [expectedHash, filename] = line.split(/\s+/);
      const filePath = join(extractDir, filename);

      if (existsSync(filePath) && statSync(filePath).isFile()) {
        const actualHash = sha256(filePath);
        if (actualHash === expectedHash) {
          verified++;
        } else {
          failed++;
        }
      }
    }

    if (failed > 0) {
      return {
        check: 'evidence_bundle',
        status: 'fail',
        message: `Evidence manifest verification failed: ${failed} file(s) mismatched`,
        details: { file: evidenceFiles[0], verified, failed },
      };
    }

    return {
      check: 'evidence_bundle',
      status: 'pass',
      message: `Evidence bundle verified: ${verified} files`,
      details: { file: evidenceFiles[0], digest: `sha256:${digest}`, verified },
    };
  } catch (error) {
    return {
      check: 'evidence_bundle',
      status: 'fail',
      message: `Failed to extract evidence bundle: ${error}`,
    };
  }
}

function verifyTrustSnapshot(assetsDir: string): VerificationResult {
  const trustFiles = readdirSync(assetsDir).filter((f) => f.match(/trust-snapshot.*\.json/));

  if (trustFiles.length === 0) {
    return {
      check: 'trust_snapshot',
      status: 'warn',
      message: 'No trust snapshot found',
    };
  }

  const trustFile = join(assetsDir, trustFiles[0]);
  const digest = sha256(trustFile);

  try {
    const content = readFileSync(trustFile, 'utf-8');
    const parsed = JSON.parse(content);

    // Basic schema validation
    const requiredFields = ['version', 'generated_at'];
    const missingFields = requiredFields.filter((f) => !(f in parsed));

    if (missingFields.length > 0) {
      return {
        check: 'trust_snapshot',
        status: 'warn',
        message: `Trust snapshot missing fields: ${missingFields.join(', ')}`,
        details: { file: trustFiles[0], digest: `sha256:${digest}` },
      };
    }

    return {
      check: 'trust_snapshot',
      status: 'pass',
      message: 'Trust snapshot validated',
      details: { file: trustFiles[0], digest: `sha256:${digest}`, version: parsed.version },
    };
  } catch (error) {
    return {
      check: 'trust_snapshot',
      status: 'fail',
      message: `Trust snapshot validation failed: ${error}`,
    };
  }
}

function verifyPromotionDigests(assetsDir: string): VerificationResult {
  const digestsFile = join(assetsDir, 'digests.json');

  if (!existsSync(digestsFile)) {
    return {
      check: 'promotion_digests',
      status: 'skip',
      message: 'No promotion digests file (may not be a promoted release)',
    };
  }

  try {
    const content = readFileSync(digestsFile, 'utf-8');
    const digests = JSON.parse(content);

    if (!digests.digests) {
      return {
        check: 'promotion_digests',
        status: 'warn',
        message: 'Promotion digests file has unexpected format',
      };
    }

    let matched = 0;
    let mismatched = 0;
    const mismatches: string[] = [];

    for (const [filename, expectedHash] of Object.entries(digests.digests)) {
      const filePath = join(assetsDir, filename);
      if (!existsSync(filePath)) continue;

      const actualHash = `sha256:${sha256(filePath)}`;
      if (actualHash === expectedHash) {
        matched++;
      } else {
        mismatched++;
        mismatches.push(filename);
      }
    }

    if (mismatched > 0) {
      return {
        check: 'promotion_digests',
        status: 'fail',
        message: `Digest mismatch: ${mismatched} file(s)`,
        details: { matched, mismatched, files: mismatches },
      };
    }

    return {
      check: 'promotion_digests',
      status: 'pass',
      message: `All promotion digests match: ${matched} files`,
      details: {
        matched,
        rc_tag: digests.promotion?.rc_tag,
        ga_tag: digests.promotion?.ga_tag,
      },
    };
  } catch (error) {
    return {
      check: 'promotion_digests',
      status: 'fail',
      message: `Failed to verify promotion digests: ${error}`,
    };
  }
}

function verifySignatures(assetsDir: string): VerificationResult {
  const sigFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.sig'));

  if (sigFiles.length === 0) {
    return {
      check: 'signatures',
      status: 'skip',
      message: 'No signature files found',
    };
  }

  // Check if cosign is available
  try {
    execSync('which cosign', { stdio: 'pipe' });
  } catch {
    return {
      check: 'signatures',
      status: 'warn',
      message: `Found ${sigFiles.length} signatures but cosign not installed`,
      details: { files: sigFiles },
    };
  }

  let verified = 0;
  let failed = 0;

  for (const sigFile of sigFiles) {
    const artifactFile = sigFile.replace('.sig', '');
    const certFile = sigFile.replace('.sig', '.cert');

    const artifactPath = join(assetsDir, artifactFile);
    const sigPath = join(assetsDir, sigFile);
    const certPath = join(assetsDir, certFile);

    if (existsSync(artifactPath) && existsSync(certPath)) {
      try {
        execSync(
          `cosign verify-blob --certificate "${certPath}" --signature "${sigPath}" "${artifactPath}"`,
          { stdio: 'pipe' }
        );
        verified++;
      } catch {
        failed++;
      }
    }
  }

  if (failed > 0) {
    return {
      check: 'signatures',
      status: 'fail',
      message: `Signature verification failed: ${failed} of ${sigFiles.length}`,
      details: { verified, failed },
    };
  }

  return {
    check: 'signatures',
    status: 'pass',
    message: `All signatures verified: ${verified}`,
    details: { verified },
  };
}

function verifyProvenance(assetsDir: string): VerificationResult {
  const provenanceFiles = readdirSync(assetsDir).filter((f) => f.endsWith('.intoto.jsonl'));

  if (provenanceFiles.length === 0) {
    return {
      check: 'provenance',
      status: 'skip',
      message: 'No SLSA provenance files found',
    };
  }

  const provenanceFile = join(assetsDir, provenanceFiles[0]);

  try {
    const content = readFileSync(provenanceFile, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);

    for (const line of lines) {
      JSON.parse(line); // Validate each line is valid JSON
    }

    return {
      check: 'provenance',
      status: 'pass',
      message: 'SLSA provenance validated',
      details: { file: provenanceFiles[0], entries: lines.length },
    };
  } catch (error) {
    return {
      check: 'provenance',
      status: 'fail',
      message: `Provenance validation failed: ${error}`,
    };
  }
}

async function main(): Promise<void> {
  const args = parseArgs();

  if (args.help) {
    showHelp();
    process.exit(0);
  }

  if (!args.tag && !args.local) {
    console.error('Error: Must specify either --tag or --local');
    showHelp();
    process.exit(1);
  }

  let assetsDir: string;
  const tag = args.tag || 'local';

  if (args.tag) {
    assetsDir = `/tmp/verify-release-${args.tag}`;
    if (!downloadRelease(args.tag, assetsDir)) {
      process.exit(1);
    }
  } else {
    assetsDir = args.local!;
    if (!existsSync(assetsDir)) {
      console.error(`Error: Directory not found: ${assetsDir}`);
      process.exit(1);
    }
  }

  console.log(`\nVerifying release assets in: ${assetsDir}\n`);
  console.log('Files found:');
  for (const file of readdirSync(assetsDir)) {
    const stat = statSync(join(assetsDir, file));
    if (stat.isFile()) {
      console.log(`  ${file} (${stat.size} bytes)`);
    }
  }
  console.log('');

  // Run verifications
  const results: VerificationResult[] = [
    verifyEvidenceBundle(assetsDir),
    verifyTrustSnapshot(assetsDir),
    verifyPromotionDigests(assetsDir),
    verifySignatures(assetsDir),
    verifyProvenance(assetsDir),
  ];

  // Calculate summary
  const summary = {
    passed: results.filter((r) => r.status === 'pass').length,
    failed: results.filter((r) => r.status === 'fail').length,
    warnings: results.filter((r) => r.status === 'warn').length,
    skipped: results.filter((r) => r.status === 'skip').length,
  };

  const overallStatus = summary.failed > 0 ? 'fail' : 'pass';

  const report: VerificationReport = {
    version: '1.0.0',
    tag,
    timestamp: new Date().toISOString(),
    overall_status: overallStatus,
    results,
    summary,
  };

  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    // Print human-readable output
    console.log('Verification Results:');
    console.log('─'.repeat(60));

    for (const result of results) {
      const icon =
        result.status === 'pass'
          ? '✅'
          : result.status === 'fail'
            ? '❌'
            : result.status === 'warn'
              ? '⚠️'
              : '⏭️';

      console.log(`${icon} ${result.check}: ${result.message}`);
      if (result.details && Object.keys(result.details).length > 0) {
        for (const [key, value] of Object.entries(result.details)) {
          console.log(`   ${key}: ${JSON.stringify(value)}`);
        }
      }
    }

    console.log('');
    console.log('Summary:');
    console.log(`  Passed:   ${summary.passed}`);
    console.log(`  Failed:   ${summary.failed}`);
    console.log(`  Warnings: ${summary.warnings}`);
    console.log(`  Skipped:  ${summary.skipped}`);
    console.log('');
    console.log(`Overall: ${overallStatus.toUpperCase()}`);
  }

  process.exit(overallStatus === 'pass' ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
