#!/usr/bin/env npx tsx
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

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';

interface PackageInfo {
  name: string;
  version: string;
  license?: string;
  integrity?: string;
}

interface SBOMComponent {
  type: string;
  name: string;
  version: string;
  purl?: string;
  licenses?: Array<{ license: { id: string } }>;
  hashes?: Array<{ alg: string; content: string }>;
}

interface CycloneDXSBOM {
  bomFormat: string;
  specVersion: string;
  serialNumber: string;
  version: number;
  metadata: {
    timestamp: string;
    tools: Array<{ vendor: string; name: string; version: string }>;
    component: {
      type: string;
      name: string;
      version: string;
    };
  };
  components: SBOMComponent[];
}

function getDefaultEvidenceDir(): string {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  const sha = result.stdout?.trim() || 'unknown';
  return path.join('artifacts', 'evidence', 'go-live', sha);
}

function commandExists(cmd: string): boolean {
  const result = spawnSync('which', [cmd], { encoding: 'utf8', stdio: 'pipe' });
  return result.status === 0;
}

function generateWithSyft(outputPath: string): boolean {
  if (!commandExists('syft')) {
    console.log('[sbom] syft not found, falling back to npm-based generation');
    return false;
  }

  console.log('[sbom] Generating SBOM with syft...');
  const result = spawnSync('syft', ['.', '-o', `cyclonedx-json=${outputPath}`], {
    encoding: 'utf8',
    stdio: 'inherit',
  });

  return result.status === 0;
}

function parseLockfile(): PackageInfo[] {
  const packages: PackageInfo[] = [];

  // Try pnpm-lock.yaml first
  const pnpmLockPath = 'pnpm-lock.yaml';
  if (fs.existsSync(pnpmLockPath)) {
    console.log('[sbom] Parsing pnpm-lock.yaml...');
    const content = fs.readFileSync(pnpmLockPath, 'utf8');

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
  if (fs.existsSync('package.json')) {
    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
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

function generateNpmSBOM(outputPath: string): boolean {
  console.log('[sbom] Generating SBOM from lockfile...');

  const packages = parseLockfile();
  const pkg = fs.existsSync('package.json')
    ? JSON.parse(fs.readFileSync('package.json', 'utf8'))
    : { name: 'unknown', version: '0.0.0' };

  const components: SBOMComponent[] = packages.map((p) => ({
    type: 'library',
    name: p.name,
    version: p.version,
    purl: `pkg:npm/${p.name.replace('@', '%40')}@${p.version}`,
  }));

  const sbom: CycloneDXSBOM = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${crypto.randomUUID()}`,
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

  fs.writeFileSync(outputPath, JSON.stringify(sbom, null, 2));
  return true;
}

function main(): void {
  console.log('========================================');
  console.log('  Go-Live SBOM Generator');
  console.log('========================================\n');

  // Get evidence directory
  const evidenceDir = process.argv[2] || process.env.EVIDENCE_DIR || getDefaultEvidenceDir();
  console.log(`[sbom] Evidence directory: ${evidenceDir}`);

  // Ensure directory exists
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const outputPath = path.join(evidenceDir, 'sbom.cdx.json');

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
  if (!fs.existsSync(outputPath)) {
    console.error(`\n❌ SBOM file not created: ${outputPath}`);
    process.exit(1);
  }

  const sbom = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  const componentCount = sbom.components?.length ?? 0;

  console.log(`\n[sbom] ✅ Generated SBOM with ${componentCount} components`);
  console.log(`[sbom] Output: ${outputPath}`);

  // Update checksums
  const checksumPath = path.join(evidenceDir, 'checksums.txt');
  const sbomContent = fs.readFileSync(outputPath);
  const sbomHash = crypto.createHash('sha256').update(sbomContent).digest('hex');

  let checksums = '';
  if (fs.existsSync(checksumPath)) {
    checksums = fs.readFileSync(checksumPath, 'utf8');
    // Remove existing sbom entry if present
    checksums = checksums
      .split('\n')
      .filter((line) => !line.includes('sbom.cdx.json'))
      .join('\n');
  }
  checksums = checksums.trim() + `\n${sbomHash}  sbom.cdx.json\n`;
  fs.writeFileSync(checksumPath, checksums);

  console.log('[sbom] Updated checksums.txt');

  console.log('\n========================================');
  console.log('  ✅ SBOM Generation Complete');
  console.log('========================================\n');
}

main();
