import { Command } from 'commander';
import { verifyRun, generateEvidenceArtifacts } from './verify.js';
import { readFileSync } from 'fs';

const program = new Command();

program
  .name('summit-verify')
  .description('Summit Verification CLI');

program
  .command('verify')
  .requiredOption('--run-id <id>', 'Canonical Run ID')
  .requiredOption('--image <ref>', 'OCI image reference')
  .option('--event <path>', 'Path to OpenLineage event JSON')
  .option('--output-dir <path>', 'Evidence output directory', './evidence')
  .option('--key <path>', 'Path to cosign public key')
  .option('--cert-identity <identity>', 'Expected certificate identity')
  .option('--cert-oidc-issuer <issuer>', 'Expected certificate OIDC issuer')
  .action(async (options) => {
    let openlineageEvent;
    if (options.event) {
      openlineageEvent = JSON.parse(readFileSync(options.event, 'utf-8'));
    }

    const result = await verifyRun({
      runId: options.runId,
      imageRef: options.image,
      openlineageEvent,
      cosignOptions: {
        key: options.key,
        certificateIdentity: options.certIdentity,
        certificateOidcIssuer: options.certOidcIssuer,
      },
    });

    console.log(`Verification status: ${result.status}`);
    result.checks.forEach((check) => {
      console.log(` - ${check.name}: ${check.status}${check.message ? ` (${check.message})` : ''}`);
    });

    generateEvidenceArtifacts(result, options.outputDir);
    console.log(`Evidence artifacts generated in ${options.outputDir}`);

    if (result.status !== 'PASS') {
      process.exit(1);
    }
  });

program.parse();
