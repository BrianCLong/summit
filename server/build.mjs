import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const esbuildPath = path.resolve('../node_modules/esbuild/bin/esbuild');

console.log('Building server...');

try {
  // Bundle all dependencies to ensure isolated execution and bypass EPERM in node_modules
  const command = [
    esbuildPath,
    'src/index.ts',
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--target=node20',
    '--sourcemap',
    '--outfile=dist-new/index.js',
    // We only externalize known binary modules or modules that MUST be external
    '--external:canvas',
    '--external:sharp',
    '--external:ffmpeg-static',
    '--external:ffprobe-static',
    '--external:better-sqlite3',
    '--external:sqlite3',
    '--external:pg-native',
  ].join(' ');

  console.log('Running esbuild bundling...');
  execSync(command, { stdio: 'inherit' });
  console.log('Build completed successfully: dist-new/index.js');
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

