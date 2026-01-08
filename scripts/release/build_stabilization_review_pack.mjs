#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync, readFileSync, rmSync } from 'fs';
import { join, dirname } from 'path';
import AdmZip from 'adm-zip';
import { createHash } from 'crypto';

/**
 * @param {string} name
 * @param {boolean} required
 * @returns {string | undefined}
 */
function getArg(name, required = true) {
  const aname = `--${name}=`;
  const arg = process.argv.find(a => a.startsWith(aname));
  if (!arg && required) {
    console.error(`Missing required argument: --${name}`);
    process.exit(1);
  }
  return arg ? arg.substring(aname.length) : undefined;
}

/**
 * @param {string} dir
 * @returns {string[]}
 */
function getAllFiles(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = entries.map(entry => {
    const res = join(dir, entry.name);
    return entry.isDirectory() ? getAllFiles(res) : res;
  });
  return Array.prototype.concat(...files);
}

function main() {
  const date = getArg('date') ?? new Date().toISOString().split('T')[0];
  const sha = getArg('sha') ?? execSync('git rev-parse HEAD').toString().trim();
  const out = getArg('out');

  console.log('--- Stabilization Review Pack Generation ---');
  console.log(`Date: ${date}`);
  console.log(`SHA: ${sha}`);
  console.log(`Output: ${out}`);
  console.log('-------------------------------------------');

  const stagingDir = `stabilization-review-pack-staging`;
  const packDir = join(stagingDir, `stabilization-review-pack/${date}/${sha}`);

  // Create the directory structure
  const subDirs = ['dashboard', 'scorecard', 'escalation', 'changes', 'validation', 'evidence'];
  for (const subDir of subDirs) {
    mkdirSync(join(packDir, subDir), { recursive: true });
  }

  // Create placeholder files
  writeFileSync(join(packDir, 'README.md'), '# Stabilization Review Pack\n\nThis is a placeholder README.');
  writeFileSync(join(packDir, 'dashboard', 'STABILIZATION_DASHBOARD.md'), '# Stabilization Dashboard\n\nPlaceholder dashboard content.');
  writeFileSync(join(packDir, 'scorecard', `SCORECARD_${date}.md`), `# Scorecard ${date}\n\nPlaceholder scorecard content.`);
  writeFileSync(join(packDir, 'escalation', 'escalation.md'), '# Escalation Report\n\nPlaceholder escalation report content.');
  writeFileSync(join(packDir, 'changes', 'diff.md'), '# Change Diff\n\nPlaceholder diff content.');
  writeFileSync(join(packDir, 'validation', 'validate_report.md'), '# Validation Report\n\nPlaceholder validation report content.');
  writeFileSync(join(packDir, 'evidence', 'INDEX.md'), '# Evidence Index\n\n- [PROJ-123](https://example.com/browse/PROJ-123) - Evidence: [link](https://example.com/evidence/123)\n- [PROJ-456](https://example.com/browse/PROJ-456) - Evidence: [link](https://example.com/evidence/456)');

  // Generate MANIFEST.json
  const manifest = {};
  const allFiles = getAllFiles(packDir);

  for (const file of allFiles) {
    const content = readFileSync(file);
    const hash = createHash('sha256').update(content).digest('hex');
    const relativePath = file.substring(packDir.length + 1).replace(/\\/g, '/');
    manifest[relativePath] = hash;
  }

  const manifestPath = join(packDir, 'MANIFEST.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  const manifestContent = readFileSync(manifestPath);
  const manifestHash = createHash('sha256').update(manifestContent).digest('hex');
  manifest['MANIFEST.json'] = manifestHash;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));


  // Zip the directory
  try {
    const zip = new AdmZip();
    zip.addLocalFolder(packDir);
    const outDir = dirname(out);
    if (outDir && !existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    zip.writeZip(out);
    console.log(`Successfully created zip file: ${out}`);
  } catch (error) {
    console.error(`Failed to create zip file: ${error.message}`);
    process.exit(1);
  } finally {
    // Clean up staging directory
    rmSync(stagingDir, { recursive: true, force: true });
  }
}

main();
