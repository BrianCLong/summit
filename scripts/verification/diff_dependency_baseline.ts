import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

interface SpdxPackage {
  name: string;
  versionInfo: string;
}

interface SpdxDocument {
  packages: SpdxPackage[];
}

interface DiffReport {
  added: SpdxPackage[];
  removed: SpdxPackage[];
  changed: {
    name: string;
    oldVersion: string;
    newVersion: string;
  }[];
  stats: {
    totalAdded: number;
    totalRemoved: number;
    totalChanged: number;
  };
}

const BASELINE_PATH = path.join(rootDir, 'dist/evidence/deps/baseline.json');
const CURRENT_PATH = path.join(rootDir, 'dist/evidence/sbom/sbom.normalized.json');
const DIFF_JSON_PATH = path.join(rootDir, 'dist/evidence/deps/deps-diff.json');
const DIFF_MD_PATH = path.join(rootDir, 'dist/evidence/deps/deps-diff.md');

function loadJson<T>(p: string): T | null {
  if (fs.existsSync(p)) {
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
  return null;
}

function main() {
  console.log('Generating Dependency Diff...');

  const current = loadJson<SpdxDocument>(CURRENT_PATH);
  if (!current) {
    console.error(`Error: Current SBOM not found at ${CURRENT_PATH}`);
    process.exit(1);
  }

  const baseline = loadJson<SpdxDocument>(BASELINE_PATH);

  if (!baseline) {
    console.warn('No baseline found. Treating all dependencies as ADDED.');
  }

  const basePkgs = new Map<string, string>(); // name -> version
  if (baseline) {
    baseline.packages.forEach(p => basePkgs.set(p.name, p.versionInfo));
  }

  const currPkgs = new Map<string, string>();
  current.packages.forEach(p => currPkgs.set(p.name, p.versionInfo));

  const diff: DiffReport = {
    added: [],
    removed: [],
    changed: [],
    stats: { totalAdded: 0, totalRemoved: 0, totalChanged: 0 }
  };

  // Detect Added and Changed
  for (const [name, version] of currPkgs) {
    if (!basePkgs.has(name)) {
      diff.added.push({ name, versionInfo: version });
    } else {
      const oldVer = basePkgs.get(name)!;
      if (oldVer !== version) {
        diff.changed.push({ name, oldVersion: oldVer, newVersion: version });
      }
    }
  }

  // Detect Removed
  for (const [name, version] of basePkgs) {
    if (!currPkgs.has(name)) {
      diff.removed.push({ name, versionInfo: version });
    }
  }

  diff.stats.totalAdded = diff.added.length;
  diff.stats.totalRemoved = diff.removed.length;
  diff.stats.totalChanged = diff.changed.length;

  // Write JSON Diff
  const depsDir = path.dirname(DIFF_JSON_PATH);
  if (!fs.existsSync(depsDir)) {
    fs.mkdirSync(depsDir, { recursive: true });
  }
  fs.writeFileSync(DIFF_JSON_PATH, JSON.stringify(diff, null, 2));
  console.log(`Diff JSON written to ${DIFF_JSON_PATH}`);

  // Write Markdown Diff
  let md = `# Dependency Diff Report\n\n`;
  md += `**Date:** ${new Date().toISOString()}\n`;
  md += `**Summary:** +${diff.stats.totalAdded} / -${diff.stats.totalRemoved} / ~${diff.stats.totalChanged}\n\n`;

  if (diff.added.length > 0) {
    md += `## Added Packages (${diff.added.length})\n| Package | Version |\n|---|---|\n`;
    diff.added.forEach(p => md += `| ${p.name} | ${p.versionInfo} |\n`);
    md += `\n`;
  }

  if (diff.changed.length > 0) {
    md += `## Changed Packages (${diff.changed.length})\n| Package | Old | New |\n|---|---|---|\n`;
    diff.changed.forEach(p => md += `| ${p.name} | ${p.oldVersion} | ${p.newVersion} |\n`);
    md += `\n`;
  }

  if (diff.removed.length > 0) {
    md += `## Removed Packages (${diff.removed.length})\n| Package | Version |\n|---|---|\n`;
    diff.removed.forEach(p => md += `| ${p.name} | ${p.versionInfo} |\n`);
    md += `\n`;
  }

  if (diff.stats.totalAdded === 0 && diff.stats.totalChanged === 0 && diff.stats.totalRemoved === 0) {
    md += `*No dependency changes detected against baseline.*\n`;
  }

  fs.writeFileSync(DIFF_MD_PATH, md);
  console.log(`Diff Markdown written to ${DIFF_MD_PATH}`);
}

main();
