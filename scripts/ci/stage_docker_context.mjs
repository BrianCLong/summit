import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const OUT_DIR = path.join(ROOT_DIR, '.out/docker-context');

console.log(`Staging Docker context to ${OUT_DIR}...`);

// Ensure clean output directory
if (fs.existsSync(OUT_DIR)) {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const filesToCopy = [
  'package.json',
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'turbo.json',
  '.pnpmfile.cjs',
  '.npmrc',
  'tsconfig.json',
  'Dockerfile'
];

let totalBytes = 0;
const includedFiles = [];

// Helper to copy file
function copyFile(src, dest) {
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    const stats = fs.statSync(src);
    totalBytes += stats.size;
    includedFiles.push(path.relative(ROOT_DIR, src));
  }
}

// Copy root files
filesToCopy.forEach(file => {
  copyFile(path.join(ROOT_DIR, file), path.join(OUT_DIR, file));
});

// Helper to copy directory with filtering
function copyDir(src, dest, exclusions = []) {
  if (!fs.existsSync(src)) return;

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    const relativePath = path.relative(ROOT_DIR, srcPath);

    // Global exclusions
    if (entry.name === 'node_modules' ||
        entry.name === '.git' ||
        entry.name === '.DS_Store' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === 'coverage' ||
        entry.name === '.turbo' ||
        entry.name === 'test-results' ||
        entry.name === 'playwright-report' ||
        entry.name === 'docs' ||
        entry.name === '__tests__' ||
        entry.name === 'tests' ||
        entry.name === 'e2e' ||
        entry.name.endsWith('.log')) {
      continue;
    }

    // Specific exclusions
    if (exclusions.some(ex => relativePath.includes(ex))) {
        continue;
    }

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, exclusions);
    } else {
      copyFile(srcPath, destPath);
    }
  }
}

// Copy packages
console.log('Copying packages...');
copyDir(path.join(ROOT_DIR, 'packages'), path.join(OUT_DIR, 'packages'));

// Copy server
console.log('Copying server...');
copyDir(path.join(ROOT_DIR, 'server'), path.join(OUT_DIR, 'server'));

// Generate Manifest
const manifest = {
  timestamp: new Date().toISOString(),
  totalBytes,
  fileCount: includedFiles.length,
  includedFiles: includedFiles.slice(0, 50), // Truncate for brevity in log, but useful for debug
  note: "Truncated file list"
};

fs.writeFileSync(path.join(OUT_DIR, 'MANIFEST.json'), JSON.stringify(manifest, null, 2));

console.log(`Context staged. Size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);
console.log(`Manifest written to ${path.join(OUT_DIR, 'MANIFEST.json')}`);
