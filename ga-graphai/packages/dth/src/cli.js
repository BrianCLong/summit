#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { Command } from 'commander';
import { createRequire } from 'module';
import { buildReceipt } from './receipt.js';
import { diffReceipts, formatReceiptDiff } from './diff.js';
import { loadManifest } from './manifest.js';
import { computePipelineIdentity } from './hash.js';

const require = createRequire(import.meta.url);
const { version } = require('../package.json');

function writeFileIfPath(targetPath, content) {
  if (!targetPath) {
    return;
  }
  const resolved = path.resolve(targetPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, content);
}

function stringifyJSON(data, pretty) {
  return pretty ? `${JSON.stringify(data, null, 2)}\n` : `${JSON.stringify(data)}\n`;
}

function handleHash(manifestPath, options) {
  try {
    const manifestInfo = loadManifest(manifestPath);
    const identity = computePipelineIdentity(manifestInfo.manifest, {
      algorithm: options.algorithm
    });
    if (options.receipt) {
      const receipt = buildReceipt({
        manifest: manifestInfo.manifest,
        manifestPath: manifestInfo.path,
        manifestFormat: manifestInfo.format,
        manifestRawHash: manifestInfo.rawHash,
        normalized: identity.normalized,
        componentDigests: identity.componentDigests,
        canonicalManifestHash: identity.canonicalManifestHash,
        pipelineId: identity.id,
        algorithm: identity.algorithm,
        stats: manifestInfo.stats
      });
      writeFileIfPath(options.receipt, stringifyJSON(receipt, options.pretty));
    }
    const output = `${identity.id}\n`;
    if (options.output) {
      writeFileIfPath(options.output, output);
    } else {
      process.stdout.write(output);
    }
  } catch (error) {
    process.stderr.write(`dth hash failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

function handleReceipt(manifestPath, options) {
  try {
    const manifestInfo = loadManifest(manifestPath);
    const identity = computePipelineIdentity(manifestInfo.manifest, {
      algorithm: options.algorithm
    });
    const receipt = buildReceipt({
      manifest: manifestInfo.manifest,
      manifestPath: manifestInfo.path,
      manifestFormat: manifestInfo.format,
      manifestRawHash: manifestInfo.rawHash,
      normalized: identity.normalized,
      componentDigests: identity.componentDigests,
      canonicalManifestHash: identity.canonicalManifestHash,
      pipelineId: identity.id,
      algorithm: identity.algorithm,
      stats: manifestInfo.stats
    });
    const serialized = stringifyJSON(receipt, options.pretty);
    if (options.output) {
      writeFileIfPath(options.output, serialized);
    } else {
      process.stdout.write(serialized);
    }
  } catch (error) {
    process.stderr.write(`dth receipt failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

function readReceipt(receiptPath) {
  const resolved = path.resolve(receiptPath);
  const raw = fs.readFileSync(resolved, 'utf8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Failed to parse receipt at ${resolved}: ${error.message}`);
  }
}

function handleDiff(leftPath, rightPath, options) {
  try {
    const left = readReceipt(leftPath);
    const right = readReceipt(rightPath);
    const diff = diffReceipts(left, right);
    let output;
    if (options.json) {
      output = stringifyJSON(diff, options.pretty);
    } else {
      output = `${formatReceiptDiff(diff)}\n`;
    }
    if (options.output) {
      writeFileIfPath(options.output, output);
    } else {
      process.stdout.write(output);
    }
    if (options.failOnChange && diff.hasDifferences) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write(`dth diff failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}

const program = new Command();
program.name('dth').description('Deterministic Toolchain Hasher').version(version);

program
  .command('hash')
  .argument('<manifest>', 'Path to the manifest file (JSON, YAML, TOML)')
  .description('Compute a deterministic pipeline ID for the given manifest')
  .option('-a, --algorithm <algorithm>', 'Hash algorithm to use', 'sha256')
  .option('-o, --output <file>', 'Write the pipeline ID to a file')
  .option('-r, --receipt <file>', 'Write a pipeline receipt to a file')
  .option('--pretty', 'Pretty-print receipt JSON output', false)
  .action((manifestPath, options) => handleHash(manifestPath, options));

program
  .command('receipt')
  .argument('<manifest>', 'Path to the manifest file (JSON, YAML, TOML)')
  .description('Generate a deterministic receipt for the manifest')
  .option('-a, --algorithm <algorithm>', 'Hash algorithm to use', 'sha256')
  .option('-o, --output <file>', 'Write the receipt to a file')
  .option('--pretty', 'Pretty-print the JSON output', false)
  .action((manifestPath, options) => handleReceipt(manifestPath, options));

program
  .command('diff')
  .argument('<left>', 'Path to the baseline receipt JSON file')
  .argument('<right>', 'Path to the comparison receipt JSON file')
  .description('Explain the differences between two pipeline receipts')
  .option('-o, --output <file>', 'Write the diff report to a file')
  .option('--json', 'Emit the diff as machine-readable JSON', false)
  .option('--pretty', 'Pretty-print JSON output', false)
  .option('--fail-on-change', 'Exit with status code 1 if differences are detected', false)
  .action((left, right, options) => handleDiff(left, right, options));

program.showHelpAfterError();
program.parseAsync(process.argv);
