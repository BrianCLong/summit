import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DENIED_TERM = 'ingress-nginx';
const IGNORE_PATTERNS = [
  'node_modules',
  'scripts/ci',
  '.git',
  'package-lock.json',
  'pnpm-lock.yaml'
];

function getFiles() {
  try {
    const output = execSync('find . -type f -not -path "*/.git/*" -not -path "*/node_modules/*"', { encoding: 'utf-8' });
    return output.split('\n').filter(Boolean).map(f => f.replace(/^\.\//, ''));
  } catch (e) {
    console.error('Error finding files:', e);
    return [];
  }
}

async function scan() {
  const files = getFiles();
  let failed = false;

  for (const file of files) {
    if (IGNORE_PATTERNS.some(p => file.includes(p))) continue;
    if (file.endsWith('.md')) continue; // Ignore markdown files

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        // Ignore empty lines
        if (!trimmed) return;
        // Ignore comments
        if (trimmed.startsWith('#') || trimmed.startsWith('//') || trimmed.startsWith('*')) return;
        // Ignore explicit migration/replacement notes that might be embedded in strings
        if (trimmed.includes('Replaces:')) return;

        if (line.includes(DENIED_TERM)) {
          console.error(`${file}:${index + 1}: ${line.trim()}`);
          failed = true;
        }
      });
    } catch (err) {
      // Ignore read errors (e.g. symlinks/binary)
    }
  }

  if (failed) {
    console.error('Denied ingress-nginx references detected (comments ignored).');
    process.exit(1);
  } else {
    console.log('No denied ingress-nginx references found.');
  }
}

scan();
