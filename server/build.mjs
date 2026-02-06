import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

const esbuildPath = path.resolve('../node_modules/esbuild/bin/esbuild');

console.log('Building server...');

try {
  // Use direct path to esbuild bin to bypass EPERM on root .bin
  const command = [
    esbuildPath,
    'src/index.ts',
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--target=node20',
    '--sourcemap',
    '--outfile=dist-new/index.js',
    '--packages=external',
    // We bundle @intelgraph/* and @opentelemetry/* to bypass EPERM locks on these dirs
    '--external:canvas',
    '--external:sharp',
    '--external:ffmpeg-static',
    '--external:ffprobe-static',
    '--external:better-sqlite3',
    '--external:sqlite3',
    '--external:pg-native',
    '--external:ioredis',
    '--external:pg',
    '--external:neo4j-driver',
    '--external:express',
    '--external:apollo-server-express',
    '--external:@apollo/server',
  ].join(' ');

  console.log('Running esbuild bundling...');
  execSync(command, { stdio: 'inherit' });
  console.log('Build completed successfully: dist-new/index.js');
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

