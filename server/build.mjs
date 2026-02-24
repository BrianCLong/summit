import * as esbuild from 'esbuild';
import { glob } from 'glob';
import path from 'path';

// Find all TypeScript files in src
const entryPoints = await glob('src/**/*.ts', {
  ignore: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
});

await esbuild.build({
  entryPoints,
  outdir: 'dist',
  bundle: false,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  sourcemap: true,
  outExtension: { '.js': '.js' },
});

console.log('Build completed successfully');
