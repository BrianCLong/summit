import fs from 'fs';
import { execSync } from 'child_process';

const outDir = './dist';

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

console.log('Starting build...');

try {
  execSync('tsc -p tsconfig.json', { stdio: 'inherit' });
  console.log('Build completed successfully.');
} catch (error) {
  console.error('Build failed.');
  process.exit(1);
}
