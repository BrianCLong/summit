#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import fs from 'fs-extra';
import { buildBundle } from '../bundle/builder';
import { verifyBundle } from '../bundle/verifier';
import { BundleManifest } from '../bundle/schemas';

const program = new Command();
program.name('summit-adapter').description('Adapter SDK CLI').version('0.1.0');

program
  .command('init')
  .description('Create a new adapter from the basic template')
  .argument('[name]', 'Adapter name', 'my-adapter')
  .action(async (name) => {
    const templateDir = path.resolve(__dirname, '../templates/basic-webhook');
    const targetDir = path.resolve(process.cwd(), name);
    await fs.copy(templateDir, targetDir, { overwrite: false, errorOnExist: true });
    console.log(`Adapter scaffold created at ${targetDir}`);
  });

program
  .command('package')
  .description('Package an adapter bundle with manifest and signature placeholder')
  .requiredOption('-s, --source <path>', 'Source directory for adapter code')
  .requiredOption('-m, --manifest <path>', 'Path to adapter manifest JSON')
  .requiredOption('-o, --out <path>', 'Output directory for bundle')
  .action(async (opts) => {
    const manifest = await fs.readJson(path.resolve(opts.manifest));
    const manifestWithSignature: BundleManifest = { ...manifest, signature: manifest.signature ?? 'placeholder-signature' };
    const bundlePath = await buildBundle({
      manifest: manifestWithSignature,
      sourceDir: path.resolve(opts.source),
      outputDir: path.resolve(opts.out),
    });
    console.log(`Bundle created at ${bundlePath}`);
  });

program
  .command('verify')
  .description('Verify a packaged adapter bundle (signature + manifest + payload)')
  .requiredOption('-b, --bundle <path>', 'Bundle directory to verify')
  .action(async (opts) => {
    const result = await verifyBundle(path.resolve(opts.bundle));
    if (!result.valid) {
      console.error('Bundle verification failed:\n', result.errors.join('\n'));
      process.exitCode = 1;
    } else {
      console.log('Bundle verification succeeded');
    }
  });

program.parseAsync(process.argv);
