import * as esbuild from 'esbuild';
import { glob } from 'glob';
import path from 'path';

// Find all TypeScript files in server root AND root packages
const entryPoints = await glob(['**/*.ts', '../packages/**/*.ts'], {
  ignore: ['node_modules/**', 'dist/**', '**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
});

await esbuild.build({
  entryPoints,
  outdir: 'dist',
  outbase: '..',
  bundle: false,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  sourcemap: true,
  outExtension: { '.js': '.js' },
});

console.log('Build completed successfully');
