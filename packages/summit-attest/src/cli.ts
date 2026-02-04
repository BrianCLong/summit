import { Command } from 'commander';
import { createManifest, saveManifest } from './manifest.js';
import { createSlsaPredicate } from './slsa.js';
import { attestArtifact } from './cosign.js';
import { readFileSync, writeFileSync } from 'fs';

const program = new Command();

program
  .name('summit-attest')
  .description('Summit Attestation CLI');

program
  .command('manifest')
  .requiredOption('--tenant <tenant>', 'Tenant ID')
  .requiredOption('--namespace <namespace>', 'Namespace')
  .requiredOption('--job <job>', 'Job name')
  .option('--run-id <id>', 'Existing Run ID')
  .option('--output <path>', 'Output path', 'run-manifest.json')
  .action((options) => {
    const manifest = createManifest(options);
    saveManifest(manifest, options.output);
    console.log(`Manifest saved to ${options.output}`);
  });

program
  .command('slsa')
  .requiredOption('--manifest <path>', 'Path to run-manifest.json')
  .requiredOption('--build-type <uri>', 'SLSA buildType URI')
  .option('--output <path>', 'Output path', 'slsa-predicate.json')
  .action((options) => {
    const manifest = JSON.parse(readFileSync(options.manifest, 'utf-8'));
    const predicate = createSlsaPredicate(manifest, options.buildType);
    writeFileSync(options.output, JSON.stringify(predicate, null, 2) + '\n');
    console.log(`SLSA predicate saved to ${options.output}`);
  });

program
  .command('attest')
  .requiredOption('--image <ref>', 'OCI image reference')
  .requiredOption('--predicate <path>', 'Path to predicate file')
  .requiredOption('--type <type>', 'Predicate type URI')
  .option('--key <path>', 'Path to cosign private key')
  .option('--keyless', 'Use keyless signing', false)
  .action((options) => {
    attestArtifact({
      imageRef: options.image,
      predicatePath: options.predicate,
      predicateType: options.type,
      options: {
        key: options.key,
        allowKeyless: options.keyless,
      },
    });
  });

program.parse();
