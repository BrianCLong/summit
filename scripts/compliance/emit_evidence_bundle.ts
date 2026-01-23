#!/usr/bin/env node

/**
 * Emit Evidence Bundle
 *
 * Collects release artifacts and structures them into a compliant evidence bundle.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARGS = process.argv.slice(2);
const VERSION = ARGS.find(a => a.startsWith('--version='))?.split('=')[1] || process.env.GITHUB_REF_NAME || 'dev';
const OUTPUT_DIR = ARGS.find(a => a.startsWith('--output='))?.split('=')[1] || 'release-assets';
const ARTIFACTS_DIR = ARGS.find(a => a.startsWith('--artifacts='))?.split('=')[1] || '.';

const BUNDLE_DIR = path.join(OUTPUT_DIR, `evidence-${VERSION}`);

function main() {
  console.log(`📦 Creating Evidence Bundle for ${VERSION}...`);

  // 1. Prepare Directory
  if (fs.existsSync(BUNDLE_DIR)) {
    fs.rmSync(BUNDLE_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(BUNDLE_DIR, { recursive: true });
  fs.mkdirSync(path.join(BUNDLE_DIR, 'security'));
  fs.mkdirSync(path.join(BUNDLE_DIR, 'testing'));
  fs.mkdirSync(path.join(BUNDLE_DIR, 'provenance'));

  // 2. Copy Template
  const templatePath = path.join(process.cwd(), 'evidence/v1/template/README.md');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, path.join(BUNDLE_DIR, 'README.md'));
  } else {
    fs.writeFileSync(path.join(BUNDLE_DIR, 'README.md'), '# Evidence Bundle\n\nGenerated automatically.');
  }

  // 3. Collect Artifacts (Handling structured input from release-ga.yml)

  // Security
  const securitySrc = path.join(ARTIFACTS_DIR, 'security');
  if (fs.existsSync(securitySrc)) {
      const files = fs.readdirSync(securitySrc);
      files.forEach(f => {
          fs.copyFileSync(path.join(securitySrc, f), path.join(BUNDLE_DIR, 'security', f));
      });
  } else {
      // Fallback for flat structure
      copyIfExists(path.join(ARTIFACTS_DIR, 'sbom.cdx.json'), path.join(BUNDLE_DIR, 'security/sbom.cdx.json'));
      copyIfExists(path.join(ARTIFACTS_DIR, 'vuln-report.json'), path.join(BUNDLE_DIR, 'security/vuln-report.json'));
  }

  // Testing
  const testingSrc = path.join(ARTIFACTS_DIR, 'testing');
  if (fs.existsSync(testingSrc)) {
      const files = fs.readdirSync(testingSrc);
      files.forEach(f => {
          fs.copyFileSync(path.join(testingSrc, f), path.join(BUNDLE_DIR, 'testing', f));
      });
  } else {
      copyIfExists(path.join(ARTIFACTS_DIR, 'test-results.txt'), path.join(BUNDLE_DIR, 'testing/test-summary.txt'));
      copyIfExists(path.join(ARTIFACTS_DIR, 'soc-controls.txt'), path.join(BUNDLE_DIR, 'testing/soc-controls.txt'));
  }

  // Provenance (if available)
  copyIfExists(path.join(ARTIFACTS_DIR, 'provenance.json'), path.join(BUNDLE_DIR, 'provenance/slsa-provenance.json'));

  // 4. Generate Metadata
  const metadata = {
    version: VERSION,
    timestamp: new Date().toISOString(),
    sha: process.env.GITHUB_SHA || 'unknown',
    actor: process.env.GITHUB_ACTOR || 'unknown',
    repo: process.env.GITHUB_REPOSITORY || 'unknown'
  };
  fs.writeFileSync(path.join(BUNDLE_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // 5. Create Archive
  const archiveName = path.join(OUTPUT_DIR, `evidence-bundle-${VERSION}.tar.gz`);
  try {
    execSync(`tar -czf "${archiveName}" -C "${OUTPUT_DIR}" "evidence-${VERSION}"`);
    console.log(`✅ Evidence bundle created: ${archiveName}`);
  } catch (e) {
    console.error('Failed to create archive:', e);
    process.exit(1);
  }
}

function copyIfExists(src: string, dest: string) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`  Included: ${path.basename(src)}`);
  } else {
    // console.warn(`  Missing: ${path.basename(src)}`);
  }
}

main();
