#!/usr/bin/env node
import { Command, Option } from 'commander';
import { promises as fs } from 'fs';
import {
  createDerivativeStamp,
  parseToolChainOption,
  stampAsset,
  verifyProvenance,
} from '../node/index';
import {
  DerivativeStampOptions,
  StampAssetOptions,
  ToolChainEntry,
  VerifyProvenanceOptions,
} from '../types';

const program = new Command();
program.name('cpb').description('C2PA provenance bridge toolkit');

function collectToolChain(values: string[]): ToolChainEntry[] {
  return values.map((value) => parseToolChainOption(value));
}

program
  .command('stamp')
  .description('Stamp an asset with provenance metadata')
  .argument('<asset>', 'Path to the asset file to stamp')
  .requiredOption('--dataset <id>', 'Dataset lineage identifier')
  .requiredOption('--policy <hash>', 'Policy hash associated with the claim')
  .requiredOption('--signer <id>', 'Signer identifier')
  .requiredOption('--private-key <path>', 'Path to the PEM encoded private key')
  .requiredOption('--public-key <path>', 'Path to the PEM encoded public key')
  .addOption(new Option('--algorithm <algo>', 'Signature algorithm').default('rsa-sha256'))
  .option('--tool <spec...>', 'Tool chain entry in name@version|key=value format')
  .option('--note <text>', 'Optional notes to embed in the claim')
  .option('--mime <type>', 'Override asset MIME type')
  .option('--output <path>', 'Output path for manifest (defaults to <asset>.cpb.json)')
  .action(async (asset: string, options) => {
    try {
      const toolChain = options.tool ? collectToolChain(options.tool) : [];
      const privateKey = await fs.readFile(options.privateKey, 'utf8');
      const publicKey = await fs.readFile(options.publicKey, 'utf8');
      const stampOptions: StampAssetOptions = {
        assetPath: asset,
        outputPath: options.output,
        metadata: {
          toolChain,
          datasetLineageId: options.dataset,
          policyHash: options.policy,
          notes: options.note,
        },
        signer: {
          id: options.signer,
          algorithm: options.algorithm,
          privateKey,
          publicKey,
          mimeType: options.mime,
        },
      };
      const { manifestPath } = await stampAsset(stampOptions);
      console.log(`Manifest written to ${manifestPath}`);
    } catch (error) {
      console.error((error as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('derive')
  .description('Create a derivative manifest that preserves chain of custody')
  .argument('<asset>', 'Path to the derivative asset file')
  .requiredOption('--parent <manifest>', 'Path to the parent manifest JSON file')
  .requiredOption('--signer <id>', 'Signer identifier for the derivative claim')
  .requiredOption('--private-key <path>', 'Path to the PEM encoded private key for the derivative signer')
  .requiredOption('--public-key <path>', 'Path to the PEM encoded public key for the derivative signer')
  .requiredOption('--parent-public-key <path>', 'Public key for verifying the parent manifest')
  .option('--parent-asset <path>', 'Optional path to the original parent asset for hash verification')
  .addOption(new Option('--algorithm <algo>', 'Signature algorithm').default('rsa-sha256'))
  .option('--tool <spec...>', 'Additional tool chain entries for the derivative work')
  .option('--dataset <id>', 'Override dataset lineage identifier')
  .option('--policy <hash>', 'Override policy hash')
  .option('--note <text>', 'Override notes')
  .option('--redaction <text...>', 'Redaction description to include in the derivative claim')
  .option('--output <path>', 'Output path for manifest (defaults to <asset>.cpb.json)')
  .action(async (asset: string, options) => {
    try {
      const toolChain = options.tool ? collectToolChain(options.tool) : undefined;
      const privateKey = await fs.readFile(options.privateKey, 'utf8');
      const publicKey = await fs.readFile(options.publicKey, 'utf8');
      const parentPublicKey = await fs.readFile(options.parentPublicKey, 'utf8');
      const derivativeOptions: DerivativeStampOptions = {
        assetPath: asset,
        outputPath: options.output,
        parentManifestPath: options.parent,
        parentPublicKey,
        parentAssetPath: options.parentAsset,
        metadata: {
          toolChain: toolChain ?? [],
          datasetLineageId: options.dataset,
          policyHash: options.policy,
          notes: options.note,
        },
        redactions: options.redaction,
        signer: {
          id: options.signer,
          algorithm: options.algorithm,
          privateKey,
          publicKey,
        },
      };
      const { manifestPath } = await createDerivativeStamp(derivativeOptions);
      console.log(`Derivative manifest written to ${manifestPath}`);
    } catch (error) {
      console.error((error as Error).message);
      process.exitCode = 1;
    }
  });

program
  .command('verify')
  .description('Verify a provenance manifest against an asset')
  .requiredOption('--manifest <path>', 'Manifest file to verify')
  .requiredOption('--asset <path>', 'Asset file to verify against the manifest')
  .requiredOption('--public-key <path>', 'Trusted public key for signature validation')
  .option('--parent-manifest <path>', 'Path to the parent manifest when verifying derivatives')
  .option('--parent-public-key <path>', 'Trusted public key for the parent manifest')
  .option('--parent-asset <path>', 'Parent asset path when verifying derivatives')
  .option('--json', 'Emit verification result as JSON')
  .action(async (options) => {
    try {
      const publicKey = await fs.readFile(options.publicKey, 'utf8');
      const verifyOptions: VerifyProvenanceOptions = {
        manifestPath: options.manifest,
        publicKey,
        assetPath: options.asset,
        parentManifestPath: options.parentManifest,
        parentPublicKey: options.parentPublicKey
          ? await fs.readFile(options.parentPublicKey, 'utf8')
          : undefined,
        parentAssetPath: options.parentAsset,
      };
      const result = await verifyProvenance(verifyOptions);
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`Signature: ${result.validSignature ? 'valid' : 'INVALID'}`);
        console.log(`Asset Hash: ${result.validAssetHash ? 'valid' : 'INVALID'}`);
        if (result.issues.length > 0) {
          console.log('Issues:');
          for (const issue of result.issues) {
            console.log(`- [${issue.level}] ${issue.message}`);
          }
        } else {
          console.log('No issues detected.');
        }
        console.log(`Manifest Hash: ${result.manifestHash}`);
        console.log(`Claim Hash: ${result.claimHash}`);
        if (result.parent) {
          console.log('Parent verification succeeded.');
        }
      }
      if (!result.validSignature || !result.validAssetHash || result.issues.some((i) => i.level === 'error')) {
        process.exitCode = 2;
      }
    } catch (error) {
      console.error((error as Error).message);
      process.exitCode = 1;
    }
  });

program.parseAsync(process.argv);
