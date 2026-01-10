import fs from 'node:fs';
import path from 'node:path';
import { getChangedFiles } from './lib/prompt-registry';
import { loadFlakeRegistry, getFlakeById } from './lib/flake-registry';

const SUPPRESSION_PATTERN = /(eslint-disable|eslint-disable-next-line|eslint-disable-line|biome-ignore|tslint:disable)/;
const FLAKE_ID_PATTERN = /flake-id:\s*([a-z0-9-]+)/i;
const CODE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);

function listFilesToScan(): string[] {
  const changedFiles = getChangedFiles();
  return changedFiles.filter((file) => CODE_EXTENSIONS.has(path.extname(file)));
}

function main(): void {
  const registry = loadFlakeRegistry();
  const errors: string[] = [];
  const files = listFilesToScan();

  files.forEach((file) => {
    if (!fs.existsSync(file)) {
      return;
    }
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      if (!SUPPRESSION_PATTERN.test(line)) {
        return;
      }
      const flakeMatch = line.match(FLAKE_ID_PATTERN);
      if (!flakeMatch) {
        errors.push(`${file}:${index + 1} lint suppression missing flake-id.`);
        return;
      }
      const flakeId = flakeMatch[1];
      const entry = getFlakeById(registry, flakeId);
      if (!entry) {
        errors.push(`${file}:${index + 1} flake-id ${flakeId} not found in registry.`);
        return;
      }
      if (entry.scope !== 'lint-rule') {
        errors.push(`${file}:${index + 1} flake-id ${flakeId} must use scope lint-rule.`);
      }
    });
  });

  if (errors.length > 0) {
    const message = errors.map((err) => `- ${err}`).join('\n');
    throw new Error(`Lint suppression validation failed:\n${message}`);
  }

  // eslint-disable-next-line no-console
  console.log('Lint suppression validation passed.');
}

main();
