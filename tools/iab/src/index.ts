#!/usr/bin/env node
import path from 'path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { createBundle, verifyBundle } from './bundle.js';

interface BundleArgs {
  incident: string;
  output?: string;
  privateKey: string;
}

interface VerifyArgs {
  bundle: string;
  publicKey: string;
}

yargs(hideBin(process.argv))
  .command(
    'bundle',
    'Create a signed incident bundle',
    (command) =>
      command
        .option('incident', {
          type: 'string',
          demandOption: true,
          describe: 'Path to incident configuration (JSON or YAML)'
        })
        .option('output', {
          type: 'string',
          describe: 'Output tarball path',
          default: 'incident-bundle.tgz'
        })
        .option('private-key', {
          type: 'string',
          demandOption: true,
          describe: 'PEM-encoded RSA private key for signing'
        }),
    async (argv) => {
      const args = argv as unknown as BundleArgs;
      const outputPath = path.resolve(args.output ?? 'incident-bundle.tgz');
      const bundlePath = await createBundle({
        incidentPath: args.incident,
        outputPath,
        privateKeyPath: args.privateKey
      });
      console.log(`Bundle created at ${bundlePath}`);
    }
  )
  .command(
    'verify',
    'Verify a bundle signature',
    (command) =>
      command
        .option('bundle', {
          type: 'string',
          demandOption: true,
          describe: 'Path to the bundle tarball'
        })
        .option('public-key', {
          type: 'string',
          demandOption: true,
          describe: 'PEM-encoded RSA public key for verification'
        }),
    async (argv) => {
      const args = argv as unknown as VerifyArgs;
      const manifest = await verifyBundle(args.bundle, args.publicKey);
      console.log('Signature verified successfully. Incident summary:');
      console.log(`  - Incident: ${manifest.incident.id}`);
      console.log(`  - Severity: ${manifest.incident.severity}`);
      console.log(`  - Artifacts: ${manifest.artifacts.length}`);
    }
  )
  .demandCommand()
  .strict()
  .help()
  .parse();
