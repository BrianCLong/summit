import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Command } from 'commander';
import { compileModelCardFromFile } from './compiler.js';
import { canonicalize } from './canonical.js';
import { ModelCardValidationError } from './errors.js';
import { createEnforcementHooks } from './hooks.js';
import { verifySignature } from './signer.js';
import { writeGalleryDataset } from './gallery.js';
import { CompiledModelCard } from './types.js';
import { parse } from 'yaml';
import { validateModelCard } from './validator.js';

export function buildCli(): Command {
  const program = new Command();

  program.name('mcc').description('Model Card Compiler (MCC)').version('0.1.0');

  program
    .command('validate')
    .description('Validate a YAML model card without writing output.')
    .argument('<modelCard>', 'Path to the YAML model card')
    .action((modelCardPath: string) => {
      try {
        const raw = readFileSync(modelCardPath, 'utf8');
        const parsed = parse(raw);
        validateModelCard(parsed);
        console.log('Model card is valid.');
      } catch (error) {
        if (error instanceof ModelCardValidationError) {
          console.error('Model card validation failed:');
          error.issues.forEach((issue) => console.error(` - ${issue}`));
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  program
    .command('compile')
    .description('Compile and sign a YAML model card, emitting JSON output.')
    .argument('<modelCard>', 'Path to the YAML model card')
    .option('-o, --output <path>', 'Where to write the signed JSON card')
    .requiredOption('--private-key <path>', 'Path to an Ed25519 private key in PEM format')
    .option('--public-key <path>', 'Optional path to the public key (otherwise derived from the private key)')
    .action((modelCardPath: string, options: { output?: string; privateKey: string; publicKey?: string }) => {
      try {
        const result = compileModelCardFromFile(modelCardPath, options.output, {
          privateKeyPath: resolve(options.privateKey),
          publicKeyPath: options.publicKey ? resolve(options.publicKey) : undefined,
        });
        console.log(`Model card compiled for ${result.card.metadata.modelId}#${result.card.metadata.version}.`);
        if (options.output) {
          console.log(`Signed card written to ${resolve(options.output)}.`);
        }
      } catch (error) {
        if (error instanceof ModelCardValidationError) {
          console.error('Model card validation failed:');
          error.issues.forEach((issue) => console.error(` - ${issue}`));
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });

  program
    .command('verify')
    .description('Verify the signature embedded in a compiled model card JSON file.')
    .argument('<compiledCard>', 'Path to the compiled model card JSON file')
    .action((compiledCardPath: string) => {
      const card = JSON.parse(readFileSync(compiledCardPath, 'utf8')) as CompiledModelCard;
      const canonical = canonicalize({
        metadata: card.metadata,
        description: card.description,
        metrics: card.metrics,
        intendedUse: card.intendedUse,
        dataLineage: card.dataLineage,
        risk: card.risk,
        enforcement: card.enforcement,
      });
      const isValid = verifySignature(canonical, card.signature);
      if (!isValid) {
        console.error('Signature verification failed.');
        process.exitCode = 1;
        return;
      }
      console.log('Signature verification succeeded.');
    });

  program
    .command('hooks')
    .description('Generate TypeScript enforcement hooks for a compiled model card.')
    .argument('<compiledCard>', 'Path to the compiled model card JSON file')
    .option('-o, --output <path>', 'Path to write a TypeScript module (defaults to stdout)')
    .action((compiledCardPath: string, options: { output?: string }) => {
      const card = JSON.parse(readFileSync(compiledCardPath, 'utf8')) as CompiledModelCard;
      const hooks = createEnforcementHooks(card);
      const moduleBody = `import card from './${compiledCardPath}';\n\nexport function denyIfOutOfScope(purpose: string) {\n  const hooks = (${createEnforcementHooks.toString()})(card);\n  hooks.denyIfOutOfScope({ purpose });\n}\n`;
      if (options.output) {
        writeFileSync(resolve(options.output), moduleBody, 'utf8');
        console.log(`Hook module written to ${resolve(options.output)}.`);
      } else {
        console.log(moduleBody);
      }
    });

  program
    .command('gallery')
    .description('Build a JSON dataset for the static gallery UI from compiled cards.')
    .argument('<output>', 'Path to write the gallery dataset (JSON)')
    .argument('<compiledCards...>', 'Compiled model card JSON files to include in the gallery')
    .action((output: string, compiledCards: string[]) => {
      const cards = compiledCards.map((cardPath) =>
        JSON.parse(readFileSync(cardPath, 'utf8')) as CompiledModelCard
      );
      writeGalleryDataset(resolve(output), cards);
      console.log(`Gallery dataset written to ${resolve(output)} with ${cards.length} card(s).`);
    });

  return program;
}

export function runCli(argv = process.argv) {
  const cli = buildCli();
  cli.parse(argv);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCli();
}
