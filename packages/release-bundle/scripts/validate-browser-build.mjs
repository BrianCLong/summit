import { build } from 'esbuild';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function validate() {
  const entryPoint = path.resolve(__dirname, '../src/core.ts');

  console.log(`Bundling ${entryPoint} for browser...`);

  try {
    const result = await build({
      entryPoints: [entryPoint],
      bundle: true,
      platform: 'browser',
      write: false, // Don't write to disk
      format: 'esm',
    });

    const output = result.outputFiles[0].text;

    // Check for Node.js built-ins
    const forbidden = ['"fs"', "'fs'", '"path"', "'path'", 'require("fs")', "require('fs')"];
    const found = forbidden.filter(f => output.includes(f));

    if (found.length > 0) {
      console.error('❌ Browser bundle contains Node.js imports:', found);
      process.exit(1);
    }

    console.log('✅ Browser bundle is clean of Node.js imports.');

    // Also check that it exports what we expect
    if (!output.includes('parseManifest')) {
         console.error('❌ Browser bundle missing parseManifest export');
         process.exit(1);
    }

  } catch (e) {
    console.error('❌ Build failed:', e);
    process.exit(1);
  }
}

validate();
