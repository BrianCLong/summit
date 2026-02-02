import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Recursively find all TypeScript files in a directory
 */
function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, fileList);
    } else {
      if (
        name.endsWith('.ts') &&
        !name.endsWith('.test.ts') &&
        !name.endsWith('.spec.ts') &&
        !name.includes('__tests__')
      ) {
        fileList.push(name);
      }
    }
  }
  return fileList;
}

const esbuildPath = path.resolve('../node_modules/esbuild/node_modules/.bin/esbuild');

console.log('Building server...');

try {
  // Use CLI because node_modules is corrupted
  const command = [
    esbuildPath,
    'src/index.ts',
    '--bundle',
    '--platform=node',
    '--format=esm',
    '--target=node20',
    '--sourcemap',
    '--outfile=dist/index.js',
    '--packages=external',
    '--external:@intelgraph/*',
    '--external:./node_modules/*',
    '--external:../node_modules/*',
  ].join(' ');

  console.log('Running esbuild...');
  execSync(command, { stdio: 'inherit' });
  console.log('Build completed successfully');
} catch (error) {
  console.error('Build failed');
  process.exit(1);
}

