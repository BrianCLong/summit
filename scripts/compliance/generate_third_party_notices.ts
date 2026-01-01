import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const ROOT_DIR = process.cwd();
const OUTPUT_FILE = path.join(ROOT_DIR, 'THIRD_PARTY_NOTICES.md');

function findPackageJsons() {
  return globSync('**/package.json', { ignore: '**/node_modules/**' });
}

function findRequirementsTxts() {
  return globSync('**/requirements.txt', { ignore: '**/node_modules/**' });
}

function generateNotices() {
  const notices = [];
  notices.push('# Third-Party Notices');
  notices.push('');
  notices.push('This document lists the third-party software components used in this project.');
  notices.push('This list is generated automatically based on static analysis of dependency definition files.');
  notices.push('');

  // JavaScript/TypeScript Dependencies
  notices.push('## JavaScript / TypeScript Dependencies (npm/pnpm)');
  notices.push('');
  notices.push('| Package | Version | Source | License |');
  notices.push('| :--- | :--- | :--- | :--- |');

  const packageJsons = findPackageJsons();
  const jsDeps = new Map();

  for (const pkgJsonPath of packageJsons) {
    try {
      const content = fs.readFileSync(path.join(ROOT_DIR, pkgJsonPath), 'utf8');
      const pkg = JSON.parse(content);
      if (pkg.dependencies) {
        for (const [name, version] of Object.entries(pkg.dependencies)) {
            const key = `${name}@${version}`;
            if (!jsDeps.has(key)) {
                jsDeps.set(key, { name, version, source: pkgJsonPath });
            }
        }
      }
    } catch (e) {
      console.warn(`Failed to parse ${pkgJsonPath}: ${e.message}`);
    }
  }

  const sortedJsDeps = Array.from(jsDeps.values()).sort((a, b) => a.name.localeCompare(b.name));
  for (const dep of sortedJsDeps) {
      notices.push(`| ${dep.name} | ${dep.version} | ${dep.source} | (Check Package) |`);
  }

  if (sortedJsDeps.length === 0) {
      notices.push('No dependencies found via package.json scanning.');
  }

  notices.push('');

  // Python Dependencies
  notices.push('## Python Dependencies (pip)');
  notices.push('');
  notices.push('| Package | Requirement | Source | License |');
  notices.push('| :--- | :--- | :--- | :--- |');

  const reqTxts = findRequirementsTxts();
  const pyDeps = new Map();

  for (const reqPath of reqTxts) {
      try {
          const content = fs.readFileSync(path.join(ROOT_DIR, reqPath), 'utf8');
          const lines = content.split('\n');
          for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed && !trimmed.startsWith('#')) {
                  // Simple splitting to get package name roughly
                  const parts = trimmed.split(/[=<>~]/);
                  const name = parts[0].trim();
                  if (name) {
                      const key = `${name}-${trimmed}`; // Unique by line
                      if (!pyDeps.has(key)) {
                          pyDeps.set(key, { name, req: trimmed, source: reqPath });
                      }
                  }
              }
          }
      } catch (e) {
          console.warn(`Failed to read ${reqPath}: ${e.message}`);
      }
  }

  const sortedPyDeps = Array.from(pyDeps.values()).sort((a, b) => a.name.localeCompare(b.name));
  for (const dep of sortedPyDeps) {
      notices.push(`| ${dep.name} | ${dep.req} | ${dep.source} | (Check Package) |`);
  }

    if (sortedPyDeps.length === 0) {
      notices.push('No dependencies found via requirements.txt scanning.');
  }

  fs.writeFileSync(OUTPUT_FILE, notices.join('\n'));
  console.log(`Generated ${OUTPUT_FILE}`);
}

generateNotices();
